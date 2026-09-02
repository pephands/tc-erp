import { Injectable, signal } from '@angular/core';

export interface Theme {
  id: string;
  name: string;
  type: 'dark' | 'light';
  primaryColor: string;
  previewGradient: string;
}

export const THEME_PRESETS: Theme[] = [
  {
    id: 'cosmic-dark',
    name: 'Cosmic Dark',
    type: 'dark',
    primaryColor: '#6366f1',
    previewGradient: 'linear-gradient(135deg, #1e1b4b, #6366f1)'
  },
  {
    id: 'emerald-dark',
    name: 'Emerald Dark',
    type: 'dark',
    primaryColor: '#10b981',
    previewGradient: 'linear-gradient(135deg, #064e3b, #10b981)'
  },
  {
    id: 'cyber-neon',
    name: 'Cyber Neon',
    type: 'dark',
    primaryColor: '#d946ef',
    previewGradient: 'linear-gradient(135deg, #18181b, #d946ef)'
  },
  {
    id: 'modern-light',
    name: 'Modern Light',
    type: 'light',
    primaryColor: '#2563eb',
    previewGradient: 'linear-gradient(135deg, #f8fafc, #2563eb)'
  },
  {
    id: 'warm-light',
    name: 'Warm Sand Light',
    type: 'light',
    primaryColor: '#ea580c',
    previewGradient: 'linear-gradient(135deg, #fafaf9, #ea580c)'
  }
];

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private readonly STORAGE_KEY = 'tc_erp_theme';

  // Signals for reactive state
  readonly availableThemes = THEME_PRESETS;
  readonly currentTheme = signal<Theme>(this.loadStoredTheme());

  constructor() {
    this.applyTheme(this.currentTheme());
  }

  private loadStoredTheme(): Theme {
    try {
      const storedId = localStorage.getItem(this.STORAGE_KEY);
      if (storedId) {
        const found = THEME_PRESETS.find(t => t.id === storedId);
        if (found) return found;
      }
    } catch (e) {
      console.error('Failed to read theme from localStorage', e);
    }
    return THEME_PRESETS[0]; // Default to Cosmic Dark
  }

  setTheme(themeId: string): void {
    const theme = THEME_PRESETS.find(t => t.id === themeId);
    if (!theme) return;

    localStorage.setItem(this.STORAGE_KEY, theme.id);
    this.currentTheme.set(theme);
    this.applyTheme(theme);
  }

  private applyTheme(theme: Theme): void {
    const root = document.documentElement;
    root.setAttribute('data-theme', theme.id);
    root.setAttribute('data-mode', theme.type);
  }
}
