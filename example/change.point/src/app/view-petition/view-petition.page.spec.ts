import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { ViewPetitionPageRoutingModule } from './view-petition-routing.module';

import { ViewPetitionPage } from './view-petition.page';

describe('ViewPetitionPage', () => {
  let component: ViewPetitionPage;
  let fixture: ComponentFixture<ViewPetitionPage>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ ViewPetitionPage ],
      imports: [IonicModule.forRoot(), ViewPetitionPageRoutingModule, RouterModule.forRoot([])]
    }).compileComponents();

    fixture = TestBed.createComponent(ViewPetitionPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
