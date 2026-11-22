"""
Unit tests for the Vision Pipeline Enhancements:
- Interactive Region Selector Commands & Validation
- Per-Class YOLO Confidence & Filter Controls
- Spatial Detection Heatmap Aggregation & Reset
- Custom On-Demand OCR Triggering
- Frame Degradation Monitoring
"""

import pytest
from core.command_schemas import validate_bridge_command


def test_set_vision_region_validation():
    # Valid custom region
    valid_payload = {
        "region": {
            "left": 100,
            "top": 50,
            "width": 1280,
            "height": 720
        }
    }
    is_valid, validated, err = validate_bridge_command("set_vision_region", valid_payload)
    assert is_valid is True
    assert err is None
    assert validated.region["left"] == 100
    assert validated.region["width"] == 1280

    # Valid reset region (null)
    is_valid, validated, err = validate_bridge_command("set_vision_region", {"region": None})
    assert is_valid is True
    assert validated.region is None

    # Empty payload (treated as null region)
    is_valid, validated, err = validate_bridge_command("set_vision_region", {})
    assert is_valid is True

    # Rejection of extra unknown keys (extra="forbid")
    invalid_payload = {
        "region": {"left": 0, "top": 0, "width": 500, "height": 500},
        "unexpected_key": "illegal"
    }
    is_valid, validated, err = validate_bridge_command("set_vision_region", invalid_payload)
    assert is_valid is False
    assert err is not None


def test_set_vision_classes_validation():
    valid_payload = {
        "filters": {
            "person": 0.35,
            "vehicle": 0.50,
            "weapon": 0.40
        },
        "enabled_classes": ["person", "weapon"]
    }
    is_valid, validated, err = validate_bridge_command("set_vision_classes", valid_payload)
    assert is_valid is True
    assert err is None
    assert validated.filters["person"] == 0.35
    assert "weapon" in validated.enabled_classes

    # Extra unpermitted fields rejected
    invalid_payload = {
        "filters": {"person": 0.5},
        "unauthorized_field": True
    }
    is_valid, validated, err = validate_bridge_command("set_vision_classes", invalid_payload)
    assert is_valid is False
    assert err is not None


def test_trigger_custom_ocr_validation():
    # Valid preset ROI
    is_valid, validated, err = validate_bridge_command("trigger_custom_ocr", {"roi_name": "subtitle"})
    assert is_valid is True
    assert validated.roi_name == "subtitle"

    # Valid coordinate fractions ROI
    is_valid, validated, err = validate_bridge_command(
        "trigger_custom_ocr",
        {"roi_coords": [0.1, 0.75, 0.9, 0.95]}
    )
    assert is_valid is True
    assert validated.roi_coords == [0.1, 0.75, 0.9, 0.95]

    # Rejection of extra fields
    is_valid, validated, err = validate_bridge_command(
        "trigger_custom_ocr",
        {"roi_name": "quest", "bad_param": 123}
    )
    assert is_valid is False
    assert err is not None


def test_detection_heatmap_commands_validation():
    # get_detection_heatmap
    is_valid, _, err = validate_bridge_command("get_detection_heatmap", {})
    assert is_valid is True

    # reset_detection_heatmap
    is_valid, _, err = validate_bridge_command("reset_detection_heatmap", {})
    assert is_valid is True

    # Rejection of extra fields on reset
    is_valid, _, err = validate_bridge_command("reset_detection_heatmap", {"force": True})
    assert is_valid is False


def test_pipeline_host_vision_methods():
    from unittest.mock import MagicMock
    from core.pipeline_host import GamingAssistantPipeline

    # Instantiate pipeline with mocked external hardware components
    mock_config = {
        "headless": True,
        "pipeline": {"vision_hz": 30},
        "capture": {"fps_cap_limit": 60, "cap_fps": True},
        "privacy": {"enabled": False}
    }
    pipeline = GamingAssistantPipeline.__new__(GamingAssistantPipeline)
    import threading
    pipeline._state_lock = threading.Lock()
    pipeline._game_state = {}
    pipeline.config = mock_config
    pipeline.capture = MagicMock()
    pipeline.capture_hz = 60
    pipeline.vision_hz = 30
    pipeline.vision_class_filters = {}
    pipeline.vision_enabled_classes = None
    pipeline._detection_heatmap_grid = [[0 for _ in range(32)] for _ in range(18)]
    pipeline._detection_heatmap_total = 0
    pipeline._fps_drop_streak = 0
    pipeline._last_degradation_alert = None
    pipeline.ocr_reader = None

    # Test set_capture_region
    target_region = {"left": 200, "top": 150, "width": 800, "height": 600}
    res = pipeline.set_capture_region(target_region)
    assert res["success"] is True
    assert pipeline.capture_region == target_region
    assert pipeline._game_state["capture_region"] == target_region
    pipeline.capture.set_region.assert_called_with(target_region)

    # Test set_vision_classes
    filters = {"person": 0.42, "enemy": 0.55}
    enabled = ["person", "enemy"]
    res = pipeline.set_vision_classes(filters=filters, enabled_classes=enabled)
    assert res["success"] is True
    assert pipeline.vision_class_filters == filters
    assert pipeline.vision_enabled_classes == {"person", "enemy"}
    assert pipeline._game_state["vision_class_filters"] == filters

    # Test heatmap accumulation & retrieval
    pipeline._detection_heatmap_grid[5][10] = 7
    pipeline._detection_heatmap_grid[10][20] = 12
    pipeline._detection_heatmap_total = 19

    heatmap = pipeline.get_detection_heatmap()
    assert heatmap["width"] == 32
    assert heatmap["height"] == 18
    assert heatmap["total_detections"] == 19
    assert heatmap["max_density"] == 12
    assert len(heatmap["hotspots"]) == 2
    # Top hotspot should be the one with density 12
    assert heatmap["hotspots"][0]["density"] == 12

    # Test reset_detection_heatmap
    reset_res = pipeline.reset_detection_heatmap()
    assert reset_res["success"] is True
    assert pipeline._detection_heatmap_total == 0
    cleared = pipeline.get_detection_heatmap()
    assert cleared["total_detections"] == 0
    assert cleared["max_density"] == 0
    assert len(cleared["hotspots"]) == 0
