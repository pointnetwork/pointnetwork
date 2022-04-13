import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { PipesModule } from '../pipes/pipes.module';

import { IonicModule } from '@ionic/angular';

import { PetitionComponent } from './petition.component';

@NgModule({
  imports: [ CommonModule, FormsModule, IonicModule, RouterModule, PipesModule],
  declarations: [PetitionComponent],
  exports: [PetitionComponent]
})
export class PetitionComponentModule {}
