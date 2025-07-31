import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { AuthService } from './auth/auth.service';
import { ThemeService } from './services/theme.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  imports: [IonApp, IonRouterOutlet],
})
export class AppComponent implements OnInit {
  constructor(
    private authService: AuthService,
    private router: Router,
    private themeService: ThemeService
  ) {}

  ngOnInit() {
    // Inicializar o tema global
    this.themeService.initializeTheme();
    
    // Verificar se o usuário está logado e redirecionar adequadamente
    if (this.authService.isAuthenticated()) {
      // Se estiver na página de login/register, redirecionar para home
      const currentUrl = this.router.url;
      if (currentUrl === '/login' || currentUrl === '/register' || currentUrl === '/') {
        this.router.navigate(['/home']);
      }
    } else {
      // Se não estiver logado, redirecionar para login
      this.router.navigate(['/login']);
    }
  }
}
