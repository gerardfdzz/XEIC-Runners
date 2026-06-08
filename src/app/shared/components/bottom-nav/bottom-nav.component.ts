import { Component, inject } from '@angular/core';
import { RouterModule, RouterLinkActive } from '@angular/router';
import { I18nService } from '../../../core/services/i18n.service';

@Component({
  selector: 'app-bottom-nav',
  standalone: true,
  imports: [RouterModule, RouterLinkActive],
  templateUrl: './bottom-nav.component.html',
  styleUrl: './bottom-nav.component.scss',
})
export class BottomNavComponent {
  protected readonly i18n = inject(I18nService);

  protected readonly navItems: { route: string; exact: boolean; icon: string; labelKey: string }[] =
    [
      { route: '/', exact: true, icon: 'home', labelKey: 'nav.home' },
      { route: '/fundadors', exact: false, icon: 'groups', labelKey: 'nav.founders' },
      { route: '/esdeveniments', exact: false, icon: 'event', labelKey: 'nav.events' },
      { route: '/rutes', exact: false, icon: 'directions_run', labelKey: 'nav.routes' },
      { route: '/comunitat', exact: false, icon: 'photo_library', labelKey: 'nav.community' },
    ];
}
