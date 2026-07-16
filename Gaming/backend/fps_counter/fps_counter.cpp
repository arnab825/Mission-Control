/**
 * fps_counter.cpp
 *
 * Real-Time Hardware FPS tracking for Aero AI using Event Tracing for Windows (ETW).
 *
 * Intercepts DXGI Present events out-of-process to calculate true game hardware FPS.
 * Completely thread-safe via critical section.
 *
 * Build: compile_fps_counter.bat  (MSVC / cl.exe required)
 */

#define NOMINMAX
#define WIN32_LEAN_AND_MEAN
#include <windows.h>
#include <evntrace.h>
#include <evntcons.h>
#include <algorithm>
#include <cmath>
#include <cstring>
#include <process.h>

#pragma comment(lib, "advapi32.lib")

// ── Constants ──────────────────────────────────────────────────────────────
#define AVG_WINDOW      128    // Rolling window for avg FPS
#define SLOW_WINDOW     1000   // Rolling window for 1% lows
#define WARMUP_FRAMES   10     // Frames before min/max tracking
#define TRACE_SESSION_NAME "AeroAI_DXGI_Trace"

// DXGI Provider GUID {CA11C036-0102-4A2D-A6AD-F03CFED5D3C9}
static const GUID DXGI_PROVIDER_GUID = { 0xCA11C036, 0x0102, 0x4A2D, { 0xA6, 0xAD, 0xF0, 0x3C, 0xFE, 0xD5, 0xD3, 0xC9 } };

// D3D9 Provider GUID {783ACA0A-790E-4D7F-8451-AA850511C6B9}
static const GUID D3D9_PROVIDER_GUID = { 0x783ACA0A, 0x790E, 0x4D7F, { 0x84, 0x51, 0xAA, 0x85, 0x05, 0x11, 0xC6, 0xB9 } };

// DxgKrnl Provider GUID {802ec45a-1e99-4b83-9920-87c98277ba9d}
static const GUID DXGKRNL_PROVIDER_GUID = { 0x802ec45a, 0x1e99, 0x4b83, { 0x99, 0x20, 0x87, 0xc9, 0x82, 0x77, 0xba, 0x9d } };

// ── State ──────────────────────────────────────────────────────────────────
struct FPSCounterState
{
    CRITICAL_SECTION cs;

    double  avg_buf[AVG_WINDOW];
    int     avg_head;
    int     avg_count;

    double  slow_buf[SLOW_WINDOW];
    int     slow_head;
    int     slow_count;

    double  last_time;

    double  session_min;
    double  session_max;
    double  session_min_abs;
    double  session_max_abs;
    int     total_frames;

    double  cached_fps;
    double  cached_1pct_low;
};

static FPSCounterState g_state = {};
static int g_target_pid = 0;
static bool g_initialized = false;

static HANDLE g_trace_thread = NULL;
static TRACEHANDLE g_session_handle = 0;
static TRACEHANDLE g_trace_handle = 0;
static bool g_etw_running = false;

// ── Internal helpers ────────────────────────────────────────────────────────

static void reset_state_locked()
{
    memset(g_state.avg_buf,  0, sizeof(g_state.avg_buf));
    memset(g_state.slow_buf, 0, sizeof(g_state.slow_buf));
    g_state.avg_head       = 0;
    g_state.avg_count      = 0;
    g_state.slow_head      = 0;
    g_state.slow_count     = 0;
    g_state.last_time      = 0.0;
    g_state.session_min    = 0.0;
    g_state.session_max    = 0.0;
    g_state.session_min_abs= 0.0;
    g_state.session_max_abs= 0.0;
    g_state.total_frames   = 0;
    g_state.cached_fps     = 0.0;
    g_state.cached_1pct_low = 0.0;
    g_initialized          = false;
}

static double compute_avg_fps_locked()
{
    int n = g_state.avg_count;
    if (n < 2) return 0.0;

    double sum = 0.0;
    for (int i = 0; i < n; ++i) sum += g_state.avg_buf[i];

    if (sum <= 0.0) return 0.0;
    return static_cast<double>(n) / sum;
}

static double compute_1pct_low_locked()
{
    int n = g_state.slow_count;
    if (n < 10) return 0.0;

    static double scratch[SLOW_WINDOW];
    memcpy(scratch, g_state.slow_buf, sizeof(double) * n);
    std::sort(scratch, scratch + n, [](double a, double b){ return a > b; });

    int count_1pct = std::max(1, static_cast<int>(std::ceil(n * 0.01)));
    double sum = 0.0;
    for (int i = 0; i < count_1pct; ++i) sum += scratch[i];

    double avg_duration = sum / static_cast<double>(count_1pct);
    if (avg_duration <= 0.0) return 0.0;
    return 1.0 / avg_duration;
}

// ── ETW Callbacks ──────────────────────────────────────────────────────────

static void WINAPI EventRecordCallback(PEVENT_RECORD pEventRecord)
{
    // Ensure we only process events for our target game
    if (g_target_pid <= 0 || pEventRecord->EventHeader.ProcessId != static_cast<DWORD>(g_target_pid)) 
        return;

    DWORD eventId = pEventRecord->EventHeader.EventDescriptor.Id;
    bool isPresent = false;

    if (IsEqualGUID(pEventRecord->EventHeader.ProviderId, DXGI_PROVIDER_GUID)) {
        // DXGI Present_Start Event IDs (includes Multiplane Overlay etc.)
        if (eventId == 42 || eventId == 46 || eventId == 73 || eventId == 78) isPresent = true;
    } else if (IsEqualGUID(pEventRecord->EventHeader.ProviderId, D3D9_PROVIDER_GUID)) {
        // D3D9 Present Event ID
        if (eventId == 1) isPresent = true;
    }

    if (isPresent)
    {
        // ETW TimeStamp is in 100-nanosecond intervals (FILETIME)
        double now = static_cast<double>(pEventRecord->EventHeader.TimeStamp.QuadPart) / 10000000.0;

        EnterCriticalSection(&g_state.cs);

        if (!g_initialized || g_state.last_time == 0.0)
        {
            g_state.last_time = now;
            g_initialized = true;
            LeaveCriticalSection(&g_state.cs);
            return;
        }

        double dt = now - g_state.last_time;

        // Ignore bogus intervals (< 0.1ms or > 5s)
        if (dt < 0.0001 || dt > 5.0)
        {
            LeaveCriticalSection(&g_state.cs);
            return;
        }

        g_state.last_time = now;

        g_state.avg_buf[g_state.avg_head] = dt;
        g_state.avg_head = (g_state.avg_head + 1) % AVG_WINDOW;
        if (g_state.avg_count < AVG_WINDOW) ++g_state.avg_count;

        g_state.slow_buf[g_state.slow_head] = dt;
        g_state.slow_head = (g_state.slow_head + 1) % SLOW_WINDOW;
        if (g_state.slow_count < SLOW_WINDOW) ++g_state.slow_count;

        ++g_state.total_frames;

        double fps = compute_avg_fps_locked();
        g_state.cached_fps = fps;
        g_state.cached_1pct_low = compute_1pct_low_locked();

        if (g_state.total_frames > WARMUP_FRAMES && fps > 0.0)
        {
            if (g_state.session_min <= 0.0 || fps < g_state.session_min) g_state.session_min = fps;
            if (fps > g_state.session_max) g_state.session_max = fps;
                
            double cur_fps = 1.0 / dt;
            if (g_state.session_min_abs <= 0.0 || cur_fps < g_state.session_min_abs) g_state.session_min_abs = cur_fps;
            if (cur_fps > g_state.session_max_abs) g_state.session_max_abs = cur_fps;
        }

        LeaveCriticalSection(&g_state.cs);
    }
}

// ── ETW Thread ─────────────────────────────────────────────────────────────

static unsigned __stdcall ETWTraceThread(void*)
{
    ULONG status = ERROR_SUCCESS;

    // Stop any existing trace with the same name
    EVENT_TRACE_PROPERTIES* pProps = (EVENT_TRACE_PROPERTIES*)malloc(sizeof(EVENT_TRACE_PROPERTIES) + sizeof(TRACE_SESSION_NAME));
    if (!pProps) return 1;
    ZeroMemory(pProps, sizeof(EVENT_TRACE_PROPERTIES) + sizeof(TRACE_SESSION_NAME));
    pProps->Wnode.BufferSize = sizeof(EVENT_TRACE_PROPERTIES) + sizeof(TRACE_SESSION_NAME);
    pProps->LoggerNameOffset = sizeof(EVENT_TRACE_PROPERTIES);
    ControlTrace(0, TRACE_SESSION_NAME, pProps, EVENT_TRACE_CONTROL_STOP);

    // Configure new trace session
    ZeroMemory(pProps, sizeof(EVENT_TRACE_PROPERTIES) + sizeof(TRACE_SESSION_NAME));
    pProps->Wnode.BufferSize = sizeof(EVENT_TRACE_PROPERTIES) + sizeof(TRACE_SESSION_NAME);
    pProps->Wnode.Guid = { 0 }; 
    pProps->Wnode.ClientContext = 1; // QPC timer resolution
    pProps->Wnode.Flags = WNODE_FLAG_TRACED_GUID;
    pProps->LogFileMode = EVENT_TRACE_REAL_TIME_MODE;
    pProps->LoggerNameOffset = sizeof(EVENT_TRACE_PROPERTIES);

    status = StartTrace(&g_session_handle, TRACE_SESSION_NAME, pProps);
    if (status != ERROR_SUCCESS) {
        free(pProps);
        g_etw_running = false;
        return 1;
    }

    // Enable Providers
    status = EnableTraceEx2(
        g_session_handle, &DXGI_PROVIDER_GUID, EVENT_CONTROL_CODE_ENABLE_PROVIDER,
        TRACE_LEVEL_INFORMATION, 0, 0, 0, NULL
    );
    status = EnableTraceEx2(
        g_session_handle, &D3D9_PROVIDER_GUID, EVENT_CONTROL_CODE_ENABLE_PROVIDER,
        TRACE_LEVEL_INFORMATION, 0, 0, 0, NULL
    );
    status = EnableTraceEx2(
        g_session_handle, &DXGKRNL_PROVIDER_GUID, EVENT_CONTROL_CODE_ENABLE_PROVIDER,
        TRACE_LEVEL_INFORMATION, 0, 0, 0, NULL
    );

    EVENT_TRACE_LOGFILE trace_log = { 0 };
    trace_log.LoggerName = (LPSTR)TRACE_SESSION_NAME;
    trace_log.ProcessTraceMode = PROCESS_TRACE_MODE_REAL_TIME | PROCESS_TRACE_MODE_EVENT_RECORD;
    trace_log.EventRecordCallback = EventRecordCallback;

    g_trace_handle = OpenTrace(&trace_log);
    if (g_trace_handle == INVALID_PROCESSTRACE_HANDLE) {
        ControlTrace(g_session_handle, TRACE_SESSION_NAME, pProps, EVENT_TRACE_CONTROL_STOP);
        free(pProps);
        g_etw_running = false;
        return 1;
    }

    // This is a blocking call until the trace is stopped
    ProcessTrace(&g_trace_handle, 1, 0, 0);

    CloseTrace(g_trace_handle);
    ControlTrace(g_session_handle, TRACE_SESSION_NAME, pProps, EVENT_TRACE_CONTROL_STOP);
    free(pProps);
    g_etw_running = false;
    return 0;
}

static void StartETWThread()
{
    if (g_etw_running) return;
    g_etw_running = true;
    g_trace_thread = (HANDLE)_beginthreadex(NULL, 0, ETWTraceThread, NULL, 0, NULL);
}

static void StopETWThread()
{
    if (!g_etw_running) return;
    EVENT_TRACE_PROPERTIES* pProps = (EVENT_TRACE_PROPERTIES*)malloc(sizeof(EVENT_TRACE_PROPERTIES) + sizeof(TRACE_SESSION_NAME));
    if (pProps) {
        ZeroMemory(pProps, sizeof(EVENT_TRACE_PROPERTIES) + sizeof(TRACE_SESSION_NAME));
        pProps->Wnode.BufferSize = sizeof(EVENT_TRACE_PROPERTIES) + sizeof(TRACE_SESSION_NAME);
        pProps->LoggerNameOffset = sizeof(EVENT_TRACE_PROPERTIES);
        ControlTrace(0, TRACE_SESSION_NAME, pProps, EVENT_TRACE_CONTROL_STOP);
        free(pProps);
    }
    if (g_trace_thread) {
        WaitForSingleObject(g_trace_thread, 2000);
        CloseHandle(g_trace_thread);
        g_trace_thread = NULL;
    }
    g_etw_running = false;
}

// ── DLL entry point ────────────────────────────────────────────────────────
BOOL WINAPI DllMain(HINSTANCE, DWORD reason, LPVOID)
{
    if (reason == DLL_PROCESS_ATTACH)
    {
        InitializeCriticalSectionAndSpinCount(&g_state.cs, 1000);
        StartETWThread(); // Start background ETW listener on DLL load
    }
    else if (reason == DLL_PROCESS_DETACH)
    {
        StopETWThread();
        DeleteCriticalSection(&g_state.cs);
    }
    return TRUE;
}

// ── Public C API ────────────────────────────────────────────────────────────
extern "C"
{

__declspec(dllexport) void SetTargetPID(int pid)
{
    InterlockedExchange((LONG*)&g_target_pid, pid);
}

// Kept for ABI compatibility, but does nothing now (ETW auto-updates)
__declspec(dllexport) void UpdateFPSCounter()
{
    // No-op
}

__declspec(dllexport) double GetAverageFPS()
{
    EnterCriticalSection(&g_state.cs);
    double v = g_state.cached_fps;
    LeaveCriticalSection(&g_state.cs);
    return v;
}

__declspec(dllexport) double GetMinAvgFPS()
{
    EnterCriticalSection(&g_state.cs);
    double v = g_state.session_min;
    LeaveCriticalSection(&g_state.cs);
    return v;
}

__declspec(dllexport) double GetMaxAvgFPS()
{
    EnterCriticalSection(&g_state.cs);
    double v = g_state.session_max;
    LeaveCriticalSection(&g_state.cs);
    return v;
}

__declspec(dllexport) double GetMinFPS()
{
    EnterCriticalSection(&g_state.cs);
    double v = g_state.session_min_abs;
    LeaveCriticalSection(&g_state.cs);
    return v;
}

__declspec(dllexport) double GetMaxFPS()
{
    EnterCriticalSection(&g_state.cs);
    double v = g_state.session_max_abs;
    LeaveCriticalSection(&g_state.cs);
    return v;
}

__declspec(dllexport) double GetOnePercentLow()
{
    EnterCriticalSection(&g_state.cs);
    double v = g_state.cached_1pct_low;
    LeaveCriticalSection(&g_state.cs);
    return v;
}

__declspec(dllexport) int GetFrameCount()
{
    EnterCriticalSection(&g_state.cs);
    int v = g_state.total_frames;
    LeaveCriticalSection(&g_state.cs);
    return v;
}

__declspec(dllexport) int GetRecentFrametimes(double* out_buffer, int max_count)
{
    EnterCriticalSection(&g_state.cs);
    int count = std::min(g_state.avg_count, max_count);
    if (count > 0) {
        int start_idx = (g_state.avg_head - count + AVG_WINDOW) % AVG_WINDOW;
        for (int i = 0; i < count; ++i) {
            out_buffer[i] = g_state.avg_buf[(start_idx + i) % AVG_WINDOW] * 1000.0;
        }
    }
    LeaveCriticalSection(&g_state.cs);
    return count;
}

__declspec(dllexport) void ResetFPSCounter()
{
    EnterCriticalSection(&g_state.cs);
    reset_state_locked();
    LeaveCriticalSection(&g_state.cs);
}

} // extern "C"
