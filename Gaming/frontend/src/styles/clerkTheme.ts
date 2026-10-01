import { dark } from '@clerk/themes';

/**
 * Custom Mission Control Cyberpunk / Tactical HUD theme for all Clerk modals and components
 * (UserButton, SignIn, and Reverification modals).
 */
export const missionControlClerkTheme = {
  baseTheme: dark,
  layout: {
    unsafe_disableDevelopmentModeWarnings: true,
    logoPlacement: 'none' as const,
  },
  variables: {
    colorPrimary: '#76b900', // Neon green
    colorBackground: '#0b0d13', // Deep tactical background
    colorText: '#ffffff',
    colorTextSecondary: '#94a3b8',
    colorInputBackground: '#12151d',
    colorInputText: '#ffffff',
    colorDanger: '#ef4444',
    colorSuccess: '#76b900',
    borderRadius: '1rem',
    fontFamily: "'Inter', system-ui, sans-serif",
  },
  elements: {
    // Backdrop and Outer Modal
    modalBackdrop: 'backdrop-blur-md bg-black/85',
    modalContent:
      'bg-[#0b0d13] border border-white/10 rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.85)] overflow-hidden text-white',
    modalCloseButton: 'text-zinc-400 hover:text-white hover:bg-white/10 rounded-xl transition-all',
    card: 'bg-[#0b0d13] border border-white/10 shadow-2xl text-white rounded-3xl',
    cardBox: 'rounded-3xl border border-white/10 shadow-2xl bg-[#0b0d13]',
    scrollBox: 'bg-[#0b0d13]',
    pageScrollBox: 'bg-[#0b0d13]',

    // UserProfile Left Navigation Bar
    navbar: 'bg-[#07080c] border-r border-white/5 p-4',
    navbarButtons: 'gap-1.5',
    navbarButton:
      'text-zinc-400 hover:text-white hover:bg-white/5 rounded-xl font-bold text-xs transition-all py-2.5 px-3',
    navbarButtonActive:
      'bg-neon-green/15 text-neon-green border border-neon-green/30 rounded-xl font-black py-2.5 px-3 shadow-[0_0_15px_rgba(118,185,0,0.1)]',
    navbarButtonIcon: 'w-4 h-4',

    // Headers & Titles
    headerTitle: 'text-white font-black uppercase tracking-wider text-base',
    headerSubtitle: 'text-zinc-400 text-xs font-medium mt-1',
    profilePageHeaderTitle: 'text-white font-black uppercase tracking-wider text-base',
    profilePageHeaderSubtitle: 'text-zinc-400 text-xs font-medium mt-1',

    // Content Sections
    profileSection: 'border-b border-white/5 py-4',
    profileSectionTitle: 'text-zinc-400 border-none pb-2',
    profileSectionTitleText: 'text-xs font-black uppercase tracking-wider text-neon-green',
    profileSectionContent: 'text-zinc-300 text-xs',
    profileSectionItem: 'text-zinc-300 hover:bg-white/5 rounded-xl p-2 transition-all',
    profileSectionPrimaryButton:
      'text-neon-green hover:text-white text-xs font-bold transition-all',

    // Buttons & Form Elements
    formButtonPrimary:
      'bg-neon-green/20 hover:bg-neon-green/30 border border-neon-green/40 text-neon-green hover:text-white font-black uppercase tracking-wider text-xs rounded-xl py-2 px-4 transition-all cursor-pointer shadow-[0_0_15px_rgba(118,185,0,0.15)]',
    formButtonReset:
      'text-zinc-400 hover:text-white text-xs font-bold rounded-xl transition-all',
    formFieldInput:
      'bg-black/60 border border-white/10 text-white rounded-xl focus:border-neon-green/50 text-xs py-2 px-3 focus:outline-none transition-all',
    formFieldLabel: 'text-zinc-400 text-xs font-bold uppercase tracking-wider',

    // Badges & Status Indicators
    badge:
      'bg-neon-green/10 text-neon-green border border-neon-green/30 font-mono text-[9px] uppercase px-2 py-0.5 rounded-full tracking-wider',
    tagInputContainer: 'bg-black/60 border border-white/10 rounded-xl',

    // User Previews & Identity
    avatarBox: 'rounded-xl border border-white/10 overflow-hidden',
    userButtonAvatarBox: 'rounded-xl border border-white/15 overflow-hidden',
    userPreviewMainIdentifier: 'text-white font-black text-xs tracking-wide',
    userPreviewSecondaryIdentifier: 'text-zinc-400 font-mono text-[10px]',
    userPreviewAvatarBox: 'rounded-xl border border-white/10 object-cover',
    alert: 'bg-red-950/40 border border-red-500/25 text-red-200 rounded-xl',
    alertText: 'text-red-200 text-xs',

    // Connected Accounts list
    connectedAccountsItem: 'border border-white/5 bg-white/2 hover:bg-white/5 rounded-2xl p-3 transition-all',
    activeDeviceIcon: 'text-neon-green',

    // Breadcrumbs & Navigation
    breadcrumbsItem: 'text-zinc-400 text-xs',
    breadcrumbsItemCurrent: 'text-neon-green font-bold text-xs',
    breadcrumbsItemDivider: 'text-zinc-600',

    // Menu and Dropdowns
    menuButton: 'hover:bg-white/10 text-zinc-300 hover:text-white rounded-xl transition-all',
    menuList: 'bg-zinc-950/95 border border-white/10 backdrop-blur-xl shadow-2xl rounded-2xl p-1',
    menuItem: 'hover:bg-white/10 text-zinc-300 hover:text-white rounded-xl text-xs font-medium py-2 px-3 transition-all',

    // Popover / UserButton Card
    userButtonPopoverCard: 'bg-zinc-950/95 border border-white/10 backdrop-blur-xl shadow-2xl rounded-3xl p-2',
    userButtonPopoverActionButton: 'hover:bg-white/5 text-zinc-300 hover:text-white rounded-xl text-xs transition-all',
    userButtonPopoverFooter: 'border-t border-white/5 pt-2 mt-2',

    // Footer & Branding Suppression
    footer: '!hidden hidden',
    footerAction: '!hidden hidden',
    footerActionLink: '!hidden hidden',
    footerActionText: '!hidden hidden',
    footerPages: '!hidden hidden',
    footerPagesLink: '!hidden hidden',
    developmentModeBadge: '!hidden hidden',
    devModeBadge: '!hidden hidden',
    navbarFooter: '!hidden hidden',
  },
};
