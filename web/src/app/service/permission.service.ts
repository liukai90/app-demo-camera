import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { edger, EdgerReqPermsParams } from '@edgeros/web-sdk';
import { ToastService } from './toast.service';
@Injectable({
  providedIn: 'root'
})
export class PermissionService {

  permissionTable = new Map<string,string>([
    ['ainn','AI'],
    ['network', '基本网络'],
    ['rtsp','视频流']
  ]);

  permissions = {

  };

  codes = ['network', 'ainn', 'rtsp']; 

  constructor(private toastService: ToastService, private http: HttpClient ) {
    edger.permission.fetch().then((data) => {
      this.permissions = data;
      this.requestAccess();
      
    }).catch((err) => {
      this.toastService.failPresentToast(JSON.stringify(err));
    });
    edger.onAction('permission', (data) => {
      this.permissions = data;
    });
  }

  requestAccess() {
    this.requestAuthorization(this.getUnauthorizedPermission());
  }

  /**
   * 向 edgeros 申请权限 
   */

  checkPermission(permission: string): boolean {
    if(permission.indexOf('.') !== -1) {
      let code = permission.split('.');
      return this.permissions[code[0]][code[1]]
    }
  
    return this.permissions[permission];
  }

  permissionToName(permissions:string[]) {
    return permissions.map((permission) => {
      return this.permissionTable.get(permission);
    });
  }


  isPermissions(permissions: string[]): boolean {
    let code = [];
    permissions.forEach((permission) => {
      if(!this.checkPermission(permission)) {
        code.push(permission);
      }
    });
    if(code.length !== 0) {
      const names = this.permissionToName(code);
      this.toastService.failPresentToast(`您没有${names}权限,请打开设置开启应用权限`)
      return false;
    }
    return true;
  }

  getUnauthorizedPermission(): string[] {
    return this.codes.filter((value)=> {
      return !this.checkPermission(value);
    });
  }

  updatePermission(callback: ()=>void) {
    edger.permission.fetch().then((data) => {
      this.permissions = data;
      console.log(this.permissions);
      callback();
    }).catch((err) => {
      this.toastService.failPresentToast(JSON.stringify(err));
    });
  }

  requestAuthorization(permissions: string[]) {
    console.log(permissions);
    if(permissions.length !== 0) {
      const config: EdgerReqPermsParams = {
        code: permissions,
        type: 'permissions'
      };
  
      edger.permission.request(config).then((data) => {
        console.log(`permissionRequest:${JSON.stringify(data)}`);
      });
    }  
  }

}
