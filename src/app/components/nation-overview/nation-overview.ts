import { Component, input } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { Nation } from '../../models/pnw.models';

@Component({
  selector: 'app-nation-overview',
  imports: [DecimalPipe],
  templateUrl: './nation-overview.html',
  styleUrl: './nation-overview.scss',
})
export class NationOverviewComponent {
  nation = input.required<Nation>();
}
