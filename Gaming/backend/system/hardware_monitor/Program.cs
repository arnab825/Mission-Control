using System;
using System.Collections.Generic;
using System.Text.Json;
using System.Threading;
using LibreHardwareMonitor.Hardware;

namespace HardwareMonitor
{
    public class Program
    {
        public static void Main(string[] args)
        {
            bool dumpMode     = Array.Exists(args, a => a == "--dump");
            bool dumpJsonMode = Array.Exists(args, a => a == "--dump-json");

            Computer computer = new Computer
            {
                IsCpuEnabled = true,
                IsGpuEnabled = true,
                IsMemoryEnabled = true,
                IsMotherboardEnabled = true,
                IsControllerEnabled = true,
                IsNetworkEnabled = true,
                IsStorageEnabled = true,
                IsPowerMonitorEnabled = true,
            };

            try
            {
                computer.Open();
            }
            catch (Exception ex)
            {
                Console.WriteLine(JsonSerializer.Serialize(new Dictionary<string, object>
                {
                    { "error", "Failed to open Computer: " + ex.Message }
                }));
                return;
            }

            UpdateVisitor visitor = new UpdateVisitor();

            // --dump mode: print all hardware and sensor names once (human-readable), then exit
            if (dumpMode)
            {
                computer.Accept(visitor);
                foreach (IHardware hw in computer.Hardware)
                {
                    hw.Update();
                    foreach (IHardware sub in hw.SubHardware) sub.Update();

                    Console.WriteLine($"=== {hw.HardwareType}: {hw.Name} ===");
                    foreach (ISensor s in hw.Sensors)
                        Console.WriteLine($"  [{s.SensorType}] \"{s.Name}\" = {s.Value}");
                    foreach (IHardware sub in hw.SubHardware)
                    {
                        Console.WriteLine($"  --- Sub: {sub.HardwareType}: {sub.Name} ---");
                        foreach (ISensor s in sub.Sensors)
                            Console.WriteLine($"    [{s.SensorType}] \"{s.Name}\" = {s.Value}");
                    }
                }
                computer.Close();
                return;
            }

            // --dump-json mode: output all CPU temperature sensors as JSON array, then exit.
            // Used by Python on startup to log which sensors are available for diagnostics.
            if (dumpJsonMode)
            {
                computer.Accept(visitor);
                var cpuTempSensors = new List<Dictionary<string, object>>();

                // Run the same priority logic as the main loop to mark the selected sensor
                string? selectedName = null;
                int bestPrio = -1;

                foreach (IHardware hw in computer.Hardware)
                {
                    hw.Update();
                    foreach (IHardware sub in hw.SubHardware) sub.Update();

                    if (hw.HardwareType != HardwareType.Cpu) continue;

                    var allSensors = new List<ISensor>(hw.Sensors);
                    foreach (IHardware sub in hw.SubHardware) allSensors.AddRange(sub.Sensors);

                    foreach (ISensor s in allSensors)
                    {
                        if (s.SensorType != SensorType.Temperature) continue;
                        string nameLower = (s.Name ?? "").ToLowerInvariant();
                        if (nameLower.Contains("distance")) continue;

                        int prio = GetCpuTempPriority(nameLower);
                        cpuTempSensors.Add(new Dictionary<string, object>
                        {
                            ["name"]  = s.Name ?? "",
                            ["value"] = s.Value.HasValue ? (object)Math.Round((double)s.Value.Value, 1) : "null",
                            ["priority"] = prio
                        });

                        if (prio > bestPrio && s.Value.HasValue && s.Value.Value > 0)
                        {
                            bestPrio     = prio;
                            selectedName = s.Name ?? "";
                        }
                    }
                }

                // Mark which sensor was selected
                foreach (var entry in cpuTempSensors)
                {
                    entry["selected"] = (string)entry["name"] == selectedName;
                }

                Console.WriteLine(JsonSerializer.Serialize(cpuTempSensors));
                computer.Close();
                return;
            }

            while (true)
            {
                try
                {
                    computer.Accept(visitor);

                    // CPU sensors — use priority-based matching so we always find something
                    double? cpuTemp = null;
                    int cpuTempPriority = -1;
                    string? cpuTempSensorName = null;   // tracks which LHM sensor was selected
                    double? cpuPower = null;
                    int cpuPowerPriority = -1;
                    double? cpuFreq = null;
                    double? cpuPct = null;
                    List<double> cpuClocks = new List<double>();

                    // GPU sensors
                    double? gpuTemp = null;
                    double? gpuPct = null;
                    double? gpuPower = null;
                    int gpuPowerPriority = -1;
                    double? gpuVramUsed = null;
                    double? gpuVramTotal = null;
                    double? gpuClock = null;
                    int gpuPriority = -1;

                    // RAM sensors
                    double? ramUsed = null;
                    double? ramAvailable = null;
                    double? ramPct = null;

                    foreach (IHardware hardware in computer.Hardware)
                    {
                        hardware.Update();
                        foreach (IHardware subHardware in hardware.SubHardware)
                            subHardware.Update();

                        if (hardware.HardwareType == HardwareType.Cpu)
                        {
                            // Collect sensors from both hardware and sub-hardware
                            var allSensors = new List<ISensor>(hardware.Sensors);
                            foreach (IHardware sub in hardware.SubHardware)
                                allSensors.AddRange(sub.Sensors);

                            foreach (ISensor sensor in allSensors)
                            {
                                string name = sensor.Name ?? "";
                                string nameLower = name.ToLowerInvariant();

                                // --- CPU Temperature ---
                                if (sensor.SensorType == SensorType.Temperature && sensor.Value.HasValue && sensor.Value.Value > 0)
                                {
                                    // Skip "Distance to TjMax" — it counts down from 0 and is not a temperature
                                    if (nameLower.Contains("distance"))
                                        continue;

                                    int prio = GetCpuTempPriority(nameLower);

                                    if (prio > cpuTempPriority)
                                    {
                                        cpuTemp           = sensor.Value;
                                        cpuTempPriority   = prio;
                                        cpuTempSensorName = name;
                                    }
                                }
                                // --- CPU Power ---
                                else if (sensor.SensorType == SensorType.Power && sensor.Value.HasValue && sensor.Value.Value > 0)
                                {
                                    int prio = 0; // fallback: any CPU power sensor
                                    if (nameLower.Contains("package"))
                                        prio = 100; // best: "CPU Package"
                                    else if (nameLower.Contains("cpu") && !nameLower.Contains("core"))
                                        prio = 80;
                                    else if (nameLower.Contains("total"))
                                        prio = 70;
                                    else if (nameLower.Contains("power"))
                                        prio = 50;

                                    if (prio > cpuPowerPriority)
                                    {
                                        cpuPower         = sensor.Value;
                                        cpuPowerPriority = prio;
                                    }
                                }
                                // --- CPU Clock ---
                                else if (sensor.SensorType == SensorType.Clock)
                                {
                                    if ((nameLower.Contains("core") || nameLower.Contains("cpu")) && sensor.Value.HasValue && sensor.Value.Value > 0)
                                    {
                                        cpuClocks.Add(sensor.Value.Value);
                                    }
                                }
                                // --- CPU Load ---
                                else if (sensor.SensorType == SensorType.Load && 
                                         (nameLower.Contains("total") || nameLower.Contains("cpu total")))
                                {
                                    cpuPct = sensor.Value;
                                }
                            }
                        }
                        else if (hardware.HardwareType == HardwareType.GpuNvidia || 
                                 hardware.HardwareType == HardwareType.GpuAmd || 
                                 hardware.HardwareType == HardwareType.GpuIntel)
                        {
                            int currentGpuPriority = 0;
                            if (hardware.HardwareType == HardwareType.GpuNvidia) currentGpuPriority = 100;
                            else if (hardware.HardwareType == HardwareType.GpuAmd) currentGpuPriority = 80;
                            else if (hardware.HardwareType == HardwareType.GpuIntel) currentGpuPriority = 20;

                            if (currentGpuPriority >= gpuPriority)
                            {
                                gpuPriority = currentGpuPriority;
                                // Found a higher or equal priority GPU, clear the old metrics
                                gpuTemp = null;
                                gpuPct = null;
                                gpuPower = null;
                                gpuPowerPriority = -1;
                                gpuVramUsed = null;
                                gpuVramTotal = null;
                                gpuClock = null;
                            }
                            else
                            {
                                // Skip parsing sensors for lower-priority GPU
                                continue;
                            }

                            foreach (ISensor sensor in hardware.Sensors)
                            {
                                string nameLower = (sensor.Name ?? "").ToLowerInvariant();

                                if (sensor.SensorType == SensorType.Temperature && 
                                    (nameLower.Contains("core") || nameLower.Contains("gpu") || nameLower.Contains("hot spot")))
                                {
                                    if (gpuTemp == null || nameLower.Contains("core"))
                                        gpuTemp = sensor.Value;
                                }
                                else if (sensor.SensorType == SensorType.Load && 
                                         (nameLower.Contains("core") || nameLower.Contains("gpu")))
                                {
                                    if (gpuPct == null || nameLower.Contains("core"))
                                        gpuPct = sensor.Value;
                                }
                                else if (sensor.SensorType == SensorType.Power && sensor.Value.HasValue && sensor.Value.Value > 0)
                                {
                                    int prio = 0;
                                    if (nameLower.Contains("package") || nameLower.Contains("total") || nameLower.Contains("board"))
                                        prio = 100;
                                    else if (nameLower.Contains("gpu") || nameLower.Contains("power") || nameLower.Contains("card"))
                                        prio = 50;

                                    if (prio > gpuPowerPriority)
                                    {
                                        gpuPower         = sensor.Value;
                                        gpuPowerPriority = prio;
                                    }
                                }
                                else if (sensor.SensorType == SensorType.Clock && 
                                         (nameLower.Contains("core") || nameLower.Contains("gpu")))
                                {
                                    if (gpuClock == null || nameLower.Contains("core"))
                                        gpuClock = sensor.Value;
                                }
                                else if (sensor.SensorType == SensorType.Data || sensor.SensorType == SensorType.SmallData)
                                {
                                    if (!nameLower.Contains("shared") && (nameLower.Contains("memory used") || nameLower.Contains("gpu memory used") || nameLower.Contains("dedicated memory used")))
                                    {
                                        gpuVramUsed = sensor.Value;
                                    }
                                    else if (!nameLower.Contains("shared") && (nameLower.Contains("memory total") || nameLower.Contains("gpu memory total") || nameLower.Contains("dedicated memory total")))
                                    {
                                        gpuVramTotal = sensor.Value;
                                    }
                                    else if (!nameLower.Contains("shared") && (nameLower.Contains("memory free") || nameLower.Contains("gpu memory free")) && 
                                             sensor.Value.HasValue && gpuVramUsed.HasValue && gpuVramTotal == null)
                                    {
                                        gpuVramTotal = gpuVramUsed.Value + sensor.Value.Value;
                                    }
                                }
                            }
                        }
                        else if (hardware.HardwareType == HardwareType.Memory)
                        {
                            foreach (ISensor sensor in hardware.Sensors)
                            {
                                string nameLower = (sensor.Name ?? "").ToLowerInvariant();

                                if (sensor.SensorType == SensorType.Data)
                                {
                                    if (nameLower.Contains("used"))
                                        ramUsed = sensor.Value;
                                    else if (nameLower.Contains("available"))
                                        ramAvailable = sensor.Value;
                                }
                                else if (sensor.SensorType == SensorType.Load && nameLower.Contains("memory"))
                                {
                                    ramPct = sensor.Value;
                                }
                            }
                        }
                    }

                    double? cpuMaxFreq = null;
                    if (cpuClocks.Count > 0)
                    {
                        double sum = 0;
                        double maxClock = 0;
                        foreach (double clock in cpuClocks)
                        {
                            sum += clock;
                            if (clock > maxClock) maxClock = clock;
                        }
                        cpuFreq    = sum / cpuClocks.Count;
                        cpuMaxFreq = maxClock;
                    }

                    double? ramTotal = null;
                    if (ramUsed.HasValue && ramAvailable.HasValue)
                        ramTotal = ramUsed.Value + ramAvailable.Value;

                    // Always emit keys (with 0 fallback) so Python side always receives them.
                    // cpu_temp_sensor carries the name of the LHM sensor that was selected
                    // so Python can log it for diagnostics (e.g. "CPU Package", "Core Max", "Tdie").
                    var telemetry = new Dictionary<string, object>
                    {
                        ["cpu_temp"]         = cpuTemp ?? 0,
                        ["cpu_temp_sensor"]  = cpuTempSensorName ?? "",   // NEW: sensor name for diagnostics
                        ["cpu_power_w"]      = cpuPower ?? 0,
                        ["cpu_freq"]         = cpuFreq ?? 0,
                        ["cpu_max_freq"]     = cpuMaxFreq ?? 0,
                        ["cpu_pct"]          = cpuPct ?? 0,
                        ["gpu_temp"]         = gpuTemp ?? 0,
                        ["gpu_pct"]          = gpuPct ?? 0,
                        ["gpu_power_w"]      = gpuPower ?? 0,
                        ["gpu_vram_used"]    = gpuVramUsed ?? 0,
                        ["gpu_vram_total"]   = gpuVramTotal ?? 0,
                        ["gpu_clock"]        = gpuClock ?? 0,
                        ["ram_used_gb"]      = ramUsed ?? 0,
                        ["ram_total_gb"]     = ramTotal ?? 0,
                        ["ram_pct"]          = ramPct ?? 0,
                    };

                    Console.WriteLine(JsonSerializer.Serialize(telemetry));

                }
                catch (Exception ex)
                {
                    if (ex is System.IO.IOException || ex.InnerException is System.IO.IOException)
                    {
                        break;
                    }

                    try
                    {
                        Console.WriteLine(JsonSerializer.Serialize(new Dictionary<string, object>
                        {
                            { "error", "Telemetry error: " + ex.Message }
                        }));
                    }
                    catch
                    {
                        break;
                    }
                }

                Thread.Sleep(1000);
            }
        }

        /// <summary>
        /// Returns a priority score for a CPU temperature sensor name.
        /// Higher priority = better representative of overall CPU temperature.
        ///
        /// Priority ladder (highest → lowest):
        ///   100 — "CPU Package" / "Package"  (Intel/AMD package-level — BEST)
        ///    95 — "Tdie"                      (AMD silicon die, no offset)
        ///    90 — "Tctl" / "Tctl/Tdie"        (AMD control temp, has fan-curve offset)
        ///    85 — starts with "ccd"            (AMD chiplet die: CCD1 Tdie, CCD2 Tdie)
        ///    70 — contains "cpu"               (generic CPU-named sensor)
        ///     5 — "Core Max" / "Core Average"  (per-core aggregates — NOT package-level)
        ///     2 — "Core #N" / "Core(#N)"       (individual cores — last resort)
        ///     0 — anything else                (unknown fallback)
        ///
        /// "Core Max" is explicitly ranked at 5 (near-last) because it represents
        /// the hottest individual core, which is always >= package temp and spikes
        /// dramatically on single-threaded workloads, making the HUD misleading.
        /// </summary>
        private static int GetCpuTempPriority(string nameLower)
        {
            // Package-level sensors — the correct overall CPU temperature
            if (nameLower.Contains("package"))
                return 100;

            // AMD Tdie — actual silicon die temperature, no artificial offset
            if (nameLower.Contains("tdie") && !nameLower.Contains("tctl"))
                return 95;

            // AMD Tctl — has a +27°C offset on Ryzen 5000+ for fan aggressiveness,
            // but still a reliable package-level proxy
            if (nameLower.Contains("tctl"))
                return 90;

            // AMD multi-chiplet die temperatures (e.g. "CCD1 (Tdie)", "CCD2 (Tdie)")
            if (nameLower.StartsWith("ccd"))
                return 85;

            // Generic CPU-named sensor (e.g. board-level "CPU" zone)
            if (nameLower.Contains("cpu"))
                return 70;

            // "Core Max" — LHM virtual sensor = MAX(Core #0 .. Core #N).
            // This is the HOTTEST individual core, not the package temperature.
            // It reads higher than package on single-threaded bursts, causing the
            // HUD to show inflated temperatures. Explicitly assign -1 to ignore them
            // so we can fallback to WMI package sensors.
            if (nameLower.Contains("core max") || nameLower.Contains("core average"))
                return -1;

            // Individual cores (e.g. "Core #0", "Core(#3)") — last hardware resort
            if (nameLower.Contains("core #") || nameLower.Contains("core(#"))
                return -1;

            // Unknown — accept as absolute last resort
            return 0;
        }
    }

    public class UpdateVisitor : IVisitor
    {
        public void VisitComputer(IComputer computer) => computer.Traverse(this);

        public void VisitHardware(IHardware hardware)
        {
            hardware.Update();
            foreach (IHardware subHardware in hardware.SubHardware)
                subHardware.Accept(this);
        }

        public void VisitSensor(ISensor sensor) { }

        public void VisitParameter(IParameter parameter) { }
    }
}
