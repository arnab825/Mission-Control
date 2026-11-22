"""
Unit tests for the Gameplay Video Recorder and Recording Features.
Tests continuous recording, rolling highlight buffer, file management,
bridge command validation, and hardware readiness evaluation.
"""

import os
import shutil
import tempfile
import time
from pathlib import Path
import numpy as np
import pytest

from capture.video_recorder import VideoRecorder
from core.command_schemas import validate_bridge_command
from system.hardware_readiness import GamingReadinessEngine


@pytest.fixture
def temp_recordings_dir():
    temp_dir = tempfile.mkdtemp(prefix="mc_test_recordings_")
    yield temp_dir
    if os.path.exists(temp_dir):
        shutil.rmtree(temp_dir, ignore_errors=True)


def test_video_recorder_init(temp_recordings_dir):
    config = {
        "recording": {
            "save_directory": temp_recordings_dir,
            "fps": 30,
            "rolling_buffer_seconds": 10.0,
        }
    }
    recorder = VideoRecorder(config=config)
    assert recorder.save_dir == temp_recordings_dir
    assert recorder.target_fps == 30
    assert not recorder.is_recording
    status = recorder.get_status()
    assert not status["is_recording"]
    assert status["buffer_frames"] == 0


def test_video_recorder_rolling_buffer(temp_recordings_dir):
    config = {
        "recording": {
            "save_directory": temp_recordings_dir,
            "rolling_buffer_seconds": 5.0,
        }
    }
    recorder = VideoRecorder(config=config)
    # Generate dummy frame
    dummy = np.zeros((240, 320, 3), dtype=np.uint8)

    # Push frames simulating a stream
    start_t = time.time()
    for i in range(10):
        recorder.add_frame(dummy, timestamp=start_t + (i * 0.1))

    status = recorder.get_status()
    assert status["buffer_frames"] > 0
    assert status["buffer_seconds"] > 0.0


def test_video_recorder_continuous_recording(temp_recordings_dir):
    config = {
        "recording": {
            "save_directory": temp_recordings_dir,
            "fps": 30,
        }
    }
    recorder = VideoRecorder(config=config)
    res_start = recorder.start_recording(filename="test_gameplay.mp4", fps=30)
    assert res_start["success"]
    assert res_start["is_recording"]
    assert recorder.is_recording

    # Feed frames to active recording
    dummy = np.full((240, 320, 3), 128, dtype=np.uint8)
    now = time.time()
    for i in range(15):
        recorder.add_frame(dummy, timestamp=now + (i * 0.033))
        time.sleep(0.01)

    time.sleep(0.1)
    res_stop = recorder.stop_recording()
    assert res_stop["success"]
    assert not res_stop["is_recording"]
    assert not recorder.is_recording

    # File should exist on disk
    expected_file = os.path.join(temp_recordings_dir, "test_gameplay.mp4")
    assert os.path.exists(expected_file)
    assert os.path.getsize(expected_file) > 0


def test_video_recorder_save_highlight(temp_recordings_dir):
    config = {
        "recording": {
            "save_directory": temp_recordings_dir,
            "rolling_buffer_seconds": 10.0,
        }
    }
    recorder = VideoRecorder(config=config)
    dummy = np.ones((240, 320, 3), dtype=np.uint8) * 200

    now = time.time()
    for i in range(25):
        recorder.add_frame(dummy, timestamp=now + (i * 0.05))

    res_highlight = recorder.save_highlight(duration_secs=5, filename="test_clip.mp4")
    assert res_highlight["success"]
    assert res_highlight["file_name"] == "test_clip.mp4"

    # Give background thread time to finish writing
    time.sleep(0.5)
    expected_clip = os.path.join(temp_recordings_dir, "test_clip.mp4")
    assert os.path.exists(expected_clip)
    assert os.path.getsize(expected_clip) > 0


def test_video_recorder_file_management(temp_recordings_dir):
    config = {
        "recording": {
            "save_directory": temp_recordings_dir,
        }
    }
    recorder = VideoRecorder(config=config)

    # Create dummy mp4 files
    file1 = os.path.join(temp_recordings_dir, "clip1.mp4")
    file2 = os.path.join(temp_recordings_dir, "highlight_2.mp4")
    with open(file1, "wb") as f:
        f.write(b"dummy_data_1")
    with open(file2, "wb") as f:
        f.write(b"dummy_data_2")

    items = recorder.list_recordings()
    assert len(items) == 2
    names = [i["file_name"] for i in items]
    assert "clip1.mp4" in names
    assert "highlight_2.mp4" in names

    # Delete safe file
    del_res = recorder.delete_recording("clip1.mp4")
    assert del_res["success"]
    assert not os.path.exists(file1)

    # Delete non-existent
    del_fail = recorder.delete_recording("ghost.mp4")
    assert not del_fail["success"]


def test_command_schemas_recording_validation():
    # Valid start recording
    valid, res, err = validate_bridge_command("start_recording", {"fps": 60, "quality": "high"})
    assert valid
    assert res.fps == 60

    # Invalid start recording (extra keys forbidden)
    valid, res, err = validate_bridge_command("start_recording", {"fps": 60, "unauthorized_extra": True})
    assert not valid

    # Valid save highlight
    valid, res, err = validate_bridge_command("save_highlight", {"duration": 45})
    assert valid
    assert res.duration == 45

    # Valid delete recording
    valid, res, err = validate_bridge_command("delete_recording", {"filename": "clip.mp4"})
    assert valid
    assert res.filename == "clip.mp4"

    # Valid stop recording (empty payload)
    valid, res, err = validate_bridge_command("stop_recording", {})
    assert valid


def test_hardware_readiness_recording_feature_evaluation():
    engine = GamingReadinessEngine()
    features = engine._evaluate_features(
        gpu_eval={"status": "pass", "name": "NVIDIA GeForce RTX 5050 Laptop GPU"},
        cpu_eval={"status": "pass", "name": "Intel Core i7"}
    )
    feature_names = [f["name"] for f in features]
    assert "Recording Features" in feature_names

    rec_feat = next(f for f in features if f["name"] == "Recording Features")
    assert rec_feat["status"] == "Fully Supported"
    assert "Hardware video encoder" in rec_feat["reason"]


def test_video_recorder_screenshot_capture_and_management(temp_recordings_dir):
    screenshots_dir = os.path.join(temp_recordings_dir, "screenshots")
    config = {
        "recording": {
            "save_directory": temp_recordings_dir,
            "screenshots_directory": screenshots_dir,
        }
    }
    recorder = VideoRecorder(config=config)
    assert recorder.screenshots_dir == screenshots_dir

    # Push a test frame
    dummy_frame = np.full((720, 1280, 3), 200, dtype=np.uint8)
    recorder.add_frame(dummy_frame)

    # 1. Take screenshot
    shot_res = recorder.take_screenshot(filename="test_snap.png", format="png")
    assert shot_res["success"]
    assert shot_res["file_name"] == "test_snap.png"
    assert shot_res["width"] == 1280
    assert shot_res["height"] == 720
    assert shot_res["size_kb"] > 0
    assert shot_res["preview"].startswith("data:image/jpeg;base64,")

    expected_file = os.path.join(screenshots_dir, "test_snap.png")
    assert os.path.exists(expected_file)

    # 2. Take second screenshot (JPG)
    shot2_res = recorder.take_screenshot(filename="test_snap2.jpg", format="jpg")
    assert shot2_res["success"]
    assert os.path.exists(os.path.join(screenshots_dir, "test_snap2.jpg"))

    # 3. List screenshots
    shots = recorder.list_screenshots()
    assert len(shots) == 2
    names = [s["file_name"] for s in shots]
    assert "test_snap.png" in names
    assert "test_snap2.jpg" in names

    # 4. Delete screenshot
    del_res = recorder.delete_screenshot("test_snap.png")
    assert del_res["success"]
    assert not os.path.exists(expected_file)
    assert len(recorder.list_screenshots()) == 1


def test_command_schemas_screenshot_validation():
    # Valid take screenshot
    valid, res, err = validate_bridge_command("take_screenshot", {"filename": "snap.png", "format": "png"})
    assert valid
    assert res.filename == "snap.png"
    assert res.format == "png"

    # Extra key rejected
    valid, res, err = validate_bridge_command("take_screenshot", {"filename": "snap.png", "extra_bad": True})
    assert not valid

    # Valid delete screenshot
    valid, res, err = validate_bridge_command("delete_screenshot", {"filename": "snap.png"})
    assert valid
    assert res.filename == "snap.png"

    # Valid empty commands
    valid, res, err = validate_bridge_command("get_screenshots", {})
    assert valid
    valid, res, err = validate_bridge_command("open_screenshots_folder", {})
    assert valid
