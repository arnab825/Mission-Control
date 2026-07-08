"""
Voice assistance manager — Mission Control.

TTS (Text-to-Speech):
  Primary  : Windows SAPI5 via win32com (Direct COM)
  Cloud    : Google Cloud TTS (Free gTTS style) & ElevenLabs (Premium)

STT (Speech-to-Text):
  Primary  : Google Web Speech API (Free)
  Fallback : Sphinx Offline

Profile personalities:
  Aero (Cloud)        Google TTS              — high-quality cloud voice
  Valkyrie (Agile)    Zira, Rate=+2, Vol=100  — quick & energetic (local)
  Intel (Synthetic)   Zira, Rate=+1, Vol= 80  — crisp, quieter (local)
  Tactical (Male)     David,Rate=-1, Vol=100  — calm, authoritative (local)
  Overwatch (Heavy)   David,Rate=-2, Vol=100  — slow, commanding (local)
"""
import threading
import logging
import queue
import time
import requests
import os
import tempfile
import pygame
import re
from typing import Optional

import warnings
with warnings.catch_warnings():
    warnings.filterwarnings("ignore", category=DeprecationWarning)
    import speech_recognition as sr


logger = logging.getLogger(__name__)

# ── SAPI5 via win32com ─────────────────────────────────────────────────────────
try:
    import win32com.client
    _WIN32COM_OK = True
except ImportError:
    _WIN32COM_OK = False
    logger.warning("win32com not available — falling back to pyttsx3")

_PYTTSX3_OK = None

def _check_pyttsx3():
    global _PYTTSX3_OK
    if _PYTTSX3_OK is None:
        try:
            import pyttsx3
            _PYTTSX3_OK = True
        except ImportError:
            _PYTTSX3_OK = False
    return _PYTTSX3_OK

# ── Profile table ─────────────────────────────────────────────────────────────
# (gender, sapi5_rate, sapi5_volume, sapi5_pitch, preferred_provider)
PROFILES = {
    # --- Google ---
    "aero (cloud)":       ("female", 0,  100,  0, "google"),
    "nova (neural)":      ("female", 0,  100, -2, "google"),
    "echo (standard)":    ("female", 1,  100,  2, "google"),
    
    # --- ElevenLabs ---
    "rachel (pro)":       ("female", 0,  100,  0, "elevenlabs"),
    "adam (deep)":        ("male",  -1,  100, -2, "elevenlabs"),
    "antoni (tactical)":  ("male",   0,  100,  0, "elevenlabs"),
    
    # --- Local (SAPI5) ---
    "tactical (male)":    ("male",  -1,  100,  0, "sapi5"),
    "valkyrie (agile)":   ("female", 2,  100,  5, "sapi5"),
    "intel (synthetic)":  ("female", 1,   80, -3, "sapi5"),
    "overwatch (heavy)":  ("male",  -2,  100, -5, "sapi5"),
}
DEFAULT_PROFILE = "aero (cloud)"


class _SAPI5Speaker:
    """Thin wrapper around Windows SAPI5 SpVoice COM object."""
    def __init__(self):
        self._local = threading.local()
        self._current_pitch = 0

    def _get_speaker(self):
        if not hasattr(self._local, "speaker") or self._local.speaker is None:
            try:
                import pythoncom
                pythoncom.CoInitialize()
            except:
                pass
            self._local.speaker = win32com.client.Dispatch("SAPI.SpVoice")
        return self._local.speaker

    def set_voice(self, token_id: str):
        speaker = self._get_speaker()
        try:
            voices = speaker.GetVoices()
            for i in range(voices.Count):
                v = voices.Item(i)
                if token_id in v.Id:
                    speaker.Voice = v
                    return
        except Exception as e:
            logger.warning(f"SAPI5 set_voice failed: {e}")

    def set_rate(self, rate: int):
        try: self._get_speaker().Rate = max(-10, min(10, rate))
        except: pass

    def set_volume(self, volume: int):
        try: self._get_speaker().Volume = max(0, min(100, volume))
        except: pass
        
    def set_pitch(self, pitch: int):
        self._current_pitch = max(-10, min(10, pitch))

    def speak(self, text: str):
        try:
            # Use SSML-like XML to set pitch
            # 0x2 = SPF_PURGEBEFORESPEAK
            # 0x8 = SPF_IS_XML
            xml_text = f"<pitch absmiddle='{self._current_pitch}'>{text}</pitch>"
            self._get_speaker().Speak(xml_text, 0x2 | 0x8)
        except Exception as e:
            # Fallback to plain text if XML fails
            try: self._get_speaker().Speak(text, 0x2)
            except: pass
            logger.error(f"SAPI5 speak failed: {e}")

    def stop(self):
        try:
            self._get_speaker().Speak("", 0x2)
        except Exception as e:
            logger.debug(f"SAPI5 stop failed: {e}")


class _PyTTSX3Speaker:
    """Fallback speaker using pyttsx3 if win32com/SAPI5 is unavailable or fails."""
    def __init__(self):
        self._engine = None

    def speak(self, text: str):
        try:
            import pyttsx3
            if self._engine is None:
                self._engine = pyttsx3.init()
            self._engine.say(text)
            self._engine.runAndWait()
        except Exception as e:
            logger.error(f"pyttsx3 speak failed: {e}")

    def stop(self):
        try:
            if self._engine:
                self._engine.stop()
        except Exception as e:
            logger.debug(f"pyttsx3 stop failed: {e}")


class VoiceManager:
    def __init__(self, config=None):
        if _WIN32COM_OK:
            self._speaker = _SAPI5Speaker()
        elif _check_pyttsx3():
            self._speaker = _PyTTSX3Speaker()
            logger.info("Using pyttsx3 fallback speaker.")
        else:
            self._speaker = None
        self._david_token: Optional[str] = None
        self._zira_token:  Optional[str] = None
        self._find_voice_tokens()

        self.speech_queue: queue.Queue = queue.Queue()
        self.is_listening = False
        self._tts_thread: Optional[threading.Thread] = None
        self._stt_thread: Optional[threading.Thread] = None
        self._running = False
        self._stt_ready = False
        self.on_command_received = None

        self.enabled = True
        # chat_tts_muted: lightweight mute for typed-chat TTS, toggled by frontend
        # Does NOT disable mic/STT or the co-pilot voice loop
        self.chat_tts_muted = False
        self.voice_profile = DEFAULT_PROFILE
        self.speech_provider = "google"
        self.nvidia_api_key = ""
        self.elevenlabs_api_key = ""
        self.elevenlabs_voice_id = "21m00Tcm4TlvDq8ikWAM"

        self._pending_update: Optional[tuple] = None
        self._pending_lock = threading.Lock()

        # Voice Macro Engine (Feature 3)
        try:
            from voice.voice_macros import VoiceMacroEngine
            self.macro_engine = VoiceMacroEngine(config=config)
            logger.info(f"[Voice] Macro engine initialized with {len(self.macro_engine.list_macros())} macros")
        except Exception as e:
            self.macro_engine = None
            logger.debug(f"[Voice] Macro engine not available: {e}")

        try:
            pygame.mixer.pre_init(44100, -16, 2, 4096)
            pygame.mixer.init()
        except Exception as e:
            logger.warning(f"Failed to initialize pygame mixer: {e}")

        self.recognizer = sr.Recognizer()
        self.recognizer.pause_threshold = 2.0  # Allow natural conversational pauses without aggressive early cut-offs
        self.recognizer.non_speaking_duration = 1.5 # Wait longer before assuming end of phrase
        self.recognizer.dynamic_energy_threshold = True # Adapt to changing mic volume automatically
        self.recognizer.energy_threshold = 400
        self._is_speaking = False
        self.apply_config(config or {})

    def _find_voice_tokens(self):
        if not _WIN32COM_OK: return
        try:
            import pythoncom
            pythoncom.CoInitialize()
            speaker = win32com.client.Dispatch("SAPI.SpVoice")
            voices = speaker.GetVoices()
            
            # Robust matching: look for names first, then gender attributes
            for i in range(voices.Count):
                v = voices.Item(i)
                desc = v.GetDescription().lower()
                
                # Male: David, Mark, etc.
                if self._david_token is None:
                    if any(k in desc for k in ["david", "mark", "paul", "male", "guy"]):
                        self._david_token = v.Id
                        logger.info(f"Pinned Male voice: {v.GetDescription()}")

                # Female: Zira, Hazel, etc.
                if self._zira_token is None:
                    if any(k in desc for k in ["zira", "hazel", "susan", "female", "girl"]):
                        self._zira_token = v.Id
                        logger.info(f"Pinned Female voice: {v.GetDescription()}")

            # Absolute Fallback: use first 2 voices if tokens still None
            if self._david_token is None and voices.Count > 0:
                self._david_token = voices.Item(0).Id
            if self._zira_token is None:
                self._zira_token = voices.Item(1).Id if voices.Count > 1 else self._david_token
        except Exception as e:
            logger.warning(f"Voice discovery error: {e}")

    def _profile_params(self, profile: str) -> tuple:
        key = profile.lower().strip()
        # Find match by substring for robustness (e.g. "Tactical" matches "Tactical (Male)")
        match_key = DEFAULT_PROFILE
        for p_key in PROFILES:
            if p_key in key:
                match_key = p_key
                break
        
        gender, rate, vol, pitch, provider = PROFILES.get(match_key, PROFILES[DEFAULT_PROFILE])
        token = self._david_token if gender == "male" else self._zira_token
        return token, rate, vol, pitch, provider

    def apply_config(self, config: dict):
        self.config = config
        vc = config.get("voice", {})
        agent_cfg = config.get("ai_agent", {})
        
        prev_enabled = getattr(self, "enabled", True)
        self.enabled = vc.get("enabled", True)
        
        if prev_enabled and not self.enabled:
            logger.info("Voice synthesis disabled. Interrupting active audio and stopping listeners.")
            self.stop_speaking()
            self.stop_listening()
        elif not prev_enabled and self.enabled:
            logger.info("Voice synthesis enabled. Re-starting voice services.")
            self.start()
            
        self.speech_provider = agent_cfg.get("speech_provider", "google")
        self.elevenlabs_api_key = os.environ.get("ELEVENLABS_API_KEY", "")
        self.elevenlabs_voice_id = os.environ.get("ELEVENLABS_VOICE_ID", "21m00Tcm4TlvDq8ikWAM")
        
        new_profile = vc.get("profile", "Aero (Cloud)")
        self.voice_profile = new_profile
        token, p_rate, vol, p_pitch, provider = self._profile_params(new_profile)
        
        # Only override the profile's rate if the user set a custom rate in the spinner
        custom_rate = vc.get("tts_rate", 175)
        if custom_rate != 175:
            delta = round((custom_rate - 175) / 17)
            final_rate = p_rate + delta
        else:
            final_rate = p_rate
            
        final_rate = max(-10, min(10, final_rate))
            
        with self._pending_lock:
            self._pending_update = (token, final_rate, vol, p_pitch)
        
        logger.info(f"Applied Profile: {new_profile} | Rate: {final_rate} | Pitch: {p_pitch}")

    def _apply_pending_update(self):
        with self._pending_lock:
            update = self._pending_update
            self._pending_update = None
        if update and self._speaker:
            token, rate, vol, pitch = update
            if token: self._speaker.set_voice(token)
            self._speaker.set_rate(rate)
            self._speaker.set_volume(vol)
            self._speaker.set_pitch(pitch)

    def start(self):
        if not self.enabled: return
        if not self._running:
            self._running = True
            self._tts_thread = threading.Thread(target=self._tts_loop, daemon=True, name="VoiceTTS")
            self._tts_thread.start()
        self.start_listening()

    def start_listening(self):
        if not self.enabled or self.is_listening: return
        self.is_listening = True
        if self._stt_thread and self._stt_thread.is_alive():
            logger.info("VoiceSTT thread already alive and running, skipping spawn.")
            return
        self._stt_thread = threading.Thread(target=self._stt_loop, daemon=True, name="VoiceSTT")
        self._stt_thread.start()

    def stop_listening(self):
        self.is_listening = False

    def stop(self):
        self._running = False
        self.is_listening = False
        self.stop_speaking()

    def stop_speaking(self):
        """Immediately interrupt active text-to-speech."""
        try:
            # Clear pending queue
            with self.speech_queue.mutex:
                self.speech_queue.queue.clear()
            # Stop pygame if playing
            try:
                import pygame
                if pygame.mixer.get_init() and pygame.mixer.music.get_busy():
                    pygame.mixer.music.stop()
            except Exception:
                pass
            # Stop the speaker wrapper (SAPI5 or pyttsx3)
            if self._speaker and hasattr(self._speaker, "stop"):
                try:
                    self._speaker.stop()
                except Exception:
                    pass
            logger.info("Voice TTS interrupted.")
        except Exception as e:
            logger.error(f"Failed to stop speaking: {e}")

    def mute_chat_tts(self):
        """Mute TTS for typed chat responses (does not affect mic/co-pilot)."""
        self.chat_tts_muted = True
        # Clear the speech queue and stop pygame audio — but do NOT call self._speaker.stop()
        # because SAPI5's Speak("", 0x2) purge can corrupt the COM state for future calls.
        try:
            with self.speech_queue.mutex:
                self.speech_queue.queue.clear()
        except Exception:
            pass
        try:
            if pygame.mixer.get_init() and pygame.mixer.music.get_busy():
                pygame.mixer.music.stop()
        except Exception:
            pass
        logger.info("Chat TTS muted.")

    def unmute_chat_tts(self):
        """Unmute TTS for typed chat responses and ensure the TTS thread is alive."""
        self.chat_tts_muted = False
        # Re-apply voice profile config so the correct voice plays immediately
        with self._pending_lock:
            if hasattr(self, 'config') and self.config:
                vc = self.config.get('voice', {})
                new_profile = vc.get('profile', 'Aero (Cloud)')
                self.voice_profile = new_profile
                token, p_rate, vol, p_pitch, _ = self._profile_params(new_profile)
                self._pending_update = (token, p_rate, vol, p_pitch)
        # Restart TTS thread if it has died
        if self._tts_thread is None or not self._tts_thread.is_alive():
            logger.warning("TTS thread was dead — restarting.")
            self._running = True
            self._tts_thread = threading.Thread(target=self._tts_loop, daemon=True, name="VoiceTTS")
            self._tts_thread.start()
        logger.info("Chat TTS unmuted.")

    def speak(self, text: str, force: bool = False):
        if not self.enabled: return
        if self.chat_tts_muted and not force: return
        # Auto-heal: restart TTS thread if it died unexpectedly
        if self._running and (self._tts_thread is None or not self._tts_thread.is_alive()):
            logger.warning("TTS thread found dead in speak() — restarting.")
            self._tts_thread = threading.Thread(target=self._tts_loop, daemon=True, name="VoiceTTS")
            self._tts_thread.start()
        
        # Remove markdown formatting characters (*, _, `, ~, #) that TTS might pronounce
        clean_text = re.sub(r'[*_`~#]', '', text)
        
        try:
            import emoji
            clean_text = emoji.replace_emoji(clean_text, replace='')
        except ImportError:
            pass
        
        self.speech_queue.put(clean_text)

    def _tts_loop(self):
        try: pygame.mixer.init()
        except: pass
        self._apply_pending_update()
        while self._running:
            try:
                text = self.speech_queue.get(timeout=0.5)
                self._apply_pending_update()
                
                # Discard items queued before the user muted TTS
                if self.chat_tts_muted:
                    continue
                
                self._is_speaking = True
                try:
                    # Get engine info for this profile
                    _, _, _, _, pref_provider = self._profile_params(self.voice_profile)
                    
                    logger.info(f"Speaking: {text[:60]}... | Mode: {pref_provider}")
                    spoken = False
                    
                    # 1. ElevenLabs (if key present)
                    if self.elevenlabs_api_key:
                        spoken = self._speak_elevenlabs(text)
                    
                    # 2. Google TTS (Only if preferred OR global is Google AND NOT a male SAPI5 profile)
                    if not spoken:
                        use_google = (pref_provider == "google") or (self.speech_provider == "google" and pref_provider != "sapi5")
                        if use_google:
                            spoken = self._speak_google(text)
                    
                    # 3. Local SAPI5 (fallback or primary for Tactical/Valkyrie)
                    if not spoken:
                        self._speak_sapi5(text)
                finally:
                    self._is_speaking = False
                    
            except queue.Empty:
                self._apply_pending_update()
            except Exception as e:
                logger.error(f"TTS Loop error: {e}")

    def _split_text(self, text: str, max_chars: int = 180) -> list:
        # Split text into chunks of under max_chars characters safely at word boundaries
        words = text.split()
        chunks = []
        current_chunk = []
        current_len = 0
        for word in words:
            if current_len + len(word) + 1 > max_chars:
                if current_chunk:
                    chunks.append(" ".join(current_chunk))
                current_chunk = [word]
                current_len = len(word)
            else:
                current_chunk.append(word)
                current_len += len(word) + 1
        if current_chunk:
            chunks.append(" ".join(current_chunk))
        return chunks

    def _speak_google(self, text: str) -> bool:
        try:
            chunks = self._split_text(text, 180)
            for i, chunk in enumerate(chunks):
                if not self._running or not self.enabled or self.chat_tts_muted: 
                    break
                url = "https://translate.google.com/translate_tts"
                params = {"ie": "UTF-8", "q": chunk, "tl": "en", "client": "tw-ob"}
                r = requests.get(url, params=params, timeout=5)
                if r.status_code != 200: 
                    # If Google fails, speak remaining chunks with fallback to avoid repeating
                    remaining = " ".join(chunks[i:])
                    if remaining:
                        self._speak_sapi5(remaining)
                    return True # Return true so caller doesn't re-speak the whole text
                with tempfile.NamedTemporaryFile(delete=False, suffix=".mp3") as tmp:
                    tmp.write(r.content)
                    tmp_path = tmp.name
                try:
                    pygame.mixer.music.load(tmp_path)
                    pygame.mixer.music.play()
                    while pygame.mixer.music.get_busy() and self._running and self.enabled and not self.chat_tts_muted:
                        time.sleep(0.05)
                finally:
                    try:
                        pygame.mixer.music.unload()
                        os.remove(tmp_path)
                    except: pass
            return True
        except Exception as e:
            logger.error(f"Google TTS speak failed: {e}")
            return False

    def _speak_sapi5(self, text: str):
        if self._speaker:
            try:
                self._speaker.speak(text)
            except Exception as e:
                logger.error(f"Primary speaker failed, attempting pyttsx3 fallback: {e}")
                self._speak_pyttsx3_directly(text)
        else:
            self._speak_pyttsx3_directly(text)

    def _speak_pyttsx3_directly(self, text: str):
        try:
            import pyttsx3
            engine = pyttsx3.init()
            engine.say(text)
            engine.runAndWait()
        except Exception as e:
            logger.error(f"Direct pyttsx3 fallback speak failed: {e}")

    def _speak_elevenlabs(self, text: str) -> bool:
        try:
            url = f"https://api.elevenlabs.io/v1/text-to-speech/{self.elevenlabs_voice_id}"
            headers = {"xi-api-key": self.elevenlabs_api_key, "Content-Type": "application/json", "Accept": "audio/mpeg"}
            payload = {"text": text, "model_id": "eleven_multilingual_v2", "voice_settings": {"stability": 0.5, "similarity_boost": 0.75}}
            r = requests.post(url, headers=headers, json=payload, timeout=10)
            if r.status_code != 200: return False
            with tempfile.NamedTemporaryFile(delete=False, suffix=".mp3") as tmp:
                tmp.write(r.content)
                tmp_path = tmp.name
            try:
                pygame.mixer.music.load(tmp_path)
                pygame.mixer.music.play()
                while pygame.mixer.music.get_busy(): time.sleep(0.1)
                return True
            finally:
                try:
                    pygame.mixer.music.unload()
                    os.remove(tmp_path)
                except: pass
        except: return False

    def _stt_loop(self):
        try:
            with sr.Microphone() as source:
                self.recognizer.adjust_for_ambient_noise(source, duration=0.5)
                self.recognizer.dynamic_energy_threshold = False
                self._stt_ready = True
                while self._running and self.is_listening:
                    try:
                        if getattr(self, '_is_speaking', False):
                            time.sleep(0.1)
                            continue

                        audio = self.recognizer.listen(source, timeout=1.0)
                        
                        if not self.is_listening or getattr(self, '_is_speaking', False):
                            # Ignore audio captured while TTS is speaking (prevents feedback loops)
                            continue

                        # Dispatch transcription to a background thread to avoid blocking the mic
                        def _transcribe_and_dispatch(audio_data):
                            text = self._transcribe(audio_data)
                            if text and len(text.strip()) > 1:
                                # Final check to ensure we aren't responding to our own TTS
                                if getattr(self, '_is_speaking', False): return
                                logger.info(f"[VOICE] STT: \"{text}\"")
                                if self.on_command_received: self.on_command_received(text)
                                
                        t = threading.Thread(target=_transcribe_and_dispatch, args=(audio,), daemon=True)
                        t.start()
                        
                    except sr.WaitTimeoutError: continue
                    except sr.UnknownValueError: continue
                    except sr.RequestError as e:
                        logger.error(f"STT API error: {e}")
                        time.sleep(2.0)
        except: self._stt_ready = False

    def _transcribe(self, audio_data) -> Optional[str]:
        try: 
            return self.recognizer.recognize_google(audio_data, language="en-US")
        except Exception as e:
            # Sphinx fallback is disabled because it severely hallucinates random text from background noise
            logger.debug(f"Google STT failed: {e}")
            return None

    def test_voice(self, profile: Optional[str] = None) -> bool:
        if profile:
            token, rate, vol, pitch, provider = self._profile_params(profile)
            with self._pending_lock: self._pending_update = (token, rate, vol, pitch)
            self.voice_profile = profile
        self.speak(f"Mission Control voice test. Profile active: {self.voice_profile}.", force=True)
        return True
