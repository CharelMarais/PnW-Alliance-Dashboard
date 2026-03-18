import { Component, OnInit, inject, signal } from '@angular/core';
import { forkJoin } from 'rxjs';
import { PnwApiService } from '../../services/pnw-api.service';
import { Nation, War, Alliance, TradePrice } from '../../models/pnw.models';
import { NationOverviewComponent } from '../nation-overview/nation-overview';
import { MilitaryOverviewComponent } from '../military-overview/military-overview';
import { WarsPanelComponent } from '../wars-panel/wars-panel';
import { AlliancePanelComponent } from '../alliance-panel/alliance-panel';
import { TradePricesComponent } from '../trade-prices/trade-prices';

@Component({
  selector: 'app-dashboard',
  imports: [
    NationOverviewComponent,
    MilitaryOverviewComponent,
    WarsPanelComponent,
    AlliancePanelComponent,
    TradePricesComponent,
  ],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class DashboardComponent implements OnInit {
  private api = inject(PnwApiService);

  nation = signal<Nation | null>(null);
  wars = signal<War[]>([]);
  alliance = signal<Alliance | null>(null);
  topAlliances = signal<Alliance[]>([]);
  tradePrices = signal<TradePrice | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.loading.set(true);
    this.error.set(null);

    forkJoin({
      nation: this.api.getMyNation(),
      wars: this.api.getActiveWars(),
      tradePrices: this.api.getTradePrices(),
      topAlliances: this.api.getTopAlliances(5),
    }).subscribe({
      next: ({ nation, wars, tradePrices, topAlliances }) => {
        this.nation.set(nation);
        this.wars.set(wars);
        this.tradePrices.set(tradePrices);
        this.topAlliances.set(topAlliances);

        if (nation.alliance_id) {
          this.api.getAlliance(nation.alliance_id).subscribe({
            next: (alliance) => this.alliance.set(alliance),
          });
        }

        this.loading.set(false);
      },
      error: () => {
        this.error.set(
          'Failed to load dashboard data. Please check your API key.'
        );
        this.loading.set(false);
      },
    });
  }
}
