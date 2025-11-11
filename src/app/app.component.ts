import { Component, OnInit, AfterViewInit } from '@angular/core';
import { Router } from '@angular/router';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { AuthService } from './auth/auth.service';
import { ThemeService } from './services/theme.service';

import { StatusBar, Style } from '@capacitor/status-bar';
import { Platform } from '@ionic/angular';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  imports: [IonApp, IonRouterOutlet],
})
export class AppComponent implements OnInit, AfterViewInit {

  constructor(
    private authService: AuthService,
    private router: Router,
    private themeService: ThemeService,
    private platform: Platform
  ) {}

  ngOnInit() {
    // Inicializar o tema global
    this.themeService.initializeTheme();
    
    // Navegação inicial
    if (this.authService.isAuthenticated()) {
      const currentUrl = this.router.url;
      if (currentUrl === '/login' || currentUrl === '/register' || currentUrl === '/') {
        this.router.navigate(['/home']);
      }
    } else {
      this.router.navigate(['/login']);
    }
  }

  async ngAfterViewInit() {
    // Garante que o app Ionic esteja pronto
    await this.platform.ready();

    // Impedir que o conteúdo sobreponha a status bar
    await StatusBar.setOverlaysWebView({ overlay: false });

    // Ajustar estilo da barra (troque Style.Dark se quiser o inverso)
    await StatusBar.setStyle({ style: Style.Dark });
  }
}
