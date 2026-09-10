import { describe, it, expect } from 'vitest';
import {
  normalizeGameTitle,
  getSteamAppIdForTitle,
  getGameArtwork,
  TITLE_TO_STEAM_APPID,
  getSmartSearchRecommendations,
  searchCanonicalCatalog
} from '../discoverCatalog';

describe('Game Artwork & Title Normalization Engine', () => {
  it('normalizes titles by stripping editions, release tags, and punctuation', () => {
    expect(normalizeGameTitle('The Witcher 3: Wild Hunt - Game of the Year Edition')).toBe('the witcher 3 wild hunt');
    expect(normalizeGameTitle("Marvel's Spider-Man Remastered (v1.2)")).toBe('marvel s spider man');
    expect(normalizeGameTitle('Cyberpunk 2077 [DODI Repack].exe')).toBe('cyberpunk 2077');
    expect(normalizeGameTitle('God of War™ (2018)')).toBe('god of war');
    expect(normalizeGameTitle('Ghost of Tsushima Director\'s Cut')).toBe('ghost of tsushima');
  });

  it('accurately resolves verified Steam App IDs for major franchises', () => {
    expect(getSteamAppIdForTitle('Cyberpunk 2077')).toBe('1091500');
    expect(getSteamAppIdForTitle('Grand Theft Auto V')).toBe('271590');
    expect(getSteamAppIdForTitle('GTA 5')).toBe('271590');
    expect(getSteamAppIdForTitle('Red Dead Redemption 2')).toBe('1174180');
    expect(getSteamAppIdForTitle('Elden Ring')).toBe('1245620');
    expect(getSteamAppIdForTitle('Black Myth: Wukong')).toBe('2358720');
    expect(getSteamAppIdForTitle("Baldur's Gate 3")).toBe('1086940');
    expect(getSteamAppIdForTitle('God of War Ragnarök')).toBe('2322010');
    expect(getSteamAppIdForTitle('Forza Horizon 5')).toBe('1551360');
    expect(getSteamAppIdForTitle("Assassin's Creed Mirage")).toBe('3035570');
    expect(getSteamAppIdForTitle("Assassin's Creed Shadows")).toBe('3159330');
    expect(getSteamAppIdForTitle('DOOM: The Dark Ages')).toBe('3017860');
    expect(getSteamAppIdForTitle('Forza Motorsport')).toBe('2440510');
  });

  it('resolves official Steam CDN artwork when given a title', () => {
    const artwork = getGameArtwork('Black Myth: Wukong');
    expect(artwork.steamAppId).toBe('2358720');
    expect(artwork.bannerUrl).toContain('2358720/header.jpg');
    expect(artwork.coverUrl).toContain('2358720/capsule_616x353.jpg');
  });

  it('preserves verified custom banners when provided without falling back to dicebear', () => {
    const custom = 'https://custom-cdn.com/banner.jpg';
    const artwork = getGameArtwork('Elden Ring', custom);
    expect(artwork.bannerUrl).toBe(custom);
    expect(artwork.coverUrl).toContain('1245620/capsule_616x353.jpg');
  });

  it('rejects stale or mismatched Steam App IDs (like 2842100 Minotauros) for Assassin\'s Creed Mirage', () => {
    // Stale Minotauros banner URL passed
    const staleBanner = 'https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/2842100/header.jpg';
    const staleCover = 'https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/2842100/capsule_616x353.jpg';
    const artworkFromStaleBanner = getGameArtwork("Assassin's Creed Mirage", staleBanner, staleCover);
    expect(artworkFromStaleBanner.steamAppId).toBe('3035570');
    expect(artworkFromStaleBanner.bannerUrl).toBe('https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/3035570/header.jpg');
    expect(artworkFromStaleBanner.coverUrl).toBe('https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/3035570/capsule_616x353.jpg');
    expect(artworkFromStaleBanner.bannerUrl).not.toContain('2842100');

    // Stale store_app_id passed
    const artworkFromStaleId = getGameArtwork("Assassin's Creed Mirage", null, null, '2842100');
    expect(artworkFromStaleId.steamAppId).toBe('3035570');
    expect(artworkFromStaleId.bannerUrl).toContain('3035570/header.jpg');
    expect(artworkFromStaleId.bannerUrl).not.toContain('2842100');
  });

  it('contains over 150 verified games in TITLE_TO_STEAM_APPID', () => {
    const totalEntries = Object.keys(TITLE_TO_STEAM_APPID).length;
    expect(totalEntries).toBeGreaterThan(150);
  });
});

describe('Smart Search Recommendations & Canonical Search Engine', () => {
  it('generates contextual recommendations based on installed library genres', () => {
    const installed = [
      { name: 'Elden Ring', genre: 'Action RPG' },
      { name: 'Dark Souls III', genre: 'Action RPG' },
    ];
    const recs = getSmartSearchRecommendations(installed, ['witcher']);

    expect(recs.length).toBeGreaterThan(0);
    // Should have soulslike recommendation
    const soulslikeRec = recs.find(r => r.id === 'rec-soulslike' || r.id === 'rec-wukong');
    expect(soulslikeRec).toBeDefined();
    expect(soulslikeRec?.category).toBe('library');

    // Should include hardware showcase
    const hwRec = recs.find(r => r.category === 'hardware');
    expect(hwRec).toBeDefined();

    // Should include trending titles
    const trendRec = recs.find(r => r.category === 'trending');
    expect(trendRec).toBeDefined();
  });

  it('searches across both curated and all 250+ canonical titles instantly', () => {
    // 1. Curated game
    const wukongResults = searchCanonicalCatalog('wukong');
    expect(wukongResults.length).toBeGreaterThan(0);
    expect(wukongResults[0].title.toLowerCase()).toContain('wukong');
    expect(wukongResults[0].store_app_id).toBe('2358720');

    // 2. Alias resolution
    const gtaResults = searchCanonicalCatalog('gta');
    expect(gtaResults.length).toBeGreaterThan(0);
    expect(gtaResults.some(g => g.title.toLowerCase().includes('grand theft auto'))).toBe(true);

    // 3. Uncurated canonical game from TITLE_TO_STEAM_APPID
    const hollowKnightResults = searchCanonicalCatalog('hollow knight');
    expect(hollowKnightResults.length).toBeGreaterThan(0);
    expect(hollowKnightResults[0].store_app_id).toBe('367520');
    expect(hollowKnightResults[0].banner_url).toContain('367520/header.jpg');

    // 4. Another uncurated game
    const personaResults = searchCanonicalCatalog('persona 5 royal');
    expect(personaResults.length).toBeGreaterThan(0);
    expect(personaResults[0].store_app_id).toBe('1687950');

    // 5. Assassin's Creed Mirage resolves to 3035570 and official banner (not 2842100 Minotauros)
    const mirageResults = searchCanonicalCatalog("Assassin's Creed Mirage");
    expect(mirageResults.length).toBeGreaterThan(0);
    expect(mirageResults[0].store_app_id).toBe('3035570');
    expect(mirageResults[0].banner_url).toContain('3035570/header.jpg');
    expect(mirageResults[0].banner_url).not.toContain('2842100');

    // 6. Assassin's Creed Shadows resolves to 3159330 and official banner
    const shadowsResults = searchCanonicalCatalog("Assassin's Creed Shadows");
    expect(shadowsResults.length).toBeGreaterThan(0);
    expect(shadowsResults[0].store_app_id).toBe('3159330');
    expect(shadowsResults[0].banner_url).toContain('3159330/header.jpg');
  });
});

