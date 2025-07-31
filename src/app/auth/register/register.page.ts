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
  IonCardContent, 
  IonItem, 
  IonInput, 
  IonButton, 
  IonText, 
  IonSpinner,
  IonIcon,
  IonBackButton,
  IonButtons,
  LoadingController,
  AlertController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { personAdd, person, mail, lockClosed, eye, eyeOff, moon, sunny } from 'ionicons/icons';
import { AuthService, RegisterData } from '../auth.service';
import { ThemeService } from '../../services/theme.service';

@Component({
  selector: 'app-register',
  templateUrl: './register.page.html',
  styleUrls: ['./register.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    IonCard,
    IonCardContent,
    IonItem,
    IonInput,
    IonButton,
    IonText,
    IonSpinner,
    IonIcon,
    IonBackButton,
    IonButtons
  ]
})
export class RegisterPage {
  registerData: RegisterData = {
    name: '',
    email: '',
    password: ''
  };
  
  confirmPassword = '';
  isLoading = false;
  showPassword = false;
  showConfirmPassword = false;
  errorMessage = '';
  darkMode = false;

  constructor(
    private authService: AuthService,
    private router: Router,
    private loadingController: LoadingController,
    private alertController: AlertController,
    private themeService: ThemeService
  ) {
    addIcons({ personAdd, person, mail, lockClosed, eye, eyeOff, moon, sunny });
    
    // Subscrever ao estado do dark mode
    this.themeService.darkMode$.subscribe(isDark => {
      this.darkMode = isDark;
    });
    
    // Inicializar com o estado atual
    this.darkMode = this.themeService.isDarkMode();
  }

  async onRegister() {
    // Validações
    if (!this.registerData.name || !this.registerData.email || !this.registerData.password) {
      this.showAlert('Erro', 'Por favor, preencha todos os campos.');
      return;
    }

    if (this.registerData.password !== this.confirmPassword) {
      this.showAlert('Erro', 'As senhas não coincidem.');
      return;
    }

    if (this.registerData.password.length < 6) {
      this.showAlert('Erro', 'A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    if (!this.isValidEmail(this.registerData.email)) {
      this.showAlert('Erro', 'Por favor, insira um email válido.');
      return;
    }

    const loading = await this.loadingController.create({
      message: 'Criando conta...',
      spinner: 'crescent'
    });
    
    await loading.present();
    this.isLoading = true;
    this.errorMessage = '';

    this.authService.register(this.registerData).subscribe({
      next: async (result) => {
        await loading.dismiss();
        this.isLoading = false;
        
        if (result.success) {
          await this.showAlert('Sucesso', 'Conta criada com sucesso!');
          this.router.navigate(['/home']);
        } else {
          this.errorMessage = result.error || 'Erro ao criar conta';
          this.showAlert('Erro', this.errorMessage);
        }
      },
      error: async (error) => {
        await loading.dismiss();
        this.isLoading = false;
        this.errorMessage = 'Erro de conexão. Tente novamente.';
        this.showAlert('Erro', this.errorMessage);
        console.error('Erro no registro:', error);
      }
    });
  }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPasswordVisibility() {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  goToLogin() {
    this.router.navigate(['/login']);
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  async showAlert(header: string, message: string) {
    const alert = await this.alertController.create({
      header,
      message,
      buttons: ['OK']
    });
    await alert.present();
  }

  getPasswordStrength(): string {
    const password = this.registerData.password;
    if (password.length === 0) return '';
    if (password.length < 6) return 'weak';
    if (password.length < 10) return 'medium';
    return 'strong';
  }

  getPasswordStrengthText(): string {
    const strength = this.getPasswordStrength();
    switch (strength) {
      case 'weak': return 'Fraca';
      case 'medium': return 'Média';
      case 'strong': return 'Forte';
      default: return '';
    }
  }

  toggleTheme() {
    this.themeService.toggleTheme();
  }
}