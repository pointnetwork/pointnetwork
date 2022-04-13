import { Component } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { DataService } from '../services/data.service';
import { AddPetitionPage } from '../add-petition/add-petition.page';
import { Petition } from '../models/petition';
import { SmartcontractService } from '../services/smartcontract.service';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})
export class HomePage {
  constructor(private modal: ModalController,
              public contract: SmartcontractService,
              public data: DataService) {
}

  async refresh(ev) {
    await this.contract.refresh();
    if (ev) {
      ev.detail.complete();
    }
  }

  async addPetition() {
    const info = await this.modal.create({
      component:  AddPetitionPage,
    });
    await info.present();
  }


}
