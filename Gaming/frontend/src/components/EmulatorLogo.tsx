import React from 'react';

interface EmulatorLogoProps {
  emuId: string;
  className?: string;
  size?: number;
}

export const EmulatorLogo: React.FC<EmulatorLogoProps> = ({ emuId, className = 'w-6 h-6', size = 24 }) => {
  const id = emuId.toLowerCase();

  switch (id) {
    case 'rpcs3':
      // PS3 / RPCS3 Cell Hexagon & Controller glyph
      return (
        <svg viewBox="0 0 48 48" width={size} height={size} className={className} fill="none">
          <rect width="48" height="48" rx="12" fill="#001838" />
          <polygon points="24,6 40,15 40,33 24,42 8,33 8,15" stroke="#0084FF" strokeWidth="2.5" fill="#002B66" />
          <path d="M16 20H26C28.2 20 30 21.8 30 24C30 26.2 28.2 28 26 28H16V20Z" fill="#00D2FF" />
          <path d="M16 28H22L27 35H21L16 28Z" fill="#FF4757" />
          <circle cx="34" cy="20" r="2" fill="#2ED573" />
          <circle cx="34" cy="28" r="2" fill="#FFA502" />
        </svg>
      );

    case 'pcsx2':
      // PS2 Iconic Two-Bar Wave Monogram
      return (
        <svg viewBox="0 0 48 48" width={size} height={size} className={className} fill="none">
          <rect width="48" height="48" rx="12" fill="#001030" />
          <path d="M11 15C11 12.8 12.8 11 15 11H25C29.4 11 33 14.6 33 19C33 23.4 29.4 27 25 27H17V37H11V15Z" fill="#0044BB" />
          <path d="M17 17H25C26.1 17 27 17.9 27 19C27 20.1 26.1 21 25 21H17V17Z" fill="#00D2FF" />
          <path d="M25 25H33C35.2 25 37 26.8 37 29V37H31V31H25V25Z" fill="#0088FF" />
          <rect x="29" y="33" width="8" height="4" rx="2" fill="#00F0FF" />
        </svg>
      );

    case 'duckstation':
      // DuckStation Duck Head / Polygon Mask
      return (
        <svg viewBox="0 0 48 48" width={size} height={size} className={className} fill="none">
          <rect width="48" height="48" rx="12" fill="#2A0808" />
          <path d="M14 28C14 20 20 14 28 14C33 14 36 17 38 21C38 27 34 32 26 34C20 34 14 32 14 28Z" fill="#FF5252" />
          <circle cx="30" cy="20" r="3" fill="#FFFFFF" />
          <circle cx="31" cy="20" r="1.5" fill="#111111" />
          <path d="M38 22L44 25L38 28Z" fill="#FFA502" />
          <polygon points="12,32 18,28 16,36" fill="#D63031" />
        </svg>
      );

    case 'dolphin':
      // Dolphin Leaping Wave
      return (
        <svg viewBox="0 0 48 48" width={size} height={size} className={className} fill="none">
          <rect width="48" height="48" rx="12" fill="#001830" />
          <path d="M10 32C15 28 22 25 27 17C29 14 33 11 36 10C38 12 37 16 35 19C33 22 27 27 21 31C16 34 12 34 10 32Z" fill="#00A8FF" />
          <path d="M27 17C29 19 33 20 37 19C34 22 30 24 26 24L27 17Z" fill="#00D2D3" />
          <path d="M13 30L8 35C9 32 10 30 11 28L13 30Z" fill="#0080FF" />
          <circle cx="34" cy="14" r="1.5" fill="#FFFFFF" />
          <path d="M8 38C16 35 24 39 32 37C37 35 41 38 41 38" stroke="#54A0FF" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      );

    case 'cemu':
      // Cemu Wii U Cyan Wave & Controller Screen
      return (
        <svg viewBox="0 0 48 48" width={size} height={size} className={className} fill="none">
          <rect width="48" height="48" rx="12" fill="#002030" />
          <rect x="10" y="14" width="28" height="20" rx="4" stroke="#00D2FF" strokeWidth="2.5" fill="#00354A" />
          <rect x="16" y="18" width="16" height="12" rx="2" fill="#001824" />
          <circle cx="13" cy="20" r="1.8" fill="#00D2FF" />
          <circle cx="35" cy="20" r="1.8" fill="#00D2FF" />
          <path d="M18 24Q24 20 30 24" stroke="#00F0FF" strokeWidth="1.5" strokeLinecap="round" fill="none" />
        </svg>
      );

    case 'ryujinx':
      // Ryujinx Red & Blue Neon Joy-Cons
      return (
        <svg viewBox="0 0 48 48" width={size} height={size} className={className} fill="none">
          <rect width="48" height="48" rx="12" fill="#1A0D15" />
          {/* Left Blue Joy-Con */}
          <path d="M12 18C12 14.7 14.7 12 18 12H21V36H18C14.7 36 12 33.3 12 30V18Z" fill="#00D2FF" />
          <circle cx="16.5" cy="18" r="2" fill="#002538" />
          <rect x="15" y="25" width="3" height="3" rx="0.5" fill="#002538" />
          {/* Right Red Joy-Con */}
          <path d="M27 12H30C33.3 12 36 14.7 36 18V30C36 33.3 33.3 36 30 36H27V12Z" fill="#FF3838" />
          <circle cx="31.5" cy="30" r="2" fill="#3D0000" />
          <circle cx="31.5" cy="19" r="1.5" fill="#3D0000" />
        </svg>
      );

    case 'citra':
      // Citra Citrus Slice Wedge
      return (
        <svg viewBox="0 0 48 48" width={size} height={size} className={className} fill="none">
          <rect width="48" height="48" rx="12" fill="#241E00" />
          <path d="M12 34C12 21.8 21.8 12 34 12V34H12Z" fill="#FFC312" />
          <path d="M15 32C15 23.5 21.5 17 30 17" stroke="#EE5A24" strokeWidth="2" strokeDasharray="3 2" fill="none" />
          <path d="M18 31C19 26 23 21 28 20L28 31H18Z" fill="#A3CB38" />
          <circle cx="34" cy="34" r="2" fill="#F79F1F" />
        </svg>
      );

    case 'ppsspp':
      // PPSSPP Handheld Blue/Teal Monogram
      return (
        <svg viewBox="0 0 48 48" width={size} height={size} className={className} fill="none">
          <rect width="48" height="48" rx="12" fill="#061F24" />
          <rect x="8" y="15" width="32" height="18" rx="9" stroke="#10AC84" strokeWidth="2" fill="#0B2B30" />
          <rect x="16" y="17" width="16" height="14" rx="2" fill="#01A3A4" />
          <circle cx="12" cy="24" r="2" fill="#55E6C1" />
          <circle cx="36" cy="24" r="2" fill="#55E6C1" />
        </svg>
      );

    case 'xenia':
      // Xbox 360 Green Glowing Sphere X
      return (
        <svg viewBox="0 0 48 48" width={size} height={size} className={className} fill="none">
          <rect width="48" height="48" rx="12" fill="#071D07" />
          <circle cx="24" cy="24" r="14" fill="#107C10" stroke="#52B852" strokeWidth="2" />
          <path d="M17 17L31 31M31 17L17 31" stroke="#FFFFFF" strokeWidth="3.5" strokeLinecap="round" />
        </svg>
      );

    case 'xemu':
      // Original Xbox Radioactive Jewel X
      return (
        <svg viewBox="0 0 48 48" width={size} height={size} className={className} fill="none">
          <rect width="48" height="48" rx="12" fill="#051405" />
          <polygon points="24,8 38,24 24,40 10,24" fill="#0D380D" stroke="#00FF44" strokeWidth="2" />
          <path d="M18 16L30 32M30 16L18 32" stroke="#00FF66" strokeWidth="4" strokeLinecap="square" />
        </svg>
      );

    case 'retroarch':
      // RetroArch Space Invader Gamepad
      return (
        <svg viewBox="0 0 48 48" width={size} height={size} className={className} fill="none">
          <rect width="48" height="48" rx="12" fill="#1E2024" />
          <rect x="10" y="16" width="28" height="16" rx="4" fill="#3D424A" stroke="#8A92A0" strokeWidth="1.5" />
          {/* Retro Space Invader Glyph */}
          <rect x="18" y="21" width="3" height="3" fill="#00D2FF" />
          <rect x="27" y="21" width="3" height="3" fill="#00D2FF" />
          <rect x="15" y="24" width="18" height="3" fill="#00D2FF" />
          <rect x="18" y="27" width="4" height="2" fill="#00D2FF" />
          <rect x="26" y="27" width="4" height="2" fill="#00D2FF" />
        </svg>
      );

    case 'mgba':
      // Game Boy Advance Purple Horizontal Console
      return (
        <svg viewBox="0 0 48 48" width={size} height={size} className={className} fill="none">
          <rect width="48" height="48" rx="12" fill="#1A1528" />
          <path d="M8 20C8 16 12 14 16 14H32C36 14 40 16 40 20V28C40 32 36 34 32 34H16C12 34 8 32 8 28V20Z" fill="#5F27CD" stroke="#9980FA" strokeWidth="1.5" />
          <rect x="16" y="17" width="16" height="14" rx="2" fill="#0A0612" />
          <rect x="18" y="19" width="12" height="10" rx="1" fill="#48DBFB" />
          <circle cx="12" cy="24" r="2" fill="#341F97" />
          <circle cx="36" cy="22" r="1.5" fill="#EE5253" />
          <circle cx="34" cy="26" r="1.5" fill="#EE5253" />
        </svg>
      );

    case 'snes9x':
      // Super Nintendo 4-Color Button Diamond
      return (
        <svg viewBox="0 0 48 48" width={size} height={size} className={className} fill="none">
          <rect width="48" height="48" rx="12" fill="#1C1E24" />
          <rect x="10" y="16" width="28" height="16" rx="8" fill="#57606F" stroke="#A4B0BE" strokeWidth="1.5" />
          <circle cx="30" cy="21" r="2" fill="#1B9CFC" /> {/* Blue */}
          <circle cx="33" cy="24" r="2" fill="#FF4757" /> {/* Red */}
          <circle cx="27" cy="24" r="2" fill="#FED330" /> {/* Yellow */}
          <circle cx="30" cy="27" r="2" fill="#2ED573" /> {/* Green */}
          <rect x="14" y="22" width="6" height="4" rx="1" fill="#2F3542" />
        </svg>
      );

    case 'melonds':
      // Nintendo DS Clamshell Dual Screen
      return (
        <svg viewBox="0 0 48 48" width={size} height={size} className={className} fill="none">
          <rect width="48" height="48" rx="12" fill="#151724" />
          {/* Top Screen */}
          <rect x="14" y="10" width="20" height="12" rx="2" fill="#2C2C54" stroke="#706FD3" strokeWidth="1.5" />
          <rect x="17" y="12" width="14" height="8" fill="#33D9B2" />
          {/* Hinge */}
          <line x1="12" y1="23" x2="36" y2="23" stroke="#474787" strokeWidth="2" />
          {/* Bottom Screen */}
          <rect x="14" y="24" width="20" height="14" rx="2" fill="#2C2C54" stroke="#706FD3" strokeWidth="1.5" />
          <rect x="17" y="26" width="14" height="8" fill="#33D9B2" />
          <circle cx="16" cy="35" r="1" fill="#FFFFFF" />
          <circle cx="32" cy="35" r="1" fill="#FFFFFF" />
        </svg>
      );

    case 'flycast':
      // Sega Dreamcast Orange Swirl Spiral
      return (
        <svg viewBox="0 0 48 48" width={size} height={size} className={className} fill="none">
          <rect width="48" height="48" rx="12" fill="#281404" />
          <circle cx="24" cy="24" r="14" fill="#3D1D02" stroke="#FF6B08" strokeWidth="1.5" />
          <path
            d="M24 16C19.6 16 16 19.6 16 24C16 28.4 19.6 32 24 32C27.5 32 30.5 29.8 31.6 26.6C31.9 25.5 31.1 24.5 30 24.5C29 24.5 28.2 25.2 27.9 26.1C27.2 27.8 25.7 29 24 29C21.2 29 19 26.8 19 24C19 21.2 21.2 19 24 19C25.8 19 27.4 20 28.2 21.5C28.7 22.4 29.8 22.8 30.7 22.3C31.6 21.8 32 20.7 31.5 19.8C30 17.5 27.2 16 24 16Z"
            fill="#FF793F"
          />
          <circle cx="24" cy="24" r="2.5" fill="#FF5252" />
        </svg>
      );

    case 'vita3k':
      // PlayStation Vita Sleek Modern Oval Handheld
      return (
        <svg viewBox="0 0 48 48" width={size} height={size} className={className} fill="none">
          <rect width="48" height="48" rx="12" fill="#001B2E" />
          <rect x="8" y="14" width="32" height="20" rx="10" fill="#002E4E" stroke="#00A8FF" strokeWidth="1.8" />
          <rect x="15" y="16" width="18" height="16" rx="2" fill="#000E1A" />
          <rect x="16.5" y="17.5" width="15" height="13" rx="1" fill="#0097E6" />
          <circle cx="11.5" cy="21" r="1.5" fill="#00D2D3" />
          <circle cx="11.5" cy="27" r="1.8" fill="#10AC84" /> {/* Left Stick */}
          <circle cx="36.5" cy="21" r="1.5" fill="#00D2D3" />
          <circle cx="36.5" cy="27" r="1.8" fill="#10AC84" /> {/* Right Stick */}
        </svg>
      );

    case 'mupen64plus':
      // Nintendo 64 3D Multifaceted Isometric N
      return (
        <svg viewBox="0 0 48 48" width={size} height={size} className={className} fill="none">
          <rect width="48" height="48" rx="12" fill="#1A1828" />
          {/* Isometric N-Cube */}
          <polygon points="24,9 37,16 37,32 24,39 11,32 11,16" stroke="#4834D4" strokeWidth="1.5" fill="#130F40" />
          <path d="M15 19V29L20 32V22L28 32V22L33 25V15L28 12V22L20 12L15 15V19Z" fill="#22A6B3" />
          <polygon points="15,15 20,12 28,22 23,25" fill="#EB4D4B" />
          <polygon points="28,12 33,15 33,25 28,22" fill="#F0932B" />
          <polygon points="15,19 20,22 20,32 15,29" fill="#6AB04C" />
        </svg>
      );

    default:
      // Generic Retro Gamepad Controller
      return (
        <svg viewBox="0 0 48 48" width={size} height={size} className={className} fill="none">
          <rect width="48" height="48" rx="12" fill="#1A1E24" />
          <rect x="10" y="16" width="28" height="16" rx="6" fill="#2F3640" stroke="#718093" strokeWidth="1.5" />
          <circle cx="16" cy="24" r="3" fill="#00D2FF" />
          <circle cx="32" cy="22" r="1.5" fill="#FF4757" />
          <circle cx="30" cy="26" r="1.5" fill="#FFA502" />
        </svg>
      );
  }
};

