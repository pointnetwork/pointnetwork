import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

import { Petition } from '../models/petition';
import { PetitionComponent } from '../petition/petition.component';

@Injectable({
  providedIn: 'root'
})
export class SmartcontractService {

  public petition$ = new BehaviorSubject<Petition[]>([]);
  private point: any;

  constructor() {
    this.init();
  }

  async getPetitions(): Promise<Petition[]> {

    if (!this.point) {
      throw new Error('ERROR_POINT_NOT_AVAILABLE');
    }
    else {
      const result = await this.point.contract.call({contract: 'Change', method: 'getPetitions'});
      const petitions =  await Promise.all<Petition>(result.data.map(index => this.getPetition(parseInt(index, 10))));
      console.log(petitions);
      return petitions;
    }
  }

  async createPetition(title: string, content: string) {

    if (!this.point) {
      throw new Error('ERROR_POINT_NOT_AVAILABLE');
    }
    else {
      const result = await this.point.contract.send({contract: 'Change', method: 'createPetition', params: [title, content]});
      console.log(result);
      return true;
    }

  }

  async supportPetition(id: number) {

    if (!this.point) {
      throw new Error('ERROR_POINT_NOT_AVAILABLE');
    }
    else {
      const result = await this.point.contract.send({contract: 'Change', method: 'supportPetition', params: [id]});
      console.log(result);
      return true;
    }

  }

  async getSupportersForPetition(id: number) {

    if (!this.point) {
      throw new Error('ERROR_POINT_NOT_AVAILABLE');
    }
    else {
      const result = await this.point.contract.call({contract: 'Change', method: 'getSupportersForPetition', params: [id]});
      console.log(result);
      return result.data;
    }

  }


  async getPetition(id: number): Promise<Petition> {

    if (!this.point) {
      throw new Error('ERROR_POINT_NOT_AVAILABLE');
    }
    else {
      const result = await this.point.contract.call({contract: 'Change', method: 'getPetition', params: [id]});
      return {
        id: parseInt(result.data[0], 10),
        author: result.data[1],
        title: result.data[2],
        content: result.data[3],
        timestamp: parseInt(result.data[4], 10)
      } as Petition;
    }

  }

  isPointAvailable(): boolean {
    return this.point;
  }

  public async refresh() {
    const petitions = await this.getPetitions();
    this.petition$.next(petitions);
  }

  private async init() {
    const win = window as any;
    this.point = win && win.point;
    if (this.point) {
      this.refresh();
    }
    else {
      console.error('window.point not detected, aborting');
    }
  }

}
