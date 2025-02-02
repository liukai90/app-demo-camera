import { Injectable } from '@angular/core';
import { AlertController } from '@ionic/angular';
import { Camera } from '../model/camera';

@Injectable({
  providedIn: 'root'
})
export class AlertService {

  constructor(private alertController: AlertController) { }

  /**
   * 设备掉线提示框
   * @param msg 
   */
  async lostAlertConfirm(msg: string, callback: ()=> void) {
    const alert = await this.alertController.create({
      cssClass: 'my-custom-class',
      header: '设备信息',
      message: `<strong>${msg}</strong>!!!`,
      buttons: [
        {
          text: '确定',
          handler: () => {
            callback();
          },
        },
      ],
    });

    await alert.present();
  }

  /**
   * 登录框
   * @param camera 
   */
  async loginDevicePresentAlertPrompt(camera: Camera, callback: (data: any) => void) {
    const alert = await this.alertController.create({
      cssClass: 'my-custom-class',
      header: '登录设备',
      inputs: [
        {
          name: 'username',
          type: 'text',
          value: 'admin',
          placeholder: '请输入用户名',
        },
        {
          name: 'password',
          type: 'text',
          value: 'admin',
          placeholder: '请输入密码',
        },
      ],
      buttons: [
        {
          text: '返回',
          role: 'cancel',
          cssClass: 'secondary',
          handler: () => {
            console.log('Confirm Cancel');
          },
        },
        {
          text: '登录',
          handler: (value) => {
            console.log(value);
            const loginInfo = {
              devId: camera.devId,
              username: value.username,
              password: value.password,
            };
            callback(loginInfo);
          },
        },
      ],
    });
    await alert.present();
  }

}
