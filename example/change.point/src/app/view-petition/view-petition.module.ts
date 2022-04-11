import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ViewPetitionPage } from './view-petition.page';

import { IonicModule } from '@ionic/angular';
import { PipesModule } from '../pipes/pipes.module';

import { ViewPetitionPageRoutingModule } from './view-petition-routing.module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    ViewPetitionPageRoutingModule,
    PipesModule
  ],
  declarations: [ViewPetitionPage]
})
export class ViewPetitionPageModule {}
