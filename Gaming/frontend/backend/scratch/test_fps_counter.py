import sys
import os
import time

# Ensure backend directory is in path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

try:
    from fps_counter.fps_counter_dx import fps_counter
    print("SUCCESS: Successfully imported fps_counter from fps_counter_dx!")
except Exception as e:
    print(f"FAILED: Failed to import fps_counter_dx: {e}")
    sys.exit(1)

def test_fps_counter():
    print("\n--- Resetting FPS Counter ---")
    fps_counter.reset()
    
    print("Initial stats:")
    print(f"  Frame count:     {fps_counter.frame_count}")
    print(f"  Average FPS:     {fps_counter.average_fps:.2f}")
    print(f"  Min Avg FPS:     {fps_counter.min_avg_fps:.2f}")
    print(f"  Max Avg FPS:     {fps_counter.max_avg_fps:.2f}")
    print(f"  Min FPS:         {fps_counter.min_fps:.2f}")
    print(f"  Max FPS:         {fps_counter.max_fps:.2f}")
    print(f"  1% Low FPS:      {fps_counter.one_percent_low:.2f}")
    
    # Simulate 200 frames at roughly 100 FPS (10ms sleep)
    print("\n--- Simulating 200 frames at ~100 FPS (10ms intervals) ---")
    
    # We need a warm-up tick since the first tick initialization doesn't calculate dt.
    fps_counter.update()
    time.sleep(0.01)
    
    for i in range(200):
        # Introduce occasional slow frames to test 1% lows
        if i > 0 and i % 50 == 0:
            time.sleep(0.1)  # 10 FPS frame
        else:
            time.sleep(0.01) # 100 FPS frame
            
        fps_counter.update()
        
        if (i + 1) % 50 == 0:
            print(f"Frame {i+1}/200:")
            print(f"  Average FPS: {fps_counter.average_fps:.2f}")
            print(f"  1% Low FPS:  {fps_counter.one_percent_low:.2f}")

    print("\nFinal Stats:")
    print(f"  Frame count:     {fps_counter.frame_count}")
    print(f"  Average FPS:     {fps_counter.average_fps:.2f}")
    print(f"  Min Avg FPS:     {fps_counter.min_avg_fps:.2f}")
    print(f"  Max Avg FPS:     {fps_counter.max_avg_fps:.2f}")
    print(f"  Min FPS:         {fps_counter.min_fps:.2f}")
    print(f"  Max FPS:         {fps_counter.max_fps:.2f}")
    print(f"  1% Low FPS:      {fps_counter.one_percent_low:.2f}")
    
    # Verify that values are non-zero and reasonable
    if fps_counter.frame_count != 200:
        print("FAIL: Frame count should be 200.")
        return False
    if fps_counter.average_fps < 40 or fps_counter.average_fps > 120:
        print("FAIL: Average FPS is outside expected range (40-120).")
        return False
    if fps_counter.one_percent_low <= 0 or fps_counter.one_percent_low >= fps_counter.average_fps:
        print("FAIL: 1% low FPS is invalid.")
        return False
    
    print("\nSUCCESS: Native FPS counter QPC measurements are active and working correctly!")
    return True

if __name__ == "__main__":
    test_fps_counter()
