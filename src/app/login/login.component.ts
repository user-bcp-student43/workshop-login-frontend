import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Preferences } from '../models/preferences.models';
import { AuthService, AUTH_ROUTES } from '../services/auth.service';
import { SessionService } from '../services/session.service';
import { isBlankCredential } from '../utils/credential-validation';
import { userFacingError } from '../utils/user-facing-error';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  private readonly auth = inject(AuthService);
  private readonly session = inject(SessionService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  username = '';
  password = '';
  busy = false;
  message = '';
  preferences: Preferences = this.session.getPreferences();

  async login(): Promise<void> {
    this.message = '';
    if (isBlankCredential(this.username)) {
      this.message = 'Ingrese un usuario.';
      return;
    }
    if (isBlankCredential(this.password)) {
      this.message = 'Ingrese una contraseña.';
      return;
    }
    this.busy = true;
    try {
      const response = await this.auth.login(this.username, this.password);
      if (!response?.token) {
        this.message = 'El backend respondió sin token.';
        return;
      }
      this.session.save(response.token, response.user, this.preferences);
      const navigated = await this.router.navigate([AUTH_ROUTES.dashboard]);
      if (navigated === false) {
        throw new Error('Dashboard navigation was not completed');
      }
    } catch (error: unknown) {
      this.message = 'No se pudo autenticar a ' + this.username + '. ' + userFacingError(error, 'login');
    } finally {
      this.busy = false;
      this.cdr.markForCheck();
    }
  }
}
