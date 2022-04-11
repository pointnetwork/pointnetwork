import { Component, OnInit } from '@angular/core';
import { LoadingController, ModalController, ToastController } from '@ionic/angular';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { SmartcontractService } from '../services/smartcontract.service';

@Component({
  selector: 'app-add-petition',
  templateUrl: './add-petition.page.html',
  styleUrls: ['./add-petition.page.scss'],
})
export class AddPetitionPage implements OnInit {

  public petitionForm: FormGroup;

  constructor(private modal: ModalController,
              private formBuilder: FormBuilder,
              private smartcontract: SmartcontractService,
              private toast: ToastController,
              private loading: LoadingController) {

    this.petitionForm = formBuilder.group({
      title: [null, Validators.compose([Validators.required, Validators.minLength(10)])],
      content: [null, Validators.compose([Validators.required, Validators.minLength(10)])],
    });
  }

  ngOnInit() {
  }

  async createPetition() {
    const loader = await this.loading.create({});
    await loader.present();
    if (this.smartcontract.isPointAvailable()) {
      await this.smartcontract.createPetition(this.petitionForm.value.title,this.petitionForm.value.content);
    }
    else {
      console.warn(`Create petition ${JSON.stringify(this.petitionForm.value)}`);
    }
    await loader.dismiss();
    await (await this.toast.create({ message: 'Your petition was successfully posted', duration: 2000 })).present();
    this.close();
  }

  async close() {
    this.modal.dismiss();
  }

}
