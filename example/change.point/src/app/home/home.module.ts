import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';

import { HomePage } from './home.page';
import { HomePageRoutingModule } from './home-routing.module';
import { PetitionComponentModule } from '../petition/petition.module';
import { AddPetitionPageModule } from '../add-petition/add-petition.module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    PetitionComponentModule,
    AddPetitionPageModule,
    HomePageRoutingModule
  ],
  declarations: [HomePage]
})
export class HomePageModule {}
