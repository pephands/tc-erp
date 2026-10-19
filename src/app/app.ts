import { Component, OnInit, inject } from '@angular/core';
import { Meta } from '@angular/platform-browser';
import { RouterOutlet } from '@angular/router';
import { DeviceAuthModalComponent } from './modals/device-auth-modal/device-auth-modal.component';
import { DeviceTransferModalComponent } from './modals/device-transfer-modal/device-transfer-modal.component';
import { AdminDeviceOtpModalComponent } from './modals/admin-device-otp-modal/admin-device-otp-modal.component';
import { ForcePasswordResetModalComponent } from './modals/force-password-reset-modal/force-password-reset-modal.component';
import { ToastComponent } from './modals/toast/toast.component';
import { AnnouncementModalComponent } from './components/announcement-modal/announcement-modal.component';
import { DevToolsProtectionService } from './services/devtools-protection.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    DeviceAuthModalComponent,
    DeviceTransferModalComponent,
    AdminDeviceOtpModalComponent,
    ForcePasswordResetModalComponent,
    ToastComponent,
    AnnouncementModalComponent
  ],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  private devToolsProtection = inject(DevToolsProtectionService);
  private meta = inject(Meta);

  // Set to true to enable debugger & devtools anti-inspection protection.
  // Set to false to disable debugger protection for development/debugging.
  public enableDebuggerProtection: boolean = true;

  ngOnInit(): void {
    this.meta.updateTag({ name: 'robots', content: 'noindex, nofollow, noarchive, nosnippet, noimageindex' });
    this.meta.updateTag({ name: 'googlebot', content: 'noindex, nofollow, noarchive, nosnippet, noimageindex' });
    this.meta.updateTag({ name: 'bingbot', content: 'noindex, nofollow, noarchive, nosnippet, noimageindex' });

    DevToolsProtectionService.isEnabled = this.enableDebuggerProtection;
    if (this.enableDebuggerProtection) {
      this.devToolsProtection.init();
    }
  }
}

