import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { DeviceAuthModalComponent } from './modals/device-auth-modal/device-auth-modal.component';
import { ForcePasswordResetModalComponent } from './modals/force-password-reset-modal/force-password-reset-modal.component';
import { ToastComponent } from './modals/toast/toast.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, DeviceAuthModalComponent, ForcePasswordResetModalComponent, ToastComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {}
