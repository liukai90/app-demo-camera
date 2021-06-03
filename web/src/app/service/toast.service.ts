import { Injectable } from '@angular/core';
import { ToastController } from '@ionic/angular';

@Injectable({
  providedIn: 'root'
})
export class ToastService {

  constructor(private toastController: ToastController) { }

  
  // 成功消息提示
  async successPresentToast(msg: string) {
    const toast = await this.toastController.create({
      color: 'primary',
      message: msg,
      position: 'top',
      duration: 2000
    });
    toast.present();
  }

  // 失败消息提示
  async failPresentToast(msg: string) {
    const toast = await this.toastController.create({
      color: 'danger',
      message: msg,
      position: 'top',
      duration: 2000
    });
    toast.present();
  }
}
