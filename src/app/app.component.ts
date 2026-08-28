import { Component, OnInit, AfterViewInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { IonApp, IonRouterOutlet, IonModal, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonIcon, IonContent, IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonItem, IonLabel, IonSelect, IonSelectOption } from '@ionic/angular/standalone';
import { AuthService } from './auth/auth.service';
import { FontSizeLevel, ThemeService } from './services/theme.service';
import { addIcons } from 'ionicons';
import { close, settings } from 'ionicons/icons';

import { StatusBar, Style } from '@capacitor/status-bar';
import { Capacitor } from '@capacitor/core';
import { Platform } from '@ionic/angular';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  imports: [CommonModule, IonApp, IonRouterOutlet, IonModal, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonIcon, IonContent, IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonItem, IonLabel, IonSelect, IonSelectOption],
})
export class AppComponent implements OnInit, AfterViewInit {
  constructor(
    private authService: AuthService,
    private router: Router,
    public themeService: ThemeService,
    private platform: Platform
  ) {
    addIcons({ settings, close });
  }

  ngOnInit() {
    // Inicializar o tema global
    this.themeService.initializeTheme();
    this.themeService.initializeFontScale();
    
    // Navegação inicial direta para home
    const currentUrl = this.router.url;
    if (currentUrl === '/login' || currentUrl === '/register' || currentUrl === '/') {
      this.router.navigate(['/home']);
    }
  }

  async ngAfterViewInit() {
    // Garante que o app Ionic esteja pronto
    await this.platform.ready();

    // StatusBar só em plataformas nativas (verifica disponibilidade do plugin)
    if (Capacitor.isPluginAvailable('StatusBar')) {
      try {
        await StatusBar.setOverlaysWebView({ overlay: false });
        await StatusBar.setStyle({ style: Style.Dark });
      } catch (e) {
        // silenciar erros em ambiente web
      }
    }
  }
}
