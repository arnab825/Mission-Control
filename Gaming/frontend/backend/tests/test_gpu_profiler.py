"""
Unit tests for dynamic GPU capabilities profiler.
"""
import os
import sys
import unittest
from pathlib import Path

# Add backend directory to sys.path
sys.path.append(str(Path(__file__).parent.parent))

from system.gpu_profiler import GPUProfiler

class TestGPUProfiler(unittest.TestCase):
    def setUp(self):
        # Initialize profiler using a temporary test cache location
        self.test_cache_dir = Path(__file__).parent.parent / "data" / "test_cache"
        self.profiler = GPUProfiler(cache_dir=str(self.test_cache_dir))

    def tearDown(self):
        # Clean up test cache files
        cache_file = self.test_cache_dir / "gpu_profiles_cache.json"
        if cache_file.exists():
            try:
                cache_file.unlink()
            except Exception:
                pass
        if self.test_cache_dir.exists():
            try:
                self.test_cache_dir.rmdir()
            except Exception:
                pass

    def test_normalization(self):
        self.assertEqual(self.profiler.normalize_name("NVIDIA GeForce RTX 5080 Ti"), "rtx 5080 ti")
        self.assertEqual(self.profiler.normalize_name("AMD Radeon RX 7900 XTX"), "rx 7900 xtx")
        self.assertEqual(self.profiler.normalize_name("Intel(R) Arc(TM) A770 Graphics"), "arc a770")

    def test_nvidia_heuristics(self):
        # RTX 5080 Ti (Blackwell)
        p = self.profiler.get_fallback_profile("NVIDIA GeForce RTX 5080 Ti")
        self.assertEqual(p["brand"], "NVIDIA")
        self.assertEqual(p["architecture"], "Blackwell")
        self.assertEqual(p["max_dlss_quality"], "DLSS 4.5")
        self.assertEqual(p["max_fg"], "4x")
        self.assertTrue(p["ray_tracing"])
        self.assertTrue(p["path_tracing"])
        self.assertEqual(p["tier"], "high")

        # RTX 4070 SUPER (Ada Lovelace)
        p = self.profiler.get_fallback_profile("GeForce RTX 4070 SUPER")
        self.assertEqual(p["brand"], "NVIDIA")
        self.assertEqual(p["architecture"], "Ada Lovelace")
        self.assertEqual(p["max_dlss_quality"], "DLSS 3.5")
        self.assertEqual(p["max_fg"], "2x")
        self.assertTrue(p["ray_tracing"])
        self.assertTrue(p["path_tracing"])

        # RTX 3060 (Ampere)
        p = self.profiler.get_fallback_profile("NVIDIA GeForce RTX 3060")
        self.assertEqual(p["brand"], "NVIDIA")
        self.assertEqual(p["architecture"], "Ampere")
        self.assertEqual(p["max_dlss_quality"], "DLSS 3.5")
        self.assertEqual(p["max_fg"], "None")
        self.assertFalse(p["path_tracing"])

        # GTX 1080 (Pascal)
        p = self.profiler.get_fallback_profile("NVIDIA GeForce GTX 1080")
        self.assertEqual(p["brand"], "NVIDIA")
        self.assertEqual(p["architecture"], "Pascal")
        self.assertEqual(p["max_dlss_quality"], "None")
        self.assertFalse(p["ray_tracing"])

    def test_amd_heuristics(self):
        p = self.profiler.get_fallback_profile("AMD Radeon RX 7900 XTX")
        self.assertEqual(p["brand"], "AMD")
        self.assertEqual(p["architecture"], "RDNA 3")
        self.assertTrue(p["ray_tracing"])
        self.assertFalse(p["is_rtx"])

    def test_intel_heuristics(self):
        p = self.profiler.get_fallback_profile("Intel Arc A770")
        self.assertEqual(p["brand"], "Intel")
        self.assertEqual(p["architecture"], "Alchemist")
        self.assertTrue(p["ray_tracing"])

    def test_caching_mechanism(self):
        # Profile a card
        name = "NVIDIA GeForce RTX 4080 SUPER"
        norm = self.profiler.normalize_name(name)
        
        # Verify not in cache initially
        self.assertNotIn(norm, self.profiler.cache)
        
        # Profile it (uses heuristics fallback in unittest environment since no config/internet)
        p = self.profiler.profile_gpu(name)
        
        # Should now be in cache
        self.assertIn(norm, self.profiler.cache)
        
        # Reload cache and check persistence
        new_profiler = GPUProfiler(cache_dir=str(self.test_cache_dir))
        self.assertIn(norm, new_profiler.cache)
        self.assertEqual(new_profiler.cache[norm]["architecture"], "Ada Lovelace")

if __name__ == "__main__":
    unittest.main()
