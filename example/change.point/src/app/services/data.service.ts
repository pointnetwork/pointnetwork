import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

import { Petition } from '../models/petition';

@Injectable({
  providedIn: 'root'
})
export class DataService {

  public petition$ = new BehaviorSubject<Petition[]>([]);

  constructor() {
    this.init();
  }

  public async getPetitions(): Promise<Petition[]> {
      return [
        {
          author: 'John Doe',
          title: 'Forbid pineapple as a pizza topping',
          // eslint-disable-next-line max-len
          content: 'Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.',
          timestamp: 1649086576,
          id: 0,
        }
      ];
  }

  public async getPetition(id: number): Promise<Petition> {
    return {
      author: 'John Doe',
      title: 'Forbid pineapple as a pizza topping',
      // eslint-disable-next-line max-len
      content: 'Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.',
      timestamp: 1649086576,
      id: 0,
    };
  }

  private async init() {
    const petitions = await this.getPetitions();
    this.petition$.next(petitions);
  }

}
