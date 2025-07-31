import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { 
  IonContent, 
  IonHeader, 
  IonTitle, 
  IonToolbar, 
  IonCard, 
  IonCardHeader, 
  IonCardTitle, 
  IonCardContent, 
  IonItem, 
  IonLabel, 
  IonInput, 
  IonButton, 
  IonText, 
  IonSpinner,
  IonIcon,
  IonGrid,
  IonRow,
  IonCol,
  IonButtons,
  LoadingController,
  AlertController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { logIn, person, lockClosed, eye, eyeOff, moon, sunny } from 'ionicons/icons';
import { AuthService, LoginCredentials } from '../auth.service';
import { ThemeService } from '../../services/theme.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonItem,
    IonLabel,
    IonInput,
    IonButton,
    IonText,
    IonSpinner,
    IonIcon,
    IonGrid,
    IonRow,
    IonCol,
    IonButtons
  ]
})
export class LoginPage {
  credentials: LoginCredentials = {
    email: '',
    password: ''
  };
  
  isLoading = false;
  showPassword = false;
  errorMessage = '';
  darkMode = false;

  constructor(
    private authService: AuthService,
    private router: Router,
    private loadingController: LoadingController,
    private alertController: AlertController,
    private themeService: ThemeService
  ) {
    addIcons({ logIn, person, lockClosed, eye, eyeOff, moon, sunny });
    
    // Subscrever ao estado do dark mode
    this.themeService.darkMode$.subscribe(isDark => {
      this.darkMode = isDark;
    });
    
    // Inicializar com o estado atual
    this.darkMode = this.themeService.isDarkMode();
  }

  async onLogin() {
    if (!this.credentials.email || !this.credentials.password) {
      this.showAlert('Erro', 'Por favor, preencha todos os campos.');
      return;
    }

    const loading = await this.loadingController.create({
      message: 'Fazendo login...',
      spinner: 'crescent'
    });
    
    await loading.present();
    this.isLoading = true;
    this.errorMessage = '';

    this.authService.login(this.credentials).subscribe({
      next: async (result) => {
        await loading.dismiss();
        this.isLoading = false;
        
        if (result.success) {
          this.router.navigate(['/home']);
        } else {
          this.errorMessage = result.error || 'Erro ao fazer login';
          this.showAlert('Erro de Login', this.errorMessage);
        }
      },
      error: async (error) => {
        await loading.dismiss();
        this.isLoading = false;
        this.errorMessage = 'Erro de conexão. Tente novamente.';
        this.showAlert('Erro', this.errorMessage);
        console.error('Erro no login:', error);
      }
    });
  }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  goToRegister() {
    this.router.navigate(['/register']);
  }

  async showAlert(header: string, message: string) {
    const alert = await this.alertController.create({
      header,
      message,
      buttons: ['OK']
    });
    await alert.present();
  }

  // Credenciais de demonstração
  fillDemoCredentials(type: 'admin' | 'user') {
    if (type === 'admin') {
      this.credentials.email = 'admin@lima.com';
      this.credentials.password = 'admin123';
    } else {
      this.credentials.email = 'user@lima.com';
      this.credentials.password = 'user123';
    }
  }

  toggleTheme() {
    this.themeService.toggleTheme();
  }
}