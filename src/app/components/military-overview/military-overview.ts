import { Component, input, computed } from '@angular/core';
import { DecimalPipe, PercentPipe } from '@angular/common';
import { Nation } from '../../models/pnw.models';

export interface MilitaryUnit {
  icon: string;
  label: string;
  current: number;
  cap: number;
  available: number;
  fillPercent: number;
}

@Component({
  selector: 'app-military-overview',
  imports: [DecimalPipe, PercentPipe],
  templateUrl: './military-overview.html',
  styleUrl: './military-overview.scss',
})
export class MilitaryOverviewComponent {
  nation = input.required<Nation>();

  // Per-city caps from PnW game mechanics
  private readonly caps = {
    soldiers: 15000,
    tanks: 1250,
    aircraft: 75,
    ships: 15,
  };

  units = computed<MilitaryUnit[]>(() => {
    const n = this.nation();
    const cities = n.num_cities;

    const capped = [
      { icon: '🪖', label: 'Soldiers', current: n.soldiers, cap: cities * this.caps.soldiers },
      { icon: '🛡️', label: 'Tanks', current: n.tanks, cap: cities * this.caps.tanks },
      { icon: '✈️', label: 'Aircraft', current: n.aircraft, cap: cities * this.caps.aircraft },
      { icon: '🚢', label: 'Ships', current: n.ships, cap: cities * this.caps.ships },
    ];

    return capped.map((u) => ({
      ...u,
      available: Math.max(0, u.cap - u.current),
      fillPercent: u.cap > 0 ? Math.min(100, (u.current / u.cap) * 100) : 0,
    }));
  });

  specials = computed(() => {
    const n = this.nation();
    return [
      { icon: '🚀', label: 'Missiles', current: n.missiles },
      { icon: '☢️', label: 'Nukes', current: n.nukes },
    ];
  });
}
