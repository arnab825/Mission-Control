import { useState, useEffect, useCallback, useRef } from 'react';
import type { TelemetryState } from '../types/telemetry';

const bridgeHost = import.meta.env.VITE_BRIDGE_HOST ?? 'localhost';
const bridgePort = import.meta.env.VITE_BRIDGE_PORT ?? '8765';
const defaultBridgeUrl = import.meta.env.VITE_BRIDGE_URL ?? `ws://${bridgeHost}:${bridgePort}`;

// Throttle React state updates to at most once per 100ms when idle.
// When a game is active we drop to 150ms — the backend already coalesces
// updates on its side, so the frontend receives far fewer messages anyway.
const IDLE_THROTTLE_MS = 100;
const GAME_THROTTLE_MS = 150;

// Critical keys bypass throttle and trigger an immediate flush
const CRITICAL_KEYS = new Set([
  'config', 'connected', 'version',
  'agent_response', 'voice_prompt',
  'chat_history', 'chat_sessions', 'suggested_session_title',
  'launch_status', 'account_deleted',
  'annotated_frame', 'detections', 'detections_count', 'health',
  'is_low_health', 'vision_fps', 'capture_fps', 'vision_profiling',
  'scene_type', 'scene_confidence', 'fps', 'game_fps', 'gpu_metrics',
  'cpu_pct', 'cpu_temp', 'cpu_power_w', 'mem_pct', 'gaming_readiness'
]);

export const useBridge = (url: string = defaultBridgeUrl) => {
  const [state, setState] = useState<TelemetryState | null>(null);
  const [connected, setConnected] = useState(false);
  const latestData = useRef<TelemetryState | null>(null);
  const pendingUpdate = useRef<TelemetryState | null>(null);
  const lastFlush = useRef<number>(0);
  const flushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastMessageTime = useRef<number>(performance.now());

  const ws = useRef<WebSocket | null>(null);
  // Outbound queue — commands sent during reconnection are buffered here and
  // drained automatically once the socket re-opens.
  const pendingQueue = useRef<{ type: string; payload: unknown }[]>([]);

  const flushPending = useCallback(() => {
    flushTimer.current = null;

    if (pendingUpdate.current !== null) {
      setState(pendingUpdate.current);
      latestData.current = pendingUpdate.current;
      pendingUpdate.current = null;
      lastFlush.current = performance.now();
    }
  }, []);

  const connect = useCallback(() => {
    if (ws.current?.readyState === WebSocket.OPEN || ws.current?.readyState === WebSocket.CONNECTING) return;

    ws.current = new WebSocket(url);

    ws.current.onopen = () => {
      setConnected(true);
      lastMessageTime.current = performance.now();
      console.log('Connected to Aero Bridge');
      // Drain any commands that were queued during reconnection
      if (pendingQueue.current.length > 0) {
        pendingQueue.current.forEach(msg => ws.current!.send(JSON.stringify(msg)));
        pendingQueue.current = [];
      }
    };

    ws.current.onmessage = (event) => {
      try {
        lastMessageTime.current = performance.now();
        const data = JSON.parse(event.data);
        if (data.type === 'pong') {
          return;
        }

        // Merge incoming partial update into accumulated pending state
        const merged = { ...(pendingUpdate.current ?? latestData.current ?? {}), ...data } as TelemetryState;
        pendingUpdate.current = merged;

        // Check if this message contains critical keys that need immediate processing
        const hasCriticalKeys = Object.keys(data).some(key => CRITICAL_KEYS.has(key));
        if (hasCriticalKeys) {
          // Cancel any pending timers and flush immediately
          if (flushTimer.current) { clearTimeout(flushTimer.current); flushTimer.current = null; }
          flushPending();
          return;
        }

        // Adaptive throttle window based on whether a game is running
        const isGameActive = Boolean(merged.is_game_active);
        const throttle = isGameActive ? GAME_THROTTLE_MS : IDLE_THROTTLE_MS;
        const now = performance.now();
        const timeSinceFlush = now - lastFlush.current;

        if (timeSinceFlush >= throttle) {
          // Enough time has passed — flush immediately
          if (flushTimer.current) { clearTimeout(flushTimer.current); flushTimer.current = null; }
          flushPending();
        } else if (!flushTimer.current) {
          // Schedule a deferred flush for when the throttle window expires
          flushTimer.current = setTimeout(flushPending, throttle - timeSinceFlush);
        }
      } catch (err) {
        console.error('Failed to parse bridge data', err);
      }
    };

    ws.current.onclose = () => {
      setConnected(false);
      console.log('Disconnected from Aero Bridge');
      setTimeout(connect, 3000);
    };
  }, [url, flushPending]);

  useEffect(() => {
    connect();

    const heartbeatInterval = setInterval(() => {
      if (ws.current?.readyState === WebSocket.OPEN) {
        try {
          ws.current.send(JSON.stringify({ type: 'ping' }));
        } catch (err) {
          console.error('Failed to send heartbeat ping', err);
        }

        // If no message has been received for 10 seconds, force close to trigger reconnect
        if (performance.now() - lastMessageTime.current > 10000) {
          console.warn('Aero Bridge heartbeat timeout. Reconnecting...');
          ws.current.close();
        }
      } else {
        // Reset lastMessageTime so that once it opens, it doesn't immediately time out
        lastMessageTime.current = performance.now();
      }
    }, 5000);

    return () => {
      clearInterval(heartbeatInterval);
      if (flushTimer.current) clearTimeout(flushTimer.current);

      ws.current?.close();
    };
  }, [connect]);

  const sendCommand = useCallback((type: string, payload: unknown = {}) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ type, payload }));
    } else {
      // Socket is connecting or closed — buffer for drain on reconnect
      pendingQueue.current.push({ type, payload });
    }
  }, []);

  return { state, connected, sendCommand };
};

