import unittest
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from system.hw_checker import HardwareChecker

class TestGpuMuxChecker(unittest.TestCase):
    def setUp(self):
        self.checker = HardwareChecker(config={"gpu_working_mode": "hybrid"})

    def test_gpu_architecture_and_mux_discovery(self):
        gpus, mux_switch = self.checker._get_gpu_architecture_and_mux(manufacturer="HP", model="Victus")
        self.assertIsInstance(gpus, list)
        self.assertIsInstance(mux_switch, dict)
        self.assertIn("has_mux", mux_switch)
        self.assertIn("current_mode", mux_switch)
        self.assertIn("user_preferred_mode", mux_switch)
        self.assertIn("display_routing", mux_switch)
        self.assertIn("latency_mode", mux_switch)
        self.assertIn("form_factor", mux_switch)
        self.assertIn("architecture_type", mux_switch)
        self.assertIn("brand_vocabulary", mux_switch)
        self.assertIn("installed_oem_suites", mux_switch)
        
        # In hybrid laptop systems, user_preferred_mode matches config or current_mode
        self.assertEqual(mux_switch["user_preferred_mode"], "hybrid")

    def test_detect_oem_software_catalog(self):
        # Test ASUS brand vocabulary mapping
        asus_oem, asus_suites, asus_vocab = self.checker._detect_oem_software(manufacturer="ASUSTeK COMPUTER INC.", model="ROG Strix")
        self.assertIn("discrete", asus_vocab)
        self.assertIn("Ultimate", asus_vocab["discrete"])

        # Test Lenovo brand vocabulary mapping
        lenovo_oem, lenovo_suites, lenovo_vocab = self.checker._detect_oem_software(manufacturer="LENOVO", model="Legion 5")
        self.assertIn("discrete", lenovo_vocab)
        self.assertIn("dGPU", lenovo_vocab["discrete"])

        # Test HP brand vocabulary mapping
        hp_oem, hp_suites, hp_vocab = self.checker._detect_oem_software(manufacturer="HP", model="Victus Gaming Laptop")
        self.assertIn("discrete", hp_vocab)
        self.assertIn("OMEN", hp_vocab["discrete"])

    def test_get_basic_specs_includes_gpus_and_mux(self):
        specs = self.checker.get_basic_specs()
        self.assertIn("hardware", specs)
        self.assertIn("gpus", specs["hardware"])
        self.assertIn("mux_switch", specs["hardware"])
        self.assertIn("gpus", specs)
        self.assertIn("mux_switch", specs)
        self.assertIn("form_factor", specs["mux_switch"])
        self.assertIn("brand_vocabulary", specs["mux_switch"])

    def test_get_system_specs_includes_gpus_and_mux(self):
        specs = self.checker.get_system_specs()
        self.assertIn("hardware", specs)
        self.assertIn("gpus", specs["hardware"])
        self.assertIn("mux_switch", specs["hardware"])
        self.assertIn("gpus", specs)
        self.assertIn("mux_switch", specs)
        
        if specs["gpus"]:
            gpu0 = specs["gpus"][0]
            self.assertIn("name", gpu0)
            self.assertIn("type", gpu0)
            self.assertIn(gpu0["type"], ("discrete", "integrated"))

    def test_classify_gpu_vendor(self):
        self.assertEqual(HardwareChecker.classify_gpu_vendor("NVIDIA GeForce RTX 4080"), "NVIDIA")
        self.assertEqual(HardwareChecker.classify_gpu_vendor("Intel(R) UHD Graphics 770"), "Intel")
        self.assertEqual(HardwareChecker.classify_gpu_vendor("AMD Radeon 780M Graphics"), "AMD")
        self.assertEqual(HardwareChecker.classify_gpu_vendor("Snapdragon(R) X Elite - Adreno(TM) GPU"), "Qualcomm")
        self.assertEqual(HardwareChecker.classify_gpu_vendor("Apple M3 Max GPU"), "Apple")

    def test_classify_amd_igpu_and_dgpu(self):
        # AMD APU iGPUs (RDNA 2, 3, 3.5, Vega, and generic Ryzen graphics)
        amd_igpus = [
            "AMD Radeon 780M",
            "AMD Radeon 780M Graphics",
            "AMD Radeon(TM) 780M Graphics",
            "AMD Radeon 680M",
            "AMD Radeon 660M",
            "AMD Radeon 610M",
            "AMD Radeon 740M",
            "AMD Radeon 760M",
            "AMD Radeon 840M",
            "AMD Radeon 860M",
            "AMD Radeon 880M",
            "AMD Radeon 890M",
            "AMD Radeon Graphics",
            "AMD Radeon(TM) Graphics",
            "AMD Radeon(TM)",
            "AMD Radeon Vega 8 Graphics",
            "AMD Radeon RX Vega 10 Graphics",
            "AMD Radeon RX Vega 11",
            "AMD Radeon Vega 3 Graphics",
            "Radeon Vega Mobile Gfx",
            "AMD Radeon R7 Graphics",
            "AMD Radeon R5 Graphics",
            "AMD Processor Graphics",
            "AMD Radeon HD 8400",
        ]
        for name in amd_igpus:
            self.assertEqual(
                HardwareChecker.classify_gpu_type(name, vendor="AMD"),
                "integrated",
                f"Failed to classify AMD iGPU: {name}"
            )

        # High UMA shared memory BIOS allocation (e.g. ROG Ally / Legion Go with 8GB allocated)
        self.assertEqual(
            HardwareChecker.classify_gpu_type("AMD Radeon 780M Graphics", vendor="AMD", vram=8 * (1024**3)),
            "integrated"
        )
        self.assertEqual(
            HardwareChecker.classify_gpu_type("AMD Radeon Graphics", vendor="AMD", vram=6 * (1024**3)),
            "integrated"
        )

        # AMD dGPUs (Radeon RX, Pro, Instinct, Vega 56/64)
        amd_dgpus = [
            "AMD Radeon RX 7900 XTX",
            "AMD Radeon RX 7800 XT",
            "AMD Radeon RX 6700 XT",
            "AMD Radeon RX 6600",
            "AMD Radeon RX 7600M XT",
            "AMD Radeon RX 6800M",
            "AMD Radeon RX 580 Series",
            "AMD Radeon Pro W7900",
            "AMD Radeon Pro W6600",
            "AMD FirePro W5100",
            "AMD Instinct MI300X",
            "Radeon RX Vega 64",
            "Radeon RX Vega 56",
            "Radeon Vega Frontier Edition",
            "AMD Radeon R9 390 Series",
            "AMD Radeon R7 250",
            "AMD Radeon HD 7970",
        ]
        for name in amd_dgpus:
            self.assertEqual(
                HardwareChecker.classify_gpu_type(name, vendor="AMD"),
                "discrete",
                f"Failed to classify AMD dGPU: {name}"
            )

    def test_classify_intel_igpu_and_dgpu(self):
        # Intel iGPUs (UHD, Iris Xe, HD Graphics, Core Ultra integrated Arc)
        intel_igpus = [
            "Intel(R) UHD Graphics",
            "Intel(R) UHD Graphics 620",
            "Intel(R) UHD Graphics 770",
            "Intel(R) Iris(R) Xe Graphics",
            "Intel(R) Iris(R) Plus Graphics 655",
            "Intel(R) HD Graphics 4000",
            "Intel(R) HD Graphics 530",
            "Intel(R) Arc(TM) Graphics",
            "Intel Arc Graphics",
            "Intel(R) Arc(TM) 140V GPU",
            "Intel(R) Arc(TM) 130V GPU",
        ]
        for name in intel_igpus:
            self.assertEqual(
                HardwareChecker.classify_gpu_type(name, vendor="Intel"),
                "integrated",
                f"Failed to classify Intel iGPU: {name}"
            )

        # Intel dGPUs (Arc A-series, B-series, Pro, Iris Xe MAX)
        intel_dgpus = [
            "Intel(R) Arc(TM) A770 Graphics",
            "Intel(R) Arc(TM) A750 Graphics",
            "Intel(R) Arc(TM) A580 Graphics",
            "Intel(R) Arc(TM) A380 Graphics",
            "Intel(R) Arc(TM) A370M Graphics",
            "Intel(R) Arc(TM) A350M Graphics",
            "Intel(R) Arc(TM) A730M Graphics",
            "Intel(R) Arc(TM) B580 Graphics",
            "Intel(R) Arc(TM) B570 Graphics",
            "Intel(R) Arc(TM) Pro A60",
            "Intel(R) Iris(R) Xe MAX Graphics",
        ]
        for name in intel_dgpus:
            self.assertEqual(
                HardwareChecker.classify_gpu_type(name, vendor="Intel"),
                "discrete",
                f"Failed to classify Intel dGPU: {name}"
            )

    def test_classify_nvidia_and_soc(self):
        nvidia_dgpus = [
            "NVIDIA GeForce RTX 4090",
            "NVIDIA GeForce RTX 5050 Laptop GPU",
            "NVIDIA GeForce GTX 1660 Ti",
            "NVIDIA GeForce MX450",
            "NVIDIA RTX A2000 Laptop GPU",
            "Quadro RTX 5000",
        ]
        for name in nvidia_dgpus:
            self.assertEqual(
                HardwareChecker.classify_gpu_type(name, vendor="NVIDIA"),
                "discrete"
            )

        soc_igpus = [
            "Snapdragon(R) X Elite - Adreno(TM) GPU",
            "Qualcomm Adreno 690",
            "Apple M3 Pro GPU",
        ]
        for name in soc_igpus:
            self.assertEqual(
                HardwareChecker.classify_gpu_type(name),
                "integrated"
            )

if __name__ == "__main__":
    unittest.main()
