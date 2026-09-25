import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ThemeService } from '../../services/theme.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  private authService = inject(AuthService);
  private themeService = inject(ThemeService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  employee_Id = '';
  password = '';
  showPassword = signal(false);
  errorMessage = signal<string | null>(null);
  isLoading = signal(false);

  toggleShowPassword(): void {
    this.showPassword.update(v => !v);
  }

  onLogin(): void {
    if (!this.employee_Id.trim() || !this.password.trim()) {
      this.errorMessage.set('Please enter both employee_Id and password.');
      return;
    }

    this.errorMessage.set(null);
    this.isLoading.set(true);

    this.authService.login(this.employee_Id, this.password).subscribe(result => {
      this.isLoading.set(false);
      if (result.success) {
        this.navigateAfterLogin();
      } else {
        this.errorMessage.set(result.message);
      }
    });
  }

  private navigateAfterLogin(): void {
    const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/dashboard';
    this.router.navigateByUrl(returnUrl);
  }
}
