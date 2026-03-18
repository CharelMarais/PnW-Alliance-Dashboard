import { Routes } from '@angular/router';
import { WarDetailComponent } from './components/war-detail/war-detail';
import { AllianceDashboardComponent } from './components/alliance-dashboard/alliance-dashboard';

export const routes: Routes = [
  { path: '', component: AllianceDashboardComponent },
  { path: 'war/:id', component: WarDetailComponent },
  { path: 'alliance', redirectTo: '', pathMatch: 'full' },
  { path: '**', redirectTo: '' },
];
