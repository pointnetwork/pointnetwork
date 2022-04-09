import { Component, OnInit, Input } from '@angular/core';
import { Petition } from '../models/petition';

@Component({
  selector: 'app-petition',
  templateUrl: './petition.component.html',
  styleUrls: ['./petition.component.scss'],
})
export class PetitionComponent implements OnInit {
  @Input() petition: Petition;

  constructor() { }

  ngOnInit() {}

  isIos() {
    const win = window as any;
    return win && win.Ionic && win.Ionic.mode === 'ios';
  }
}
