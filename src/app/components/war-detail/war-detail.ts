import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Location, DecimalPipe, DatePipe } from '@angular/common';
import { forkJoin } from 'rxjs';
import { PnwApiService } from '../../services/pnw-api.service';
import { WarDetail, NationDetail, WarAttack } from '../../models/pnw.models';

interface StrategySuggestion {
  action: string;
  reason: string;
  priority: 'high' | 'medium' | 'low';
}

@Component({
  selector: 'app-war-detail',
  imports: [RouterLink, DecimalPipe, DatePipe],
  templateUrl: './war-detail.html',
  styleUrl: './war-detail.scss',
})
export class WarDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private api = inject(PnwApiService);
  private location = inject(Location);

  war = signal<WarDetail | null>(null);
  attNation = signal<NationDetail | null>(null);
  defNation = signal<NationDetail | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);

  timeline = computed<WarAttack[]>(() => {
    const w = this.war();
    if (!w?.attacks) return [];
    return [...w.attacks].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  });

  attSuggestions = computed<StrategySuggestion[]>(() => {
    const w = this.war();
    const att = this.attNation();
    const def = this.defNation();
    if (!w || !att || !def) return [];
    return this.buildSuggestions(w, att, def, 'attacker');
  });

  defSuggestions = computed<StrategySuggestion[]>(() => {
    const w = this.war();
    const att = this.attNation();
    const def = this.defNation();
    if (!w || !att || !def) return [];
    return this.buildSuggestions(w, def, att, 'defender');
  });

  goBack() {
    this.location.back();
  }

  ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id) {
      this.error.set('Invalid war ID');
      this.loading.set(false);
      return;
    }

    this.api.getWarDetail(id).subscribe({
      next: (war) => {
        this.war.set(war);
        forkJoin({
          att: this.api.getNation(war.att_id),
          def: this.api.getNation(war.def_id),
        }).subscribe({
          next: ({ att, def }) => {
            this.attNation.set(att);
            this.defNation.set(def);
            this.loading.set(false);
          },
          error: () => {
            this.loading.set(false);
          },
        });
      },
      error: () => {
        this.error.set('Failed to load war details.');
        this.loading.set(false);
      },
    });
  }

  getAttackIcon(type: string): string {
    const icons: Record<string, string> = {
      GROUND: '🪖',
      AIRVINFRA: '✈️',
      AIRVSOLDIERS: '✈️',
      AIRVTANKS: '✈️',
      AIRVMONEY: '✈️',
      AIRVSHIPS: '✈️',
      AIRVAIR: '✈️',
      NAVAL: '🚢',
      MISSILE: '🚀',
      NUKE: '☢️',
      PEACE: '🕊️',
      VICTORY: '🏆',
      ALLIANCELOOT: '💰',
      FORTIFY: '🏰',
    };
    return icons[type] ?? '⚔️';
  }

  getAttackLabel(type: string): string {
    const labels: Record<string, string> = {
      GROUND: 'Ground Attack',
      AIRVINFRA: 'Airstrike (Infra)',
      AIRVSOLDIERS: 'Airstrike (Soldiers)',
      AIRVTANKS: 'Airstrike (Tanks)',
      AIRVMONEY: 'Airstrike (Money)',
      AIRVSHIPS: 'Airstrike (Ships)',
      AIRVAIR: 'Airstrike (Aircraft)',
      NAVAL: 'Naval Attack',
      MISSILE: 'Missile Strike',
      NUKE: 'Nuclear Strike',
      PEACE: 'Peace',
      VICTORY: 'Victory',
      ALLIANCELOOT: 'Alliance Loot',
      FORTIFY: 'Fortify',
    };
    return labels[type] ?? type;
  }

  getSuccessLabel(success: number): string {
    switch (success) {
      case 3: return 'Immense Triumph';
      case 2: return 'Moderate Success';
      case 1: return 'Pyrrhic Victory';
      case 0: return 'Utter Failure';
      default: return 'Unknown';
    }
  }

  getSuccessClass(success: number): string {
    switch (success) {
      case 3: return 'triumph';
      case 2: return 'success';
      case 1: return 'pyrrhic';
      case 0: return 'failure';
      default: return '';
    }
  }

  isAttackerAction(attack: WarAttack): boolean {
    const w = this.war();
    return w ? attack.att_id === w.att_id : false;
  }

  private buildSuggestions(
    war: WarDetail,
    me: NationDetail,
    enemy: NationDetail,
    role: 'attacker' | 'defender'
  ): StrategySuggestion[] {
    const suggestions: StrategySuggestion[] = [];
    const myRes = role === 'attacker' ? war.att_resistance : war.def_resistance;
    const enemyRes = role === 'attacker' ? war.def_resistance : war.att_resistance;

    // Check for air superiority
    if (me.aircraft > enemy.aircraft * 1.5) {
      suggestions.push({
        action: 'Airstrike enemy infrastructure',
        reason: `You have air superiority (${me.aircraft} vs ${enemy.aircraft} aircraft). Maximize damage with airstrikes on infra.`,
        priority: 'high',
      });
    } else if (me.aircraft < enemy.aircraft * 0.5) {
      suggestions.push({
        action: 'Rebuild aircraft before engaging in air',
        reason: `Enemy has air superiority (${enemy.aircraft} vs ${me.aircraft}). Avoid airstrikes until you rebuild.`,
        priority: 'high',
      });
    }

    // Ground advantage
    if (me.soldiers > 0 && me.tanks > 0) {
      const myGround = me.soldiers * 1.75 + me.tanks * 40;
      const enemyGround = enemy.soldiers * 1.75 + enemy.tanks * 40;
      if (myGround > enemyGround * 1.3) {
        suggestions.push({
          action: 'Launch ground attacks',
          reason: 'Your ground forces significantly outmatch the enemy. Ground attacks will drain their resistance quickly.',
          priority: 'high',
        });
      }
    }

    // Naval
    if (me.ships > enemy.ships && enemy.ships > 0) {
      suggestions.push({
        action: 'Use naval attacks to establish blockade',
        reason: `You have ${me.ships} ships vs ${enemy.ships}. A successful naval attack can establish a blockade, cutting their income.`,
        priority: 'medium',
      });
    }

    // Nukes
    if (me.nukes > 0) {
      suggestions.push({
        action: 'Consider nuclear strike',
        reason: `You have ${me.nukes} nuke(s) available. A nuclear strike devastates infra and military, but causes radiation.`,
        priority: enemyRes > 50 ? 'medium' : 'low',
      });
    }

    // Missiles
    if (me.missiles > 0) {
      suggestions.push({
        action: 'Launch missile strikes',
        reason: `You have ${me.missiles} missile(s). These bypass military and directly hit infrastructure.`,
        priority: 'medium',
      });
    }

    // Resistance-based
    if (enemyRes <= 25 && enemyRes > 0) {
      suggestions.push({
        action: 'Push to finish — enemy resistance is critical',
        reason: `Enemy has only ${enemyRes} resistance left. A few more attacks should end the war.`,
        priority: 'high',
      });
    }

    if (myRes <= 20) {
      suggestions.push({
        action: 'Consider offering peace',
        reason: `Your resistance is critically low (${myRes}). You may lose more by continuing than by accepting peace.`,
        priority: 'high',
      });
    }

    // Peace status
    if (role === 'attacker' && war.def_peace && !war.att_peace) {
      suggestions.push({
        action: 'Defender has offered peace — review terms',
        reason: 'The defender wants peace. Accept if your objectives are met, or press advantage if resistance allows.',
        priority: 'medium',
      });
    } else if (role === 'defender' && war.att_peace && !war.def_peace) {
      suggestions.push({
        action: 'Attacker has offered peace — review terms',
        reason: 'Attacker wants peace. Consider accepting if you are low on resources.',
        priority: 'medium',
      });
    }

    // Score/city analysis
    if (me.num_cities < enemy.num_cities && me.score < enemy.score) {
      suggestions.push({
        action: 'Focus on guerrilla strategy',
        reason: `Enemy is larger (${enemy.num_cities}c vs ${me.num_cities}c). Use cheaper attacks to maximize cost ratio.`,
        priority: 'medium',
      });
    }

    // Fortify
    if (role === 'defender' && myRes > 50 && me.soldiers > 0) {
      suggestions.push({
        action: 'Fortify to boost resistance',
        reason: 'Fortifying increases your resistance and makes it harder for the attacker to win.',
        priority: 'low',
      });
    }

    // If no suggestions, generic
    if (suggestions.length === 0) {
      suggestions.push({
        action: 'Continue current strategy',
        reason: 'No clear advantage or disadvantage detected. Maintain pressure with available forces.',
        priority: 'medium',
      });
    }

    return suggestions;
  }
}
