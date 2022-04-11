import { NgModule } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { IdentityPipe } from './identity.pipe';

@NgModule({
    declarations: [IdentityPipe],
    imports: [IonicModule],
    exports: [IdentityPipe]
})

export class PipesModule {}
