import { Component, input } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Alliance } from '../../models/pnw.models';

@Component({
  selector: 'app-alliance-panel',
  imports: [DecimalPipe, RouterLink],
  templateUrl: './alliance-panel.html',
  styleUrl: './alliance-panel.scss',
})
export class AlliancePanelComponent {
  alliance = input.required<Alliance>();
}
