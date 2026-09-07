import { Injectable, signal } from '@angular/core';

export interface Theme {
  id: string;
  name: string;
  type: 'dark' | 'light';
  primaryColor: string;
  previewGradient: string;
}

export const WARM_SAND_THEME: Theme = {
  id: 'warm-light',
  name: 'Warm Sand Light',
  type: 'light',
  primaryColor: '#ea580c',
  previewGradient: 'linear-gradient(135deg, #fafaf9, #ea580c)'
};

export const THEME_PRESETS: Theme[] = [
  WARM_SAND_THEME
];

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private readonly STORAGE_KEY = 'tc_erp_theme';

  // Signals for reactive state
  readonly availableThemes = THEME_PRESETS;
  readonly currentTheme = signal<Theme>(WARM_SAND_THEME);

  constructor() {
    this.applyTheme(WARM_SAND_THEME);
  }

  setTheme(themeId: string): void {
    localStorage.setItem(this.STORAGE_KEY, WARM_SAND_THEME.id);
    this.currentTheme.set(WARM_SAND_THEME);
    this.applyTheme(WARM_SAND_THEME);
  }

  private applyTheme(theme: Theme): void {
    const root = document.documentElement;
    root.setAttribute('data-theme', 'warm-light');
    root.setAttribute('data-mode', 'light');
  }
}
