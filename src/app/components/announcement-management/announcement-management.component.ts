import { Component, OnInit, inject, signal , computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl, SafeHtml } from '@angular/platform-browser';
import { AnnouncementService, Announcement } from '../../services/announcement.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-announcement-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './announcement-management.component.html',
  styleUrls: ['./announcement-management.component.css']
})
export class AnnouncementManagementComponent implements OnInit {
  announcementService = inject(AnnouncementService);
  sanitizer = inject(DomSanitizer);
  authService = inject(AuthService);

  isAdmin(): boolean {
    return this.authService.hasRole(['ADMIN']);
  }

  announcements = signal<Announcement[]>([]);
  showModal = signal<boolean>(false);
  isEdit = signal<boolean>(false);
  
  // Form State
  formId = signal<number | null>(null);
  formTitle = signal<string>('');
  formDescription = signal<string>('');
  formYoutubeLink = signal<string>('');
  formInstagramLink = signal<string>('');
  formCtaLink = signal<string>('');
  formMediaType = signal<string>('none');
  formIsActive = signal<boolean>(true);
  formHoldTimer = signal<number>(0);
  
  selectedImage = signal<File | null>(null);
  selectedVideo = signal<File | null>(null);
  selectedDocument = signal<File | null>(null);
  
  // Live Preview properties (dummy representations)
  previewImageUrl = signal<string | null>(null);
  previewVideoUrl = signal<string | null>(null);
  existingDocumentUrl = signal<string | null>(null);

  currentPage = signal<number>(1);
  pageNumbers = computed(() => {
    const pages = [];
    const maxPages = 5;
    let start = Math.max(1, this.currentPage() - 2);
    let end = Math.min(this.totalPages(), start + maxPages - 1);
    if (end - start < maxPages - 1) start = Math.max(1, end - maxPages + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  });

  pageSize = signal<number>(10);
  totalCount = signal<number>(0);
  totalPages = signal<number>(1);

  ngOnInit() {
    this.loadAnnouncements();
  }

  loadAnnouncements() {
    this.announcementService.getAnnouncements(this.currentPage(), this.pageSize()).subscribe({
      next: (res: any) => {
        // If it's the paginated response
        if (res.results) {
          this.announcements.set(res.results);
          this.totalCount.set(res.count);
          this.totalPages.set(Math.ceil(res.count / this.pageSize()) || 1);
        } else if (res.status === 'success') {
          // fallback
          this.announcements.set(res.data);
        }
      }
    });
  }
  setPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
      this.loadAnnouncements();
    }
  }



  nextPage() {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.update(p => p + 1);
      this.loadAnnouncements();
    }
  }

  prevPage() {
    if (this.currentPage() > 1) {
      this.currentPage.update(p => p - 1);
      this.loadAnnouncements();
    }
  }

  openCreateModal() {
    this.resetForm();
    this.isEdit.set(false);
    this.showModal.set(true);
  }

  openEditModal(ann: Announcement) {
    this.resetForm();
    this.formId.set(ann.id);
    this.formTitle.set(ann.title);
    this.formDescription.set(ann.description || '');
    this.formYoutubeLink.set(ann.youtube_link || '');
    this.formInstagramLink.set(ann.instagram_link || '');
    this.formCtaLink.set(ann.cta_link || '');
    this.formIsActive.set(ann.is_active);
    this.formHoldTimer.set(ann.hold_timer || 0);
    
    if (ann.image) this.formMediaType.set('image');
    else if (ann.video) this.formMediaType.set('video');
    else if (ann.document) this.formMediaType.set('document');
    else if (ann.youtube_link) this.formMediaType.set('youtube');
    else if (ann.instagram_link) this.formMediaType.set('instagram');
    else this.formMediaType.set('none');
    
    // Existing media paths for preview
    this.previewImageUrl.set(ann.image || null);
    this.previewVideoUrl.set(ann.video || null);
    this.existingDocumentUrl.set(ann.document || null);
    
    this.isEdit.set(true);
    this.showModal.set(true);
  }

  closeModal() {
    this.showModal.set(false);
  }

  resetForm() {
    this.formId.set(null);
    this.formTitle.set('');
    this.formDescription.set('');
    this.formYoutubeLink.set('');
    this.formInstagramLink.set('');
    this.formCtaLink.set('');
    this.formMediaType.set('none');
    this.formIsActive.set(true);
    this.formHoldTimer.set(0);
    
    this.selectedImage.set(null);
    this.selectedVideo.set(null);
    this.selectedDocument.set(null);
    
    this.previewImageUrl.set(null);
    this.previewVideoUrl.set(null);
    this.existingDocumentUrl.set(null);
  }

  onImageChange(e: any) {
    const file = e.target.files[0];
    if (file) {
      this.selectedImage.set(file);
      const reader = new FileReader();
      reader.onload = () => this.previewImageUrl.set(reader.result as string);
      reader.readAsDataURL(file);
    }
  }

  onVideoChange(e: any) {
    const file = e.target.files[0];
    if (file) {
      this.selectedVideo.set(file);
      const url = URL.createObjectURL(file);
      this.previewVideoUrl.set(url);
    }
  }

  onDocumentChange(e: any) {
    const file = e.target.files[0];
    if (file) {
      this.selectedDocument.set(file);
    }
  }

  toggleActive(ann: Announcement) {
    const fd = new FormData();
    fd.append('is_active', (!ann.is_active).toString());
    this.announcementService.updateAnnouncement(ann.id, fd).subscribe({
      next: (res) => {
        if (res.status === 'success') {
          this.loadAnnouncements();
        }
      }
    });
  }

  deleteAnnouncement(id: number) {
    if (confirm('Are you sure you want to delete this announcement?')) {
      this.announcementService.deleteAnnouncement(id).subscribe({
        next: () => this.loadAnnouncements()
      });
    }
  }

  onSubmit() {
    if (!this.formTitle().trim()) {
      alert("Title is required.");
      return;
    }

    const fd = new FormData();
    fd.append('title', this.formTitle());
    fd.append('description', this.formDescription());
    fd.append('is_active', this.formIsActive().toString());
    fd.append('hold_timer', this.formHoldTimer().toString());
    
    const mType = this.formMediaType();
    
    if (mType === 'youtube') {
      fd.append('youtube_link', this.formYoutubeLink() || '');
      fd.append('instagram_link', '');
    } else if (mType === 'instagram') {
      fd.append('instagram_link', this.formInstagramLink() || '');
      fd.append('youtube_link', '');
    } else {
      fd.append('youtube_link', '');
      fd.append('instagram_link', '');
    }
    
    fd.append('cta_link', this.formCtaLink() || '');
    
    if (mType === 'image' && this.selectedImage()) fd.append('image', this.selectedImage()!);
    if (mType === 'video' && this.selectedVideo()) fd.append('video', this.selectedVideo()!);
    if (mType === 'document' && this.selectedDocument()) fd.append('document', this.selectedDocument()!);

    if (this.isEdit() && this.formId()) {
      this.announcementService.updateAnnouncement(this.formId()!, fd).subscribe({
        next: (res) => {
          this.loadAnnouncements();
          this.closeModal();
        },
        error: (err) => alert('Error updating announcement.')
      });
    } else {
      this.announcementService.createAnnouncement(fd).subscribe({
        next: (res) => {
          this.loadAnnouncements();
          this.closeModal();
        },
        error: (err) => alert('Error creating announcement.')
      });
    }
  }

  // --- Live Preview Logic ---
  
  getPreviewYoutube(): SafeResourceUrl | null {
    if (this.formMediaType() !== 'youtube') return null;
    const url = this.formYoutubeLink();
    if (!url) return null;
    const videoId = this.extractYoutubeId(url);
    if (videoId) {
      return this.sanitizer.bypassSecurityTrustResourceUrl(`https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1`);
    }
    return null;
  }
  
  getPreviewInstagram(): SafeHtml | null {
    if (this.formMediaType() !== 'instagram') return null;
    let url = this.formInstagramLink();
    if (!url) return null;
    
    // Remove query parameters like ?hl=en before appending embed
    let cleanUrl = url.split('?')[0];
    if (!cleanUrl.endsWith('/')) {
      cleanUrl += '/';
    }
    cleanUrl += 'embed';
    
    return this.sanitizer.bypassSecurityTrustResourceUrl(cleanUrl);
  }
  
  extractYoutubeId(url: string): string | null {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=|shorts\/)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  }
  
  openCtaPreview() {
    let url = this.formCtaLink();
    if (url) {
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
      }
      window.open(url, '_blank');
    }
  }
}
