import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  OnDestroy,
  Output,
  ViewChild,
  inject,
} from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { I18nService } from '../../../core/services/i18n.service';
import { XeicEvent } from '../../../core/models/event.model';

@Component({
  selector: 'app-lightbox',
  standalone: true,
  imports: [CommonModule, DatePipe],
  templateUrl: './lightbox.component.html',
  styleUrl: './lightbox.component.scss',
})
export class LightboxComponent implements AfterViewInit, OnDestroy {
  @Input({ required: true }) event!: XeicEvent;
  @Input() showMeta = false;
  @Input() labelledBy = 'lightbox-title';
  @Output() closed = new EventEmitter<void>();

  @ViewChild('closeBtn', { static: true })
  private closeBtnRef!: ElementRef<HTMLButtonElement>;
  @ViewChild('dialog', { static: true })
  private dialogRef!: ElementRef<HTMLElement>;

  protected i18n = inject(I18nService);

  private previouslyFocused: HTMLElement | null = null;

  ngAfterViewInit(): void {
    this.previouslyFocused = document.activeElement as HTMLElement | null;
    queueMicrotask(() => this.closeBtnRef?.nativeElement?.focus());
  }

  ngOnDestroy(): void {
    this.previouslyFocused?.focus?.();
    this.previouslyFocused = null;
  }

  close(): void {
    this.closed.emit();
  }

  onOverlayClick(): void {
    this.close();
  }

  onContentClick(event: MouseEvent): void {
    event.stopPropagation();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.close();
  }

  @HostListener('document:keydown.tab', ['$event'])
  @HostListener('document:keydown.shift.tab', ['$event'])
  onTab(event: KeyboardEvent): void {
    const dialog = this.dialogRef?.nativeElement;
    if (!dialog) return;

    const focusable = this.focusableElementsIn(dialog);
    if (focusable.length === 0) {
      event.preventDefault();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement as HTMLElement | null;

    if (event.shiftKey) {
      if (active === first || !dialog.contains(active)) {
        event.preventDefault();
        last.focus();
      }
    } else {
      if (active === last || !dialog.contains(active)) {
        event.preventDefault();
        first.focus();
      }
    }
  }

  private focusableElementsIn(root: HTMLElement): HTMLElement[] {
    const selector = [
      'a[href]',
      'button:not([disabled])',
      'input:not([disabled])',
      'textarea:not([disabled])',
      'select:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
    ].join(',');
    return Array.from(root.querySelectorAll<HTMLElement>(selector)).filter(
      (el) =>
        !el.hasAttribute('inert') &&
        el.offsetWidth + el.offsetHeight + el.getClientRects().length > 0,
    );
  }
}
