import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { ViewPetitionPage } from './view-petition.page';

const routes: Routes = [
  {
    path: '',
    component: ViewPetitionPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ViewPetitionPageRoutingModule {}
