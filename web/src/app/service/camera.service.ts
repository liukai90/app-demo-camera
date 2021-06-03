import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { ActivatedRoute, Router} from '@angular/router';
import { edger } from '@edgeros/web-sdk';
import {
  NavController
} from '@ionic/angular';
import { BehaviorSubject } from 'rxjs';
import { Camera } from '../model/camera';
import { AlertService } from './alert.service';
import { PermissionService } from './permission.service';
import { ToastService } from './toast.service';


@Injectable({
  providedIn: 'root',
})
export class CameraService {

  // 包含token和srand
  private payload: any = {
    token: 'token',
    srand: 'srand'
  };

  // 设备列表观察者对象
  cameraMapChange = new BehaviorSubject<Map<string, Camera>>(
    new Map<string, Camera>()
  );

  // 当前设备信息 可观察对象
  thisCameraChange = new BehaviorSubject<Camera>(null);

  // 设备列表
  cameraMap = new Map<string, Camera>();

  // 当前设备
  thisCamera: Camera;

  // 判断当前的列表元素是否被锁定，防止二次点击
  detailsLock = false;

  constructor(
    private http: HttpClient,
    private toastService: ToastService,
    private router: Router,
    private nav: NavController,
    private alertService: AlertService,
    private permissionService: PermissionService,
    private activeRoute: ActivatedRoute
  ) {
    edger.token().then((data: any) => {
      if(data) {
        this.payload = data;
      } else {
        this.toastService.failPresentToast('请先登录！');
      }

    }).catch((err) => {
      console.error(err);
    });
    edger.onAction('token', (data: any) => {
      console.log(data);
      if(data) {
        this.payload = data;
      } else {
        this.toastService.failPresentToast('请先登录！');
      }

    });
    setTimeout(()=>this.timerGetCameraList(), 500);
  }

  /**
   * 根据url搜索特定摄像头
   * @param url 
   */
  getCameraListByUrl(url: string) {
    if(this.permissionService.isPermissions(['network'])) {
      this.http
      .get('/api/search' + '?url=' + url, { headers: this.getHttpHeaders() })
      .subscribe(
        (cameras: Camera[]) => {
          if (cameras === null || cameras.length === 0) {
            this.toastService.failPresentToast('未发现设备！');
          }
          cameras.forEach((value) => {
            if (!this.cameraMap.has(value.devId)) {
              this.cameraMap.set(value.devId, value);
            } else {
              this.toastService.successPresentToast(`设备：${value.devId}已存在`);
            }
          });
          this.cameraMapChange.next(this.cameraMap);
        },
        (error) => {
          console.log(error);
          this.toastService.failPresentToast(error.error);
        }
      );
    }
  }

  /**
   * 定时查询设备列表
   */
  timerGetCameraList() {
      setInterval(() => this.getCameraList(), 5000); 
  }

  /**
   * 查询设备列表
   */
  getCameraList() {
    let permission = this.permissionService.isPermissions(['network']);
    if(permission) {
      this.http
      .get('/api/list', { headers: this.getHttpHeaders() })
      .subscribe((cameras: Camera[]) => {
        this.cameraMap.clear();
        cameras.forEach((value) => {
          this.cameraMap.set(value.devId, value);
        });
        this.cameraMapChange.next(this.cameraMap);
        if (this.thisCamera) {
          if (this.cameraMap.has(this.thisCamera.devId)) {
            if (this.cameraMap.get(this.thisCamera.devId).status) {
              this.thisCamera = this.cameraMap.get(this.thisCamera.devId);
            } else {
              this.lostAlertConfirm(
                `当前设备：${this.thisCamera.alias} 已下线！`
              );
              this.thisCamera = null;
            }
          } else {
            this.lostAlertConfirm(
              `当前设备：${this.thisCamera.alias} 已下线！`
            );
            this.thisCamera = null;
          }
        }
      });
    }
  }


  /**
   * 打开某个摄像头
   * @param camera 
   */
  getCameraDetails(camera: Camera) {
    console.log(this.activeRoute);
    if(this.permissionService.isPermissions(['rtsp'])) {
      if (this.detailsLock) {
        return;
      }
    this.detailsLock = true; 
    console.log(`getCameraDetails--------------${camera}`);
      this.http
      .get('/api/select/' + '?devId=' + camera.devId, {
        headers: this.getHttpHeaders(),
      })
      .subscribe(
        (res: any) => {
          if (res === 'error') {
            this.toastService.failPresentToast(`连接不到设备 ${camera.devId}`);
            this.detailsLock = false;
          } else if (res === 'invalid') {
            this.toastService.failPresentToast(`查找不到设备 ${camera.devId}`);
            this.cameraMap.delete(camera.devId);
            this.cameraMapChange.next(this.cameraMap);
            this.detailsLock = false;
          } else {
            if (res.result) {
              if (res.login) {
                this.detailsLock = false;
                this.loginDevicePresentAlertPrompt(camera);
              } else {
                camera.videoUrl = res.videoUrl;
                camera.enableMove = res.enableMove;
                camera.autoMode = res.autoMode;
                this.thisCamera = camera;
                console.log(`logintrue-----------${JSON.stringify(camera)}`);
                this.router.navigate(['/details', camera]);
                this.detailsLock = false;
              }
            } else {
              this.toastService.failPresentToast(res.msg);
              this.detailsLock = false;
            }
          }
        },
        (error) => {
          console.log(error);
          this.detailsLock = false;
          this.toastService.failPresentToast(error.error);
        }
      );
    } 
  }

  // 获取设备列表可观察对象
  getCameraMapChange() {
    return this.cameraMapChange;
  }

  // 获取当前设备可观察对象
  getThisCameraChange() {
    return this.thisCameraChange;
  }

  /**
   * 设备掉线提示框
   * @param msg 
   */
  async lostAlertConfirm(msg: string) {
    this.alertService.lostAlertConfirm(msg, () => {
      console.log(this.router.url);
      if (!this.router.url.includes('home')) {
        this.nav.back();
      }
    })
  }

  /**
   * 登录设备
   * @param loginInfo 
   * @param camera 
   */
  loginDevice(loginInfo: any, camera: Camera) {
    console.log(`login device-------------------------`);
    this.http.post('/api/login', loginInfo, {headers: this.getHttpHeaders()}).subscribe((res: any) => {
      console.log(res);
      if (!res.result) {
        this.toastService.failPresentToast(res.msg);
      } else {
        camera.videoUrl = res.videoUrl;
        camera.enableMove = res.enableMove;
        camera.autoMode = res.autoMode;
        this.thisCamera = camera;
        this.router.navigate(['/details', camera]);
      }
      this.detailsLock = false;
    }, (err) => {
      console.log(`err----------------------------`);
      console.error(err);
      this.detailsLock = false;
    });
  }

  /**
   * 登录框
   * @param camera 
   */
  async loginDevicePresentAlertPrompt(camera: Camera) {
    this.alertService.loginDevicePresentAlertPrompt(camera, (loginInfo) => {
      this.detailsLock = true;
      this.loginDevice(loginInfo, camera);
    });
  }

  getPayload(): any {
    return this.payload;
  }

  getHttpHeaders() {
    return new HttpHeaders().set('edger-token', this.payload.token).
    set('edger-srand', this.payload.srand);
  }
}
