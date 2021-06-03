import { Component, ViewChild } from '@angular/core';
import { Platform } from '@ionic/angular';
import { SplashScreen } from '@ionic-native/splash-screen/ngx';
import { StatusBar } from '@ionic-native/status-bar/ngx';
import { EdgerReqPermsParams } from '@edgeros/web-sdk';
import { ToastService } from './service/toast.service';
import { HttpClient } from '@angular/common/http';
import { PermissionService } from './service/permission.service';
import { ActivationStart, Router, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss']
})
export class AppComponent {

  constructor(
    private platform: Platform,
    private splashScreen: SplashScreen,
    private statusBar: StatusBar,
    private toast: ToastService,
    // private permissionService: PermissionService
  ) {
    this.initializeApp(); 
    console.log('app---------------------------');
  }

  ngOnInit(): void {
  }




  initializeApp() {
    this.platform.ready().then(() => {
      this.statusBar.styleDefault();
      this.splashScreen.hide();
    });
  }
}
