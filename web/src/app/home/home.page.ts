import { HttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
import { Camera } from '../model/camera';
import { CameraService } from '../service/camera.service';
import { PermissionService } from '../service/permission.service';
import { ToastService } from '../service/toast.service';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})
export class HomePage {

  // 设备列表
  cameraMap = new Map<string, Camera>();

  // 用户输入摄像头地址
  url = '';

  constructor(
    private cameraService: CameraService,
    private http: HttpClient,
    private toast: ToastService,
    private permissionService: PermissionService
    ) {
      this.cameraService.getCameraMapChange().subscribe((data: Map<string, Camera>) => {
        this.cameraMap = data;
      });
  }

  ngOnInit() {
    setTimeout(() => {
      this.permissionService.updatePermission(()=>{
        this.cameraService.getCameraList();
      });     
    }, 500);
  }

  /**
   * 进入某个设备详情页
   * @param camera 
   */
  getCameraDetailsPage(camera: Camera) {
    this.cameraService.getCameraDetails(camera);

  }

  
  /**
   * 搜索设备，有链接按照链接访问，无链接，自动搜索
   */
  searchCamera(){
    if (this.url) {
      this.cameraService.getCameraListByUrl(this.url);
    }else {
      this.cameraService.getCameraList();
    }
  }

}
