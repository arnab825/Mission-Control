import pygame
import requests
import tempfile
import time

try:
    pygame.mixer.init()
    print("Pygame mixer initialized successfully.")
    r = requests.get('https://translate.google.com/translate_tts', params={'ie': 'UTF-8', 'q': 'hello world, this is a test of the audio system.', 'tl': 'en', 'client': 'tw-ob'})
    with tempfile.NamedTemporaryFile(delete=False, suffix='.mp3') as tmp:
        tmp.write(r.content)
        tmp_path = tmp.name
    print(f"Downloaded mp3 to {tmp_path}")
    pygame.mixer.music.load(tmp_path)
    pygame.mixer.music.play()
    print("Playing...")
    t0 = time.time()
    loops = 0
    was_busy = False
    while time.time() - t0 < 5:
        busy = pygame.mixer.music.get_busy()
        if busy:
            was_busy = True
        loops += 1
        time.sleep(0.1)
    print(f"Finished playback check. Was busy: {was_busy}, Loops: {loops}, Duration: {time.time() - t0:.2f}s")
except Exception as e:
    print(f"Error occurred: {e}")
