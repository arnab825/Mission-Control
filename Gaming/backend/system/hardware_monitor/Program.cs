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
            bool dumpMode = Array.Exists(args, a => a == "--dump");

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

            // --dump mode: print all hardware and sensor names once, then exit
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

            while (true)
            {
                try
                {
                    computer.Accept(visitor);

                    // CPU sensors — use priority-based matching so we always find something
                    double? cpuTemp = null;
                    int cpuTempPriority = -1;  // higher = better match
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
                                    if (nameLower.Contains("distance"))
                                        continue;

                                    int prio = 0; // fallback: any CPU temperature sensor
                                    if (nameLower.Contains("package"))
                                        prio = 100; // best: "CPU Package" or "Package"
                                    else if (nameLower.Contains("tdie"))
                                        prio = 95; // AMD Tdie (no offset - actual silicon temperature)
                                    else if (nameLower.Contains("tctl"))
                                        prio = 90; // AMD Tctl (has offset for fan aggressiveness)
                                    else if (nameLower.Contains("core") && !nameLower.Contains("core #"))
                                        prio = 80; // generic "Core" but not per-core
                                    else if (nameLower.Contains("cpu"))
                                        prio = 70; // anything with "CPU" in name
                                    else if (nameLower.Contains("core #"))
                                        prio = 10; // per-core temps (least preferred)

                                    if (prio > cpuTempPriority)
                                    {
                                        cpuTemp = sensor.Value;
                                        cpuTempPriority = prio;
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
                                        cpuPower = sensor.Value;
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
                                        gpuPower = sensor.Value;
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
                        cpuFreq = sum / cpuClocks.Count;
                        cpuMaxFreq = maxClock;
                    }

                    double? ramTotal = null;
                    if (ramUsed.HasValue && ramAvailable.HasValue)
                        ramTotal = ramUsed.Value + ramAvailable.Value;

                    // Always emit keys (with 0 fallback) so Python side always receives them
                    var telemetry = new Dictionary<string, object>
                    {
                        ["cpu_temp"] = cpuTemp ?? 0,
                        ["cpu_power_w"] = cpuPower ?? 0,
                        ["cpu_freq"] = cpuFreq ?? 0,
                        ["cpu_max_freq"] = cpuMaxFreq ?? 0,
                        ["cpu_pct"] = cpuPct ?? 0,
                        ["gpu_temp"] = gpuTemp ?? 0,
                        ["gpu_pct"] = gpuPct ?? 0,
                        ["gpu_power_w"] = gpuPower ?? 0,
                        ["gpu_vram_used"] = gpuVramUsed ?? 0,
                        ["gpu_vram_total"] = gpuVramTotal ?? 0,
                        ["gpu_clock"] = gpuClock ?? 0,
                        ["ram_used_gb"] = ramUsed ?? 0,
                        ["ram_total_gb"] = ramTotal ?? 0,
                        ["ram_pct"] = ramPct ?? 0,
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
