export interface ThemeTokens {
  colors: {
    bgVoid: string;
    bgDeep: string;
    glassWhite: string;
    glassBorder: string;
    glassGlow: string;
    accentGold: string;
    accentRose: string;
    accentViolet: string;
    accentCyan: string;
    accentEmerald: string;
  };
  typography: {
    fontUi: string;
    fontCode: string;
    fontDevanagari: string;
  };
  blur: {
    card: string;
    dock: string;
    modal: string;
  };
}

export const SHASHWAT_DARK_THEME: ThemeTokens = {
  colors: {
    bgVoid: '#030712',
    bgDeep: '#050b14',
    glassWhite: 'rgba(255, 255, 255, 0.06)',
    glassBorder: 'rgba(255, 255, 255, 0.10)',
    glassGlow: 'rgba(255, 255, 255, 0.03)',
    accentGold: '#F59E0B',
    accentRose: '#F43F5E',
    accentViolet: '#8B5CF6',
    accentCyan: '#06B6D4',
    accentEmerald: '#10B981',
  },
  typography: {
    fontUi: "'Inter', 'SF Pro Display', system-ui, sans-serif",
    fontCode: "'JetBrains Mono', monospace",
    fontDevanagari: "'Noto Serif Devanagari', serif",
  },
  blur: {
    card: '28px',
    dock: '40px',
    modal: '48px',
  },
};
