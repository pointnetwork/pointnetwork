import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class WalletService {

  private point: any;

  constructor() {
    this.init();
  }

  async getAddress(): Promise<string> {
    const result = await this.point.wallet.address();
    if (!this.point) {
      throw new Error('ERROR_POINT_NOT_AVAILABLE');
    }
    else {
      if (result && result.status === 200) {
        return result.data.address;
      }
    }
    return null;
  }

  isPointAvailable(): boolean {
    return this.point;
  }

  private async init() {
    const win = window as any;
    this.point = win && win.point;
    if (!this.point) {
      console.error('window.point not detected, aborting');
    }
  }

}
