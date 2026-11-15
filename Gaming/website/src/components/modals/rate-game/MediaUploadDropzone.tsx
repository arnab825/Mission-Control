"use client";

import React, { useRef, useState } from "react";
import { UploadCloud, Image as ImageIcon, Film, Play, AlertCircle, Trash2 } from "lucide-react";

export interface AttachedMedia {
  id: string;
  url: string;
  type: "image" | "gif" | "video";
  name: string;
  size?: number;
  uploading: boolean;
  error?: string;
}

interface MediaUploadDropzoneProps {
  mediaList: AttachedMedia[];
  onFilesSelected: (files: FileList | null) => void;
  onRemoveMedia: (id: string) => void;
}

export function MediaUploadDropzone({
  mediaList,
  onFilesSelected,
  onRemoveMedia,
}: MediaUploadDropzoneProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  return (
    <div className="space-y-2.5 p-3.5 rounded-2xl bg-white/[0.02] border border-white/10">
      <div className="flex items-center justify-between">
        <label className="text-[11px] uppercase font-bold text-gray-300 tracking-wider flex items-center gap-1.5">
          <UploadCloud className="w-3.5 h-3.5 text-neon-green" /> Media Attachments
          (Screenshots, GIFs, Gameplay Videos)
        </label>
        <span className="text-[10px] text-gray-400 font-mono">
          {mediaList.length}/4 Files (Max 25MB each)
        </span>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,video/mp4,video/webm,image/gif"
        className="hidden"
        onChange={(e) => {
          onFilesSelected(e.target.files);
          if (e.target) e.target.value = "";
        }}
      />

      {/* Drag & Drop Upload Target Zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          setIsDragging(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          onFilesSelected(e.dataTransfer.files);
        }}
        onClick={() => fileInputRef.current?.click()}
        className={`p-4 border-2 border-dashed rounded-xl flex flex-col items-center justify-center text-center gap-2 cursor-pointer transition-all duration-200 ${
          isDragging
            ? "border-neon-green bg-neon-green/10 scale-[1.01]"
            : "border-white/15 hover:border-neon-green/50 bg-black/40 hover:bg-black/60"
        }`}
      >
        <div className="flex items-center gap-2 text-neon-green">
          <ImageIcon className="w-4 h-4" />
          <Film className="w-4 h-4" />
        </div>
        <div>
          <p className="text-xs text-gray-200 font-bold">
            Click to browse or drag & drop media files
          </p>
          <p className="text-[10px] text-gray-400 mt-0.5">
            Supports PNG, JPG, WEBP, animated GIFs, and MP4/WebM gameplay clips
          </p>
        </div>
      </div>

      {/* Uploaded Media Thumbnails Strip */}
      {mediaList.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
          {mediaList.map((item) => (
            <div
              key={item.id}
              className="relative aspect-video rounded-xl overflow-hidden bg-black/80 border border-white/15 group"
            >
              {item.type === "video" ? (
                <div className="relative w-full h-full bg-black flex items-center justify-center">
                  <video
                    src={item.url}
                    className="w-full h-full object-cover opacity-80"
                    muted
                    playsInline
                  />
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-7 h-7 rounded-full bg-black/70 border border-neon-green/60 flex items-center justify-center text-neon-green shadow-lg">
                      <Play className="w-3.5 h-3.5 fill-neon-green ml-0.5" />
                    </div>
                  </div>
                </div>
              ) : (
                <img
                  src={item.url}
                  alt={item.name}
                  className="w-full h-full object-cover"
                />
              )}

              {/* Type Badge */}
              <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-black/80 border border-white/20 text-[9px] font-mono font-bold uppercase text-white shadow">
                {item.type}
              </span>

              {/* Uploading Spinner */}
              {item.uploading && (
                <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center gap-1 z-10">
                  <div className="w-4 h-4 border-2 border-neon-green border-t-transparent rounded-full animate-spin" />
                  <span className="text-[9px] text-neon-green font-mono">Uploading...</span>
                </div>
              )}

              {/* Error state */}
              {item.error && (
                <div className="absolute inset-0 bg-rose-950/80 p-1 flex flex-col items-center justify-center text-center z-10">
                  <AlertCircle className="w-4 h-4 text-rose-400" />
                  <span className="text-[8px] text-rose-300 truncate max-w-full">
                    {item.error}
                  </span>
                </div>
              )}

              {/* Remove Button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemoveMedia(item.id);
                }}
                className="absolute top-1.5 right-1.5 p-1 rounded-md bg-black/80 hover:bg-rose-600 text-gray-300 hover:text-white transition-colors cursor-pointer shadow"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
