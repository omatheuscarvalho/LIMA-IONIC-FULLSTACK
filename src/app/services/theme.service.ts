import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private darkModeSubject = new BehaviorSubject<boolean>(false);
  public darkMode$ = this.darkModeSubject.asObservable();

  constructor() {
    this.initializeTheme();
  }

  /**
   * Inicializa o tema baseado nas preferências salvas ou do sistema
   */
  initializeTheme() {
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