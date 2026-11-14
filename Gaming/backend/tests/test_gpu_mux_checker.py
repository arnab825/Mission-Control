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

if __name__ == "__main__":
    unittest.main()
