import { Component, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { DeviceAuthModalComponent } from './modals/device-auth-modal/device-auth-modal.component';
import { ForcePasswordResetModalComponent } from './modals/force-password-reset-modal/force-password-reset-modal.component';
import { ToastComponent } from './modals/toast/toast.component';
import { AnnouncementModalComponent } from './components/announcement-modal/announcement-modal.component';
import { DevToolsProtectionService } from './services/devtools-protection.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, DeviceAuthModalComponent, ForcePasswordResetModalComponent, ToastComponent, AnnouncementModalComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  private devToolsProtection = inject(DevToolsProtectionService);

  ngOnInit(): void {
    this.devToolsProtection.init();
  }
}

