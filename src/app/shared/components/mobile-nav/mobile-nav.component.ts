import { Component, inject } from '@angular/core';
import { RouterModule, RouterLinkActive } from '@angular/router';
import { I18nService } from '../../../core/services/i18n.service';

@Component({
  selector: 'app-mobile-nav',
  standalone: true,
  imports: [RouterModule, RouterLinkActive],
  templateUrl: './mobile-nav.component.html',
  styleUrl: './mobile-nav.component.scss',
})
export class MobileNavComponent {
  protected i18n = inject(I18nService);
}
