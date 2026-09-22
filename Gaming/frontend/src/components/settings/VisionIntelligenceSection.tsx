import React from 'react';
import { Camera } from 'lucide-react';
import { SettingsSection } from './common/SettingsSection';
import { SettingsField } from './common/SettingsField';
import { CustomSelect } from './common/CustomSelect';
import { DETECTOR_BACKEND_OPTIONS, OCR_ENGINE_OPTIONS } from '../../data/settingsConstants';

interface VisionIntelligenceSectionProps {
  localConfig: any;
  setLocalConfig: React.Dispatch<React.SetStateAction<any>>;
  searchQuery?: string;
}

export const VisionIntelligenceSection: React.FC<VisionIntelligenceSectionProps> = ({
  localConfig,
  setLocalConfig,
  searchQuery
}) => {
  return (
    <SettingsSection
      searchQuery={searchQuery}
      title="Vision & Intelligence Engine"
      icon={Camera}
      searchTerms="vision intelligence yolo model detector ocr rapidocr tesseract backend"
    >
      <SettingsField
        label="Vision Model Path"
        description="Select your optimized YOLOv8 .engine (TensorRT) or .pt (PyTorch) model file."
      >
        <div className="flex gap-2">
          <input
            type="text"
            readOnly
            value={localConfig.vision?.yolo_model || ''}
            className="flex-1 bg-black/40 border border-white/10 rounded-xl py-2.5 px-4 text-[10px] font-mono text-neon-green focus:outline-none cursor-default"
            placeholder="e.g. models/yolov8n.engine"
          />
          <button
            aria-label="button"
            type="button"
            onClick={() => {
              const input = document.createElement('input');
              input.type = 'file';
              input.onchange = (e: any) => {
                const file = e.target.files[0];
                if (file) {
                  setLocalConfig({
                    ...localConfig,
                    vision: { ...localConfig.vision, yolo_model: `models/${file.name}` }
                  });
                }
              };
              input.click();
            }}
            className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black uppercase hover:bg-white/10 transition-all"
          >
            Browse
          </button>
        </div>
      </SettingsField>

      <SettingsField
        label="Detector Backend"
        description="TRT is 10x faster but requires pre-compiled engines for your specific GPU."
      >
        <CustomSelect
          value={localConfig.vision?.detector || 'simple'}
          onChange={(val) =>
            setLocalConfig({
              ...localConfig,
              vision: { ...localConfig.vision, detector: val }
            })
          }
          options={DETECTOR_BACKEND_OPTIONS}
        />
      </SettingsField>

      <SettingsField
        label="OCR Engine"
        description="RapidOCR provides fast, lightweight recognition in complex story games."
      >
        <CustomSelect
          value={
            localConfig.vision?.ocr?.backend === 'easyocr'
              ? 'rapidocr'
              : localConfig.vision?.ocr?.backend || 'auto'
          }
          onChange={(val) =>
            setLocalConfig({
              ...localConfig,
              vision: {
                ...localConfig.vision,
                ocr: { ...localConfig.vision.ocr, backend: val }
              }
            })
          }
          options={OCR_ENGINE_OPTIONS}
        />
      </SettingsField>
    </SettingsSection>
  );
};
