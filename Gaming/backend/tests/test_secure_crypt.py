import unittest
import sys
import os

# Ensure the parent directory is in sys.path to resolve local module imports during tests
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from ai_brain.secure_crypt import get_system_token, encrypt_data, decrypt_data

class TestSecureCrypt(unittest.TestCase):
    def test_get_system_token(self):
        token = get_system_token()
        self.assertIsInstance(token, str)
        # Should be a SHA-256 hex digest, so exactly 64 characters long
        self.assertEqual(len(token), 64)
        # Verify it consists of valid hexadecimal characters only
        try:
            int(token, 16)
        except ValueError:
            self.fail("get_system_token did not return a valid hexadecimal string")

    def test_encryption_decryption_roundtrip(self):
        token = get_system_token()
        messages = [
            "Hello, World!",
            "Mission Control Session Memory Object",
            "{\"key\": \"val\", \"array\": [1, 2, 3]}",
            "This is a longer payload designed to verify keystream block boundaries. " * 5
        ]

        for msg in messages:
            with self.subTest(msg=msg):
                encrypted = encrypt_data(msg, token)
                self.assertNotEqual(encrypted, msg)
                
                decrypted = decrypt_data(encrypted, token)
                self.assertEqual(decrypted, msg)

    def test_encryption_variance(self):
        # Using two different keys, the encrypted output must not decrypt with the wrong key
        key1 = get_system_token()
        key2 = "a" * 64 # Alternative valid hex key
        
        msg = "Top Secret Strategy Logs"
        encrypted_1 = encrypt_data(msg, key1)
        encrypted_2 = encrypt_data(msg, key2)
        
        self.assertNotEqual(encrypted_1, encrypted_2)
        
        # Trying to decrypt with the wrong key should throw a ValueError due to HMAC check failure
        with self.assertRaises(ValueError):
            decrypt_data(encrypted_1, key2)

    def test_tampering_detection(self):
        token = get_system_token()
        msg = "Secure Telemetry Payload"
        encrypted = encrypt_data(msg, token)
        
        # Tamper with the base64 encoded string
        # Swap characters or append random noise
        tampered = encrypted[:-5] + "AAAAA"
        
        # HMAC check must fail and throw ValueError
        with self.assertRaises(ValueError):
            decrypt_data(tampered, token)

if __name__ == "__main__":
    unittest.main()
