import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl, SafeHtml } from '@angular/platform-browser';
import { AnnouncementService, Announcement } from '../../services/announcement.service';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-announcement-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './announcement-modal.component.html',
  styleUrls: ['./announcement-modal.component.css']
})
export class AnnouncementModalComponent implements OnInit {
  announcementService = inject(AnnouncementService);
  sanitizer = inject(DomSanitizer);
  router = inject(Router);

  isVisible = signal<boolean>(false);
  announcement = signal<Announcement | null>(null);
  
  youtubeEmbedUrl = signal<SafeResourceUrl | null>(null);
  instagramEmbedHtml = signal<SafeHtml | null>(null);
  buttonsEnabled = signal<boolean>(false);
  timeLeft = signal<number>(0);
  timerInterval: any;

  ngOnInit() {
    if (this.router.url === '/dashboard') {
      this.checkAnnouncement();
    }
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      if (event.urlAfterRedirects === '/dashboard' || event.url === '/dashboard') {
        this.checkAnnouncement();
      }
    });
  }

  checkAnnouncement() {
    this.announcementService.getActiveAnnouncement().subscribe({
      next: (res) => {
        if (res.status === 'success' && res.data) {
          const ann = res.data;
          
          // Check local storage for logic
          const storageKey = `announcement_status_${ann.id}`;
          const savedStatusStr = localStorage.getItem(storageKey);
          
          let shouldShow = true;
          
          if (savedStatusStr) {
            const savedStatus = JSON.parse(savedStatusStr);
            const now = new Date().getTime();
            
            if (savedStatus.action === 'noted') {
              // Check if it was noted today
              const notedDate = new Date(savedStatus.timestamp).toDateString();
              const today = new Date().toDateString();
              if (notedDate === today) {
                shouldShow = false;
              }
            } else if (savedStatus.action === 'remind') {
              // Check if 1 hour has passed
              const oneHour = 60 * 60 * 1000;
              if (now - savedStatus.timestamp < oneHour) {
                shouldShow = false;
              }
            }
          }
          
          if (shouldShow) {
            this.prepareMedia(ann);
            this.announcement.set(ann);
            this.isVisible.set(true);
            this.startEnableTimer(ann);
          }
        }
      },
      error: (err) => console.error('Error fetching announcement', err)
    });
  }
  
  prepareMedia(ann: Announcement) {
    if (ann.youtube_link) {
      const videoId = this.extractYoutubeId(ann.youtube_link);
      if (videoId) {
        this.youtubeEmbedUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(`https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1`));
      }
    }
    
    if (ann.instagram_link) {
      // Very basic instagram embed logic
      let url = ann.instagram_link;
      if (!url.endsWith('/')) url += '/';
      url += 'embed';
      this.instagramEmbedHtml.set(this.sanitizer.bypassSecurityTrustResourceUrl(url));
    }
  }
  
  extractYoutubeId(url: string): string | null {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=|shorts\/)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  }
  
  startEnableTimer(ann: Announcement) {
    this.buttonsEnabled.set(false);
    let seconds = 15; // default 15 seconds
    if (ann.video || ann.youtube_link || ann.instagram_link) {
      seconds = 30; // 30 seconds for video/embeds
    }
    this.timeLeft.set(seconds);
    
    if (this.timerInterval) clearInterval(this.timerInterval);
    
    this.timerInterval = setInterval(() => {
      let current = this.timeLeft();
      if (current > 1) {
        this.timeLeft.set(current - 1);
      } else {
        this.timeLeft.set(0);
        this.buttonsEnabled.set(true);
        clearInterval(this.timerInterval);
      }
    }, 1000);
  }

  onNoted() {
    const ann = this.announcement();
    if (ann) {
      const storageKey = `announcement_status_${ann.id}`;
      localStorage.setItem(storageKey, JSON.stringify({
        action: 'noted',
        timestamp: new Date().getTime()
      }));
      this.isVisible.set(false);
    }
  }

  onRemind() {
    const ann = this.announcement();
    if (ann) {
      const storageKey = `announcement_status_${ann.id}`;
      localStorage.setItem(storageKey, JSON.stringify({
        action: 'remind',
        timestamp: new Date().getTime()
      }));
      this.isVisible.set(false);
    }
  }
  
  openCta() {
    const ann = this.announcement();
    if (ann && ann.cta_link) {
      let url = ann.cta_link;
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
      }
      window.open(url, '_blank');
    }
  }
}
