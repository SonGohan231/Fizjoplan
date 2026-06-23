export const theme = {
  colors: {
    bg: '#f5f7fa',
    surface: '#ffffff',
    primary: '#0b7285',
    primaryDark: '#095c6b',
    accent: '#e7f5ff',
    text: '#1f2933',
    textMuted: '#52606d',
    border: '#e4e7eb',
    danger: '#b54708',
    dangerBg: '#fff4e6',
    success: '#2b8a3e',
  },
  spacing: (n: number) => n * 8,
  radius: { sm: 8, md: 12, lg: 16 },
  font: {
    h1: 24,
    h2: 18,
    body: 15,
    small: 13,
  },
} as const;

export type Theme = typeof theme;
