import { Component, input } from '@angular/core';
import { DecimalPipe, DatePipe } from '@angular/common';
import { TradePrice } from '../../models/pnw.models';

@Component({
  selector: 'app-trade-prices',
  imports: [DecimalPipe, DatePipe],
  templateUrl: './trade-prices.html',
  styleUrl: './trade-prices.scss',
})
export class TradePricesComponent {
  prices = input.required<TradePrice>();

  resources = [
    { key: 'food', label: 'Food', icon: '🌾' },
    { key: 'coal', label: 'Coal', icon: '⚫' },
    { key: 'oil', label: 'Oil', icon: '🛢️' },
    { key: 'uranium', label: 'Uranium', icon: '☢️' },
    { key: 'iron', label: 'Iron', icon: '⛓️' },
    { key: 'bauxite', label: 'Bauxite', icon: '🪨' },
    { key: 'lead', label: 'Lead', icon: '🔩' },
    { key: 'gasoline', label: 'Gasoline', icon: '⛽' },
    { key: 'munitions', label: 'Munitions', icon: '💣' },
    { key: 'steel', label: 'Steel', icon: '🔧' },
    { key: 'aluminum', label: 'Aluminum', icon: '🪙' },
    { key: 'credits', label: 'Credits', icon: '💰' },
  ];

  getPrice(key: string): number {
    return (this.prices() as unknown as Record<string, number>)[key] ?? 0;
  }
}
