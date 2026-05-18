import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { I18nService } from '../../core/services/i18n.service';
import { StravaService } from '../../core/services/strava.service';
import { SeoService } from '../../core/services/seo.service';
import { Member } from '../../core/models/member.model';

@Component({
  selector: 'app-fundadors',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './fundadors.component.html',
  styleUrl: './fundadors.component.scss',
})
export class FundadorsComponent implements OnInit {
  protected i18n = inject(I18nService);
  private strava = inject(StravaService);
  private seo = inject(SeoService);

  memberCount = signal<string>('...');

  ngOnInit(): void {
    this.seo.update({
      title: 'Fundadors · XEIC RUNNERS',
      description: 'Coneix l\'equip fundador de XEIC RUNNERS: quatre amics de La Sénia que van crear el club de running més actiu de les Terres de l\'Ebre. La seva història i valors.',
      keywords: 'fundadors XEIC RUNNERS, equip XEIC runners, història club running La Sénia, Teo Arasa, running social Terres Ebre',
      ogImage: 'https://apropebre.cat/wp-content/uploads/2026/04/DSC09145-1024x683.jpg',
    });

    this.strava.getData().subscribe((data) => {
      if (data?.club?.member_count) {
        this.memberCount.set(`${data.club.member_count}`);
      }
    });
  }

  team: Member[] = [
    {
      id: '1',
      name: 'Teo Arasa',
      role: 'founders.team.teo.role',
      quote: 'founders.team.teo.quote',
      imageUrl: '../../assets/images/fundadors/Teo.png',
      isFounder: true,
    },
    {
      id: '2',
      name: 'Robert Benet',
      role: 'founders.team.robert.role',
      quote: 'founders.team.robert.quote',
      imageUrl: '../../assets/images/fundadors/Robert.png',
      isFounder: true,
    },
    {
      id: '3',
      name: 'Jordi Escubedo',
      role: 'founders.team.jordi.role',
      quote: 'founders.team.jordi.quote',
      imageUrl: '../../assets/images/fundadors/Jordi.png',
      isFounder: true,
    },
    {
      id: '4',
      name: 'Saber Chelli',
      role: 'founders.team.saber.role',
      quote: 'founders.team.saber.quote',
      imageUrl: '../../assets/images/fundadors/Saber.png',
      isFounder: true,
    },
  ];
}
