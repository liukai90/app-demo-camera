import { NgModule } from '@angular/core';
import { BrowserModule, HammerModule } from '@angular/platform-browser';
import { RouteReuseStrategy } from '@angular/router';

import { IonicModule, IonicRouteStrategy } from '@ionic/angular';
import { SplashScreen } from '@ionic-native/splash-screen/ngx';
import { StatusBar } from '@ionic-native/status-bar/ngx';

import { AppComponent } from './app.component';
import { AppRoutingModule } from './app-routing.module';
import { HttpClientModule } from '@angular/common/http';
import { CameraService } from './service/camera.service';
import { ToastService } from './service/toast.service';
import { AlertService } from './service/alert.service';
import { PermissionService } from './service/permission.service';

@NgModule({
  declarations: [AppComponent],
  entryComponents: [],
  imports: [BrowserModule,  HammerModule, IonicModule.forRoot({
    rippleEffect: false,
    mode: 'ios',
    backButtonIcon: 'chevron-back'
  }), AppRoutingModule, HttpClientModule],
  providers: [
    StatusBar,
    SplashScreen,
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    CameraService,
    ToastService,
    AlertService,
    PermissionService
  ],
  bootstrap: [AppComponent]
})
export class AppModule {}
