import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type FontSizeLevel = 'small' | 'normal' | 'large';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private darkModeSubject = new BehaviorSubject<boolean>(false);
  private fontSizeSubject = new BehaviorSubject<FontSizeLevel>('normal');
  private fontSettingsOpenSubject = new BehaviorSubject<boolean>(false);
  public darkMode$ = this.darkModeSubject.asObservable();
  public fontSizeLevel$ = this.fontSizeSubject.asObservable();
  public fontSettingsOpen$ = this.fontSettingsOpenSubject.asObservable();
  private themeInitialized = false;
  private fontInitialized = false;

  constructor() {
    this.initializeTheme();
    this.initializeFontScale();
  }

  /**
   * Inicializa o tema baseado nas preferências salvas ou do sistema
   */
  initializeTheme() {
    if (this.themeInitialized) {
      return;
    }

    this.themeInitialized = true;

    const savedTheme = localStorage.getItem('darkMode');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');
    
    let isDarkMode: boolean;
    
    if (savedTheme !== null) {
      isDarkMode = savedTheme === 'true';
    } else {
      isDarkMode = prefersDark.matches;
    }
    
    this.setDarkMode(isDarkMode, false); // false para não salvar novamente
    
    // Ouvir mudanças nas preferências do sistema
    prefersDark.addEventListener('change', (mediaQuery) => {
      if (localStorage.getItem('darkMode') === null) {
        this.setDarkMode(mediaQuery.matches, false);
      }
    });
  }

  initializeFontScale() {
    if (this.fontInitialized) {
      return;
    }

    this.fontInitialized = true;

    const savedLevel = (localStorage.getItem('fontSizeLevel') as FontSizeLevel | null) || 'normal';
    this.setFontSizeLevel(savedLevel, false);
  }

  /**
   * Define o modo escuro
   * @param isDark - true para modo escuro, false para modo claro
   * @param save - se deve salvar a preferência no localStorage
   */
  setDarkMode(isDark: boolean, save: boolean = true) {
    this.darkModeSubject.next(isDark);
    this.applyTheme(isDark);
    
    if (save) {
      localStorage.setItem('darkMode', isDark.toString());
    }
  }

  /**
   * Alterna entre modo claro e escuro
   */
  toggleTheme() {
    const currentMode = this.darkModeSubject.value;
    this.setDarkMode(!currentMode);
  }

  setFontSizeLevel(level: FontSizeLevel, save: boolean = true) {
    const normalizedLevel: FontSizeLevel = level === 'small' || level === 'large' ? level : 'normal';
    this.fontSizeSubject.next(normalizedLevel);
    this.applyFontScale(this.getFontScaleValue(normalizedLevel));

    if (save) {
      localStorage.setItem('fontSizeLevel', normalizedLevel);
    }
  }

  openFontSettings() {
    this.fontSettingsOpenSubject.next(true);
  }

  isFontSettingsOpen(): boolean {
    return this.fontSettingsOpenSubject.value;
  }

  closeFontSettings() {
    this.fontSettingsOpenSubject.next(false);
  }

  toggleFontSettings() {
    this.fontSettingsOpenSubject.next(!this.fontSettingsOpenSubject.value);
  }

  getFontSizeLevel(): FontSizeLevel {
    return this.fontSizeSubject.value;
  }

  private getFontScaleValue(level: FontSizeLevel): number {
    switch (level) {
      case 'small':
        return 0.92;
      case 'large':
        return 1.12;
      default:
        return 1;
    }
  }

  private applyFontScale(scale: number) {
    document.documentElement.style.setProperty('--app-font-scale', scale.toString());
  }

  /**
   * Obtém o estado atual do dark mode
   */
  isDarkMode(): boolean {
    return this.darkModeSubject.value;
  }

  /**
   * Aplica o tema ao documento
   */
  private applyTheme(isDark: boolean) {
    document.body.classList.toggle('dark', isDark);
  }
}