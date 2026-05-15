import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { I18nService } from '../../core/services/i18n.service';
import { Member } from '../../core/models/member.model';

@Component({
  selector: 'app-fundadors',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './fundadors.component.html',
  styleUrl: './fundadors.component.scss',
})
export class FundadorsComponent {
  protected i18n = inject(I18nService);

  team: Member[] = [
    {
      id: '1',
      name: 'Teo Arasa',
      role: 'Fundador & Comunitat',
      quote: 'Mentre hi hagi un camí, hi haurà una aventura.',
      imageUrl: '../../assets/images/fundadors/Teo.png',
      isFounder: true,
    },
    {
      id: '2',
      name: 'Robert Benet',
      role: 'Co-fundador & Cap de rutes',
      quote: 'Córrer ens connecta amb la terra i amb nosaltres.',
      imageUrl: '../../assets/images/fundadors/Robert.png',
      isFounder: true,
    },
    {
      id: '3',
      name: 'Jordi Escubedo',
      role: 'Co-fundador & Esdeveniments',
      quote: 'A XEIC, ningú corre sol mai.',
      imageUrl: '../../assets/images/fundadors/Jordi.png',
      isFounder: true,
    },
    {
      id: '4',
      name: 'Saber Chelli',
      role: 'Co-fundador & Logística',
      quote: 'El millor ritme és el que et fa feliç.',
      imageUrl: '../../assets/images/fundadors/Saber.png',
      isFounder: true,
    },
  ];
}
