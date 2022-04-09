import { TestBed } from '@angular/core/testing';

import { SmartcontractService } from './smartcontract.service';

describe('SmartcontractService', () => {
  let service: SmartcontractService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SmartcontractService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
