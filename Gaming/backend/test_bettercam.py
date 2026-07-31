import time
import bettercam
print("Bettercam version:", getattr(bettercam, '__version__', 'unknown'))

try:
    cam = bettercam.create(output_color="BGR")
    print("Created cam:", cam)
    
    # Check start kwargs
    import inspect
    print("Start args:", inspect.signature(cam.start))
    print("Grab args:", inspect.signature(cam.grab))
    print("Has get_latest_frame:", hasattr(cam, 'get_latest_frame'))
    
    # Try grabbing
    frame = cam.grab()
    print("Grabbed frame shape:", frame.shape if frame is not None else "None")
    
    print("Starting video mode...")
    cam.start(target_fps=60, video_mode=True)
    time.sleep(1)
    frame2 = cam.get_latest_frame()
    print("Latest frame shape:", frame2.shape if frame2 is not None else "None")
    
    cam.stop()
except Exception as e:
    print("Error:", e)
