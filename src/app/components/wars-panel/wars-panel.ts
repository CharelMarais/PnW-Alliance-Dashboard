import { Component, input, computed, signal, inject, OnInit, effect } from '@angular/core';
import { RouterLink } from '@angular/router';
import { War, WarTab, Alliance } from '../../models/pnw.models';
import { PnwApiService } from '../../services/pnw-api.service';

@Component({
  selector: 'app-wars-panel',
  imports: [RouterLink],
  templateUrl: './wars-panel.html',
  styleUrl: './wars-panel.scss',
})
export class WarsPanelComponent implements OnInit {
  private api = inject(PnwApiService);

  wars = input.required<War[]>();
  nationId = input.required<number>();
  myAllianceId = input<number>(0);
  topAlliances = input<Alliance[]>([]);

  activeTabId = signal('global');
  tabs = signal<WarTab[]>([]);

  constructor() {
    // Rebuild tabs when inputs change
    effect(() => {
      const allWars = this.wars();
      const allianceId = this.myAllianceId();
      const topAlliances = this.topAlliances();
      this.buildTabs(allWars, allianceId, topAlliances);
    });
  }

  ngOnInit() {}

  private buildTabs(allWars: War[], myAllianceId: number, topAlliances: Alliance[]) {
    const newTabs: WarTab[] = [
      {
        id: 'global',
        label: 'Global',
        wars: allWars,
        loading: false,
      },
      {
        id: 'my-alliance',
        label: 'My Alliance',
        allianceId: myAllianceId || undefined,
        wars: myAllianceId
          ? allWars.filter(
              (w) =>
                w.attacker.alliance?.id === myAllianceId ||
                w.defender.alliance?.id === myAllianceId
            )
          : [],
        loading: false,
      },
    ];

    for (const alliance of topAlliances) {
      newTabs.push({
        id: `alliance-${alliance.id}`,
        label: alliance.acronym || alliance.name,
        allianceId: alliance.id,
        wars: [],
        loading: false,
      });
    }

    this.tabs.set(newTabs);
  }

  activeTab = computed(() => {
    return this.tabs().find((t) => t.id === this.activeTabId()) ?? this.tabs()[0];
  });

  selectTab(tabId: string) {
    this.activeTabId.set(tabId);

    const tab = this.tabs().find((t) => t.id === tabId);
    if (tab && tab.allianceId && tab.wars.length === 0 && !tab.loading && tab.id !== 'my-alliance') {
      this.loadAllianceWars(tab);
    }
  }

  private loadAllianceWars(tab: WarTab) {
    this.updateTab(tab.id, { loading: true });

    this.api.getWarsByAlliance(tab.allianceId!).subscribe({
      next: (wars) => {
        this.updateTab(tab.id, { wars, loading: false });
      },
      error: () => {
        this.updateTab(tab.id, { loading: false });
      },
    });
  }

  private updateTab(tabId: string, patch: Partial<WarTab>) {
    this.tabs.update((tabs) =>
      tabs.map((t) => (t.id === tabId ? { ...t, ...patch } : t))
    );
  }

  getWarClass(war: War): string {
    if (war.att_id === this.nationId()) return 'attacking';
    if (war.def_id === this.nationId()) return 'defending';
    return '';
  }

  getResistancePercent(resistance: number): number {
    return Math.max(0, Math.min(100, resistance));
  }
}
