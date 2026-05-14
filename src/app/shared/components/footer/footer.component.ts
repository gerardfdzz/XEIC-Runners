import { Component, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { I18nService } from '../../../core/services/i18n.service';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [RouterModule],
  templateUrl: './footer.component.html',
  styleUrl: './footer.component.scss',
})
export class FooterComponent {
  protected i18n = inject(I18nService);
}
