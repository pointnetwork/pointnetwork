import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class IdentityService {

  private point: any;

  constructor() {
    this.init();
  }

  isPointAvailable(): boolean {
    return this.point;
  }

  async ownerToIdentity(owner: string): Promise<string> {

    const result = await this.point.identity.ownerToIdentity({owner});

    if (result.status === 200) {
      return result.data.identity;
    }

    return null;
  }

  private async init() {
    const win = window as any;
    this.point = win && win.point;
  }

}
