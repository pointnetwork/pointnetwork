import { Pipe, PipeTransform } from '@angular/core';
import { IdentityService } from '../services/identity.service';

@Pipe({
  name: 'identity'
})
export class IdentityPipe implements PipeTransform {

  constructor(private identity: IdentityService) {}

  async transform(value: string): Promise<string> {
    return this.identity.ownerToIdentity(value);
  }

}
