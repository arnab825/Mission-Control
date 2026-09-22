import React, { memo } from 'react';
import { RefreshCw, Cpu, Layers, Sparkles, Flame, Zap, Sun } from 'lucide-react';
import { GPU_RTX_FEATURES, GPU_NVIDIA_FEATURES } from '../../data/settingsConstants';
import { getRecommendedPreset } from '../../utils/gpuPresetEngine';
import { getSteamAppIdForTitle } from '../../data/discoverCatalog';
import type { TelemetryState } from '../../types/telemetry';

interface HardwareFeatureMatrixProps {
  effectiveLibrary: any[];
  state: TelemetryState | null;
  sendCommand: (type: string, payload?: any) => void;
  userId?: string | null;
  isAdvancedGpu: boolean;
  isCapableGpu: boolean;
}

export const HardwareFeatureMatrix: React.FC<HardwareFeatureMatrixProps> = memo(({
  effectiveLibrary,
  state,
  sendCommand,
  userId,
  isAdvancedGpu,
  isCapableGpu
}) => {
  const playableGames = effectiveLibrary.filter(
    (g: any) => g.type?.toUpperCase() !== 'LAUNCHER' && g.genre?.toUpperCase() !== 'PLATFORM'
  );

  return (
    <div className="border-t border-white/5 pt-6 mt-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-black text-neon-green uppercase tracking-widest mb-1">
            Library Hardware Feature Matrix
          </p>
          <p className="text-[10px] font-medium text-zinc-500 leading-relaxed">
            AI analyzed features for scanned games in your library, indicating GTX (Legacy) and RTX (Deep Learning/Ray Tracing) compatibility.
          </p>
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          {effectiveLibrary.length > 0 && (
            <span className="text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg bg-neon-green/10 text-neon-green border border-neon-green/20">
              {effectiveLibrary.length} Games Cached
            </span>
          )}
          <button
            type="button"
            onClick={() => sendCommand('scan_games', { userId: userId || undefined })}
            disabled={Boolean(state?.scan_state?.is_running)}
            className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-zinc-300 hover:text-white text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50 shadow-sm"
            title="Trigger a fresh scan of installed games"
          >
            <RefreshCw className={`w-3 h-3 ${state?.scan_state?.is_running ? 'animate-spin text-neon-green' : ''}`} />
            <span>{state?.scan_state?.is_running ? 'Scanning...' : 'Rescan Library'}</span>
          </button>
        </div>
      </div>

      {playableGames.length === 0 ? (
        <div className="p-6 bg-white/2 border border-white/5 rounded-2xl text-center space-y-3">
          <p className="text-[10px] text-zinc-500 italic">No games scanned in library yet. Run a library scan to populate feature matrix.</p>
          <button
            type="button"
            onClick={() => sendCommand('scan_games', { userId: userId || undefined })}
            disabled={Boolean(state?.scan_state?.is_running)}
            className="px-4 py-2 bg-neon-green text-black font-black text-[9px] uppercase tracking-widest rounded-xl hover:shadow-[0_0_15px_rgba(118,185,0,0.3)] transition-all cursor-pointer inline-flex items-center gap-2 disabled:opacity-50"
          >
            <RefreshCw className={`w-3 h-3 ${state?.scan_state?.is_running ? 'animate-spin' : ''}`} />
            <span>{state?.scan_state?.is_running ? 'Scanning Library...' : 'Scan Library Now'}</span>
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto border border-white/5 rounded-2xl bg-black/25">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 text-[8px] font-black text-zinc-500 uppercase tracking-widest bg-white/[0.01]">
                <th className="p-3.5 pl-5">Game</th>
                <th className="p-3.5">Genre</th>
                <th className="p-3.5">Recommended Preset</th>
                <th className="p-3.5">Key Tech</th>
                <th className="p-3.5">Game HDR Support</th>
                <th className="p-3.5 pr-5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {playableGames.slice(0, 10).map((game: any, idx: number) => {
                const features = game.features || [];
                const gtxFeatures = features.filter((f: string) => GPU_NVIDIA_FEATURES.includes(f.toUpperCase()));
                const rtxFeatures = features.filter((f: string) => GPU_RTX_FEATURES.includes(f.toUpperCase()));
                const hasGtx = gtxFeatures.length > 0;
                const hasRtx = rtxFeatures.length > 0;
                const hasHdr = features.some((f: string) => f.toUpperCase() === 'HDR');

                const exeLower = (game.exe_path || '').toLowerCase();
                const isLauncherExe =
                  exeLower.includes('ubisoftconnect') ||
                  exeLower.includes('uplay') ||
                  exeLower.includes('steam.exe') ||
                  exeLower.includes('epicgameslauncher') ||
                  exeLower.includes('origin.exe') ||
                  exeLower.includes('galaxyclient');

                const hasLauncherIcon =
                  game.icon &&
                  (game.icon.toLowerCase().includes('steam_launcher') ||
                    game.icon.toLowerCase().includes('fallback_ea_desktop') ||
                    game.icon.toLowerCase().includes('fallback_epic_games'));

                const useLocalIcon = game.icon && game.icon !== 'null' && !isLauncherExe && !hasLauncherIcon;
                const nameLower = (game.name || '').toLowerCase();
                const is007 = nameLower.includes('007') && (nameLower.includes('first light') || nameLower.includes('firstlight') || nameLower.includes('light'));
                const default007 = '/games/007firstlight.png';

                const resolvedSteamId =
                  game.platform === 'Steam' && /^\d+$/.test(game.id)
                    ? game.id
                    : getSteamAppIdForTitle(game.name);

                const steamBannerUrl = resolvedSteamId
                  ? `https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/${resolvedSteamId}/header.jpg`
                  : null;

                let fallbackUrl = null;
                if (!game.id && game.name && nameLower.includes('ghost of tsushima')) {
                  fallbackUrl = 'https://cdn.akamai.steamstatic.com/steam/apps/2215430/header.jpg';
                }

                const localBannerUrl =
                  game.local_banner && game.local_banner !== 'null' && !game.local_banner.includes('firstlight.webp')
                    ? game.local_banner.startsWith('http')
                      ? game.local_banner
                      : game.local_banner.startsWith('/')
                        ? game.local_banner
                        : `asset:///${game.local_banner.replace(/\\/g, '/')}`
                    : null;

                const localIconUrl =
                  useLocalIcon || is007
                    ? game.icon && game.icon !== 'null'
                      ? game.icon.startsWith('http')
                        ? game.icon
                        : game.icon.startsWith('/')
                          ? game.icon
                          : `asset:///${game.icon.replace(/\\/g, '/')}`
                      : default007
                    : null;

                const iconUrl = localIconUrl || localBannerUrl || steamBannerUrl || fallbackUrl;

                const gpuCaps = state?.system_specs?.hardware?.gpu_capabilities;
                const gpuNameStr = state?.system_specs?.hardware?.gpu || state?.gpu_metrics?.gpu_name || '';
                const recPreset = getRecommendedPreset(features, game.genre, gpuCaps || gpuNameStr, game.name || '');

                return (
                  <tr key={idx} className="hover:bg-white/[0.01] transition-all text-[10px] font-medium text-zinc-300">
                    <td className="p-3 pl-5 font-black text-white">
                      <div className="flex items-center gap-3">
                        {iconUrl ? (
                          <div className="relative w-7 h-7 shrink-0">
                            <img
                              src={iconUrl}
                              alt=""
                              className="w-7 h-7 rounded-lg object-cover bg-white/5 border border-white/10"
                              onError={(e) => {
                                const img = e.target as HTMLImageElement;
                                if (is007 && !img.src.includes('007firstlight.png')) {
                                  img.src = default007;
                                  return;
                                }
                                if (steamBannerUrl && img.src !== steamBannerUrl) {
                                  img.src = steamBannerUrl;
                                  return;
                                }
                                img.style.display = 'none';
                                const fallback = img.nextElementSibling as HTMLElement;
                                if (fallback) fallback.style.display = 'flex';
                              }}
                            />
                            <div
                              style={{ display: 'none' }}
                              className="absolute inset-0 rounded-lg bg-neon-green/10 border border-neon-green/20 flex items-center justify-center text-neon-green font-black text-[9px] uppercase tracking-wider shadow-[0_0_8px_rgba(118,185,0,0.1)]"
                            >
                              {game.name.substring(0, 2)}
                            </div>
                          </div>
                        ) : (
                          <div className="w-7 h-7 rounded-lg bg-neon-green/10 border border-neon-green/20 flex items-center justify-center text-neon-green font-black text-[9px] uppercase tracking-wider shrink-0 shadow-[0_0_8px_rgba(118,185,0,0.1)]">
                            {game.name.substring(0, 2)}
                          </div>
                        )}
                        <span className="truncate max-w-[200px]" title={game.name}>
                          {game.name}
                        </span>
                      </div>
                    </td>
                    <td className="p-3 uppercase font-bold text-zinc-500 text-[8px]">{game.genre || 'N/A'}</td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-tighter border ${
                          recPreset.key === 'quality'
                            ? 'bg-neon-green/10 border-neon-green/20 text-neon-green'
                            : recPreset.key === 'performance'
                              ? 'bg-blue-500/10 border-blue-500/20 text-blue-400'
                              : recPreset.key === 'balanced'
                                ? 'bg-violet-500/10 border-violet-500/20 text-violet-400'
                                : recPreset.key === 'latency'
                                  ? 'bg-neon-yellow/10 border-neon-yellow/20 text-neon-yellow'
                                  : 'bg-zinc-800 border-zinc-700 text-zinc-400'
                        }`}
                      >
                        {recPreset.title}
                      </span>
                    </td>
                    <td className="p-3">
                      {hasRtx || hasGtx ? (
                        <div className="flex gap-1 flex-wrap max-w-[140px]">
                          {[...rtxFeatures, ...gtxFeatures].slice(0, 3).map((f: string, i: number) => {
                            const featUpper = f.toUpperCase();
                            let IconComp = Cpu;
                            if (featUpper.includes('DLSS') || featUpper.includes('FRAME_GEN') || featUpper.includes('FRAME GEN')) {
                              IconComp = featUpper.includes('FRAME') ? Layers : Sparkles;
                            } else if (featUpper.includes('RTX') || featUpper.includes('RAY_TRACING') || featUpper.includes('PATH_TRACING')) {
                              IconComp = Flame;
                            } else if (featUpper.includes('REFLEX')) {
                              IconComp = Zap;
                            } else if (featUpper.includes('HDR')) {
                              IconComp = Sun;
                            }
                            return (
                              <span
                                key={i}
                                className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter border ${
                                  GPU_RTX_FEATURES.includes(featUpper)
                                    ? isAdvancedGpu
                                      ? 'bg-neon-green/10 border-neon-green/20 text-neon-green'
                                      : 'bg-zinc-800 border-zinc-700 text-zinc-500'
                                    : 'bg-neon-yellow/10 border-neon-yellow/20 text-neon-yellow'
                                }`}
                              >
                                <IconComp className="w-2.5 h-2.5 shrink-0" />
                                <span>{f}</span>
                              </span>
                            );
                          })}
                          {[...rtxFeatures, ...gtxFeatures].length > 3 && (
                            <span className="px-1.5 py-0.5 rounded text-[8px] font-black border bg-zinc-800 border-zinc-700 text-zinc-500">
                              +{([...rtxFeatures, ...gtxFeatures].length - 3)}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-zinc-600 text-[9px]">—</span>
                      )}
                    </td>
                    <td className="p-3">
                      {hasHdr ? (
                        <span className="px-1.5 py-0.5 rounded bg-violet-500/10 border border-violet-500/20 text-violet-400 text-[8px] font-black uppercase tracking-tighter">
                          Supported
                        </span>
                      ) : (
                        <span className="text-zinc-600 text-[9px]">—</span>
                      )}
                    </td>
                    <td className="p-3 pr-5">
                      {hasRtx && isAdvancedGpu ? (
                        <span className="text-neon-yellow font-bold text-[9px] uppercase tracking-wider flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-neon-yellow animate-pulse" />
                          RTX Active
                        </span>
                      ) : hasGtx && isCapableGpu ? (
                        <span className="text-neon-green font-bold text-[9px] uppercase tracking-wider flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-neon-green" />
                          GTX Active
                        </span>
                      ) : hasHdr ? (
                        <span className="text-violet-400 font-bold text-[9px] uppercase tracking-wider flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
                          HDR Optimised
                        </span>
                      ) : (
                        <span className="text-zinc-500 font-bold text-[9px] uppercase tracking-wider">
                          Standard
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
});

HardwareFeatureMatrix.displayName = 'HardwareFeatureMatrix';
