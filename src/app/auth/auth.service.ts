import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { delay, map } from 'rxjs/operators';

export interface User {
  id: string;
  email: string;
  name: string;
  role?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();
  
  private isAuthenticatedSubject = new BehaviorSubject<boolean>(false);
  public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();

  constructor() {
    this.loadStoredAuth();
  }

  /**
   * Carrega dados de autenticação armazenados localmente
   */
  private loadStoredAuth(): void {
    const token = localStorage.getItem('auth_token');
    const userData = localStorage.getItem('user_data');
    
    if (token && userData) {
      try {
        const user = JSON.parse(userData);
        this.currentUserSubject.next(user);
        this.isAuthenticatedSubject.next(true);
      } catch (error) {
        console.error('Erro ao carregar dados de autenticação:', error);
        this.logout();
      }
    }
  }

  /**
   * Realiza login do usuário
   * TODO: Substituir por chamada real para o backend
   */
  login(credentials: LoginCredentials): Observable<{ success: boolean; user?: User; token?: string; error?: string }> {
    // Simulação de chamada para API
    return of(null).pipe(
      delay(1000), // Simula latência da rede
      map(() => {
        // Validação simulada - substituir por validação real do backend
        if (credentials.email === 'admin@lima.com' && credentials.password === 'admin123') {
          const user: User = {
            id: '1',
            email: credentials.email,
            name: 'Administrador',
            role: 'admin'
          };
          
          const token = 'mock_jwt_token_' + Date.now();
          
          // Armazenar dados localmente
          localStorage.setItem('auth_token', token);
          localStorage.setItem('user_data', JSON.stringify(user));
          
          // Atualizar estado
          this.currentUserSubject.next(user);
          this.isAuthenticatedSubject.next(true);
          
          return { success: true, user, token };
        } else if (credentials.email === 'user@lima.com' && credentials.password === 'user123') {
          const user: User = {
            id: '2',
            email: credentials.email,
            name: 'Usuário Padrão',
            role: 'user'
          };
          
          const token = 'mock_jwt_token_' + Date.now();
          
          localStorage.setItem('auth_token', token);
          localStorage.setItem('user_data', JSON.stringify(user));
          
          this.currentUserSubject.next(user);
          this.isAuthenticatedSubject.next(true);
          
          return { success: true, user, token };
        } else {
          return { success: false, error: 'Credenciais inválidas' };
        }
      })
    );
  }

  /**
   * Registra novo usuário
   * TODO: Substituir por chamada real para o backend
   */
  register(data: RegisterData): Observable<{ success: boolean; user?: User; token?: string; error?: string }> {
    return of(null).pipe(
      delay(1000),
      map(() => {
        // Simulação de validação - substituir por validação real do backend
        if (data.email && data.password && data.name) {
          const user: User = {
            id: Date.now().toString(),
            email: data.email,
            name: data.name,
            role: 'user'
          };
          
          const token = 'mock_jwt_token_' + Date.now();
          
          localStorage.setItem('auth_token', token);
          localStorage.setItem('user_data', JSON.stringify(user));
          
          this.currentUserSubject.next(user);
          this.isAuthenticatedSubject.next(true);
          
          return { success: true, user, token };
        } else {
          return { success: false, error: 'Dados inválidos' };
        }
      })
    );
  }

  /**
   * Realiza logout do usuário
   */
  logout(): void {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_data');
    
    this.currentUserSubject.next(null);
    this.isAuthenticatedSubject.next(false);
  }

  /**
   * Obtém o token de autenticação atual
   */
  getToken(): string | null {
    return localStorage.getItem('auth_token');
  }

  /**
   * Obtém o usuário atual
   */
  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  /**
   * Verifica se o usuário está autenticado
   */
  isAuthenticated(): boolean {
    return this.isAuthenticatedSubject.value;
  }

  /**
   * Verifica se o usuário tem uma role específica
   */
  hasRole(role: string): boolean {
    const user = this.getCurrentUser();
    return user?.role === role || false;
  }

  /**
   * Atualiza dados do usuário
   * TODO: Implementar chamada para o backend
   */
  updateProfile(userData: Partial<User>): Observable<{ success: boolean; user?: User; error?: string }> {
    return of(null).pipe(
      delay(500),
      map(() => {
        const currentUser = this.getCurrentUser();
        if (currentUser) {
          const updatedUser = { ...currentUser, ...userData };
          
          localStorage.setItem('user_data', JSON.stringify(updatedUser));
          this.currentUserSubject.next(updatedUser);
          
          return { success: true, user: updatedUser };
        } else {
          return { success: false, error: 'Usuário não encontrado' };
        }
      })
    );
  }
}