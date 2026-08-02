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
    "tactical (male)":    ("male",  -1,  100,  0, "piper"),
    "valkyrie (agile)":   ("female", 2,  100,  5, "piper"),
    "intel (synthetic)":  ("female", 1,   80, -3, "piper"),
    "overwatch (heavy)":  ("male",  -2,  100, -5, "piper"),
}
DEFAULT_PROFILE = "aero (cloud)"








class VoiceManager:
    def __init__(self, config=None):
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
        
        self.bridge = None # For frontend telemetry

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

    def _profile_params(self, profile: str) -> tuple:
        key = profile.lower().strip()
        # Find match by substring for robustness (e.g. "Tactical" matches "Tactical (Male)")
        match_key = DEFAULT_PROFILE
        for p_key in PROFILES:
            if key in p_key:
                match_key = p_key
                break
        
        gender, rate, vol, pitch, provider = PROFILES.get(match_key, PROFILES[DEFAULT_PROFILE])
        return gender, rate, vol, pitch, provider

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
            try:
                token, rate, vol, pitch = update
                if token: self._speaker.set_voice(token)
                self._speaker.set_rate(rate)
                self._speaker.set_volume(vol)
                self._speaker.set_pitch(pitch)
            except Exception as e:
                logger.error(f"Failed to apply pending voice update: {e}")

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
        # If we have an active stream, close it to immediately unblock recognizer.listen()
        if hasattr(self, '_active_mic_stream') and self._active_mic_stream:
            try:
                self._active_mic_stream.close()
                self._active_mic_stream = None
            except:
                pass
        if self.bridge:
            self.bridge.update_state({"agent_response": "Voice note aborted."})

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
            
            logger.info("Voice TTS interrupted.")
        except Exception as e:
            logger.error(f"Failed to stop speaking: {e}")

    def mute_chat_tts(self):
        """Mute TTS for typed chat responses (does not affect mic/co-pilot)."""
        self.chat_tts_muted = True
        # Clear the speech queue and stop pygame audio.
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
            logger.info("TTS worker thread auto-initialized.")
            self._running = True
            self._tts_thread = threading.Thread(target=self._tts_loop, daemon=True, name="VoiceTTS")
            self._tts_thread.start()
        logger.info("Chat TTS unmuted.")

    def speak(self, text: str, force: bool = False):
        if not self.enabled: return
        if self.chat_tts_muted and not force: return
        # Auto-heal: restart TTS thread if it died unexpectedly
        if self._running and (self._tts_thread is None or not self._tts_thread.is_alive()):
            logger.info("TTS worker thread auto-restored in speak().")
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
        try:
            import pygame
            pygame.mixer.init()
        except Exception:
            pass

        self._apply_pending_update()

        while self._running:
            try:
                try:
                    text = self.speech_queue.get(timeout=0.5)
                except queue.Empty:
                    self._apply_pending_update()
                    continue

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
                    
                    # Determine provider based on global settings first
                    active_provider = self.speech_provider
                    
                    if active_provider == "elevenlabs" and self.elevenlabs_api_key:
                        spoken = self._speak_elevenlabs(text)
                    elif active_provider == "edge":
                        spoken = self._speak_edge(text)
                    elif active_provider == "piper":
                        spoken = self._speak_piper(text)
                    elif active_provider == "google":
                        spoken = self._speak_google(text)
                    
                    # Fallback if global failed or was invalid
                    if not spoken:
                        logger.warning(f"No TTS output for text: {text}")
                        if self.elevenlabs_api_key and pref_provider == "elevenlabs":
                            spoken = self._speak_elevenlabs(text)
                        
                        if not spoken and (pref_provider == "google" or active_provider == "google"):
                            spoken = self._speak_google(text)
                            
                        if not spoken:
                            spoken = self._speak_piper(text)
                        
                        
                finally:
                    self._is_speaking = False
            except Exception as e:
                logger.debug(f"TTS Loop iteration error: {e}")
                time.sleep(0.1)

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

    def _speak_edge(self, text: str) -> bool:
        try:
            import edge_tts
            import asyncio
            
            token, rate, vol, pitch, provider = self._profile_params(self.voice_profile)
            # Use male voice if profile is male, else female
            voice = "en-US-ChristopherNeural" if token == self._david_token else "en-US-AriaNeural"
            
            rate_str = "+0%"
            if rate != 0:
                rate_pct = rate * 10
                rate_str = f"+{rate_pct}%" if rate > 0 else f"{rate_pct}%"
                
            pitch_str = "+0Hz"
            if pitch != 0:
                pitch_str = f"+{pitch}Hz" if pitch > 0 else f"{pitch}Hz"
                
            chunks = self._split_text(text, 180)
            
            for chunk in chunks:
                if not self._running or not self.enabled or self.chat_tts_muted:
                    break
                    
                async def generate_edge(text_chunk):
                    communicate = edge_tts.Communicate(text_chunk, voice, rate=rate_str, pitch=pitch_str)
                    with tempfile.NamedTemporaryFile(delete=False, suffix=".mp3") as tmp:
                        await communicate.save(tmp.name)
                        return tmp.name
                        
                tmp_path = asyncio.run(generate_edge(chunk))
                try:
                    import pygame
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
            logger.error(f"Edge TTS speak failed: {e}")
            return False

    def _speak_piper(self, text: str) -> bool:
        try:
            from piper.voice import PiperVoice
            import wave
            
            model_dir = Path("models/piper")
            model_dir.mkdir(parents=True, exist_ok=True)
            
            model_path = model_dir / "en_US-lessac-low.onnx"
            config_path = model_dir / "en_US-lessac-low.onnx.json"
            
            if not model_path.exists() or not config_path.exists():
                logger.info("Downloading Piper TTS model...")
                model_url = "https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0/en/en_US/lessac/low/en_US-lessac-low.onnx"
                config_url = "https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0/en/en_US/lessac/low/en_US-lessac-low.onnx.json"
                
                with open(model_path, "wb") as f:
                    f.write(requests.get(model_url, timeout=30).content)
                with open(config_path, "wb") as f:
                    f.write(requests.get(config_url, timeout=30).content)
            
            voice = PiperVoice.load(str(model_path), str(config_path))
            chunks = self._split_text(text, 180)
            
            for chunk in chunks:
                if not self._running or not self.enabled or self.chat_tts_muted:
                    break
                
                with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as tmp:
                    with wave.open(tmp.name, "wb") as wav_file:
                        voice.synthesize(chunk, wav_file)
                    
                    try:
                        import pygame
                        pygame.mixer.music.load(tmp.name)
                        pygame.mixer.music.play()
                        while pygame.mixer.music.get_busy() and self._running and self.enabled and not self.chat_tts_muted:
                            time.sleep(0.05)
                    finally:
                        try:
                            pygame.mixer.music.unload()
                            os.remove(tmp.name)
                        except: pass
            return True
        except Exception as e:
            logger.error(f"Piper TTS speak failed: {e}")
            return False

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

                        # Store stream reference for forcible abort
                        self._active_mic_stream = getattr(source, 'stream', None)
                        
                        audio = self.recognizer.listen(source, timeout=1.0, phrase_time_limit=15.0)
                        
                        self._active_mic_stream = None
                        
                        if not self.is_listening or getattr(self, '_is_speaking', False):
                            # Ignore audio captured while TTS is speaking (prevents feedback loops)
                            continue

                        if self.bridge:
                            self.bridge.update_state({"agent_response": "🎙️ Processing audio..."})

                        # Dispatch transcription to a background thread to avoid blocking the mic
                        def _transcribe_and_dispatch(audio_data):
                            text = self._transcribe(audio_data)
                            if text and len(text.strip()) > 1:
                                # Final check to ensure we aren't responding to our own TTS
                                if getattr(self, '_is_speaking', False): return
                                logger.info(f"[VOICE] STT: \"{text}\"")
                                if self.on_command_received: self.on_command_received(text)
                                if self.bridge:
                                    self.bridge.update_state({"agent_response": f"🎙️ You: {text}"})
                                
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
