import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { LoadingController, ToastController } from '@ionic/angular';
import { DataService } from '../services/data.service';
import { Petition } from '../models/petition';
import { Support } from '../models/support';
import { SmartcontractService } from '../services/smartcontract.service';
import { WalletService } from '../services/wallet.service';

@Component({
  selector: 'app-view-petition',
  templateUrl: './view-petition.page.html',
  styleUrls: ['./view-petition.page.scss'],
})
export class ViewPetitionPage implements OnInit {

  public petition;
  public supporters;
  public isPetitionSupported = false;
  public myAddress: string;

  constructor(
    private data: DataService,
    private smartcontract: SmartcontractService,
    private wallet: WalletService,
    private activatedRoute: ActivatedRoute,
    private loading: LoadingController,
    private toast: ToastController) {}

  async ngOnInit() {
    const id = this.activatedRoute.snapshot.paramMap.get('id');
    if (this.smartcontract.isPointAvailable()) {
      this.petition = await this.smartcontract.getPetition(parseInt(id, 10));
      this.supporters = await this.getSupporters(parseInt(id, 10));
      this.myAddress = await this.wallet.getAddress();
      this.isPetitionSupported = this.supporters.reduce((prev, curr) => ( prev ||  (curr.supporter === this.myAddress)), false);
      console.log(this.supporters);
    }
    else {
      this.petition = await this.data.getPetition(parseInt(id, 10));
    }
  }

  getBackButtonText() {
    const win = window as any;
    const mode = win && win.Ionic && win.Ionic.mode;
    return mode === 'ios' ? 'Petitions' : '';
  }

  async getSupporters(id: number): Promise<Support[]> {
    // eslint-disable-next-line max-len
    return (await this.smartcontract.getSupportersForPetition(id)).map(s => ({ supporter: s[0], timestamp: parseInt(s[1], 10) }) as Support);
  }

  async supportPetition() {
    const id = this.activatedRoute.snapshot.paramMap.get('id');
    const loader = await this.loading.create({});
    await loader.present();
    const result = await this.smartcontract.supportPetition(parseInt(id, 10));
    console.log(result);
    await (await this.toast.create({ message: 'Your succesfully supported this petition', duration: 2000 })).present();
    await loader.dismiss();
    this.isPetitionSupported = true;
  }

}
