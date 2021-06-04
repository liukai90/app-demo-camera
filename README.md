# 概述
这个 DEMO 是一个完整的摄像头监控 爱智应用， 具有以下功能特性：
+ 支持`RTSP`协议流媒体；
+ 支持`onvif`协议（摄像头支持），自动搜索网络摄像头，控制摄像头云台（摄像头支持）；
+ 支持人脸识别功能，支持人脸移动跟踪；
+ 支持全屏播放。

# 前端构建说明
+ 技术架构
	- 框架：【[Angular](https://angular.cn/)】。
	- UI： 【[Ionic](https://ionicframework.com/docs/)】。

+ 构建方式
	+ 安装 `node` 环境。
	+ 执行 `npm install -g @ionic/cli` 安装 `ionic` 脚手架。
	+ 用 `vscode` 打开 `web` 文件夹。
	+ 快捷键 `Ctrl` + `Shift` + <code> &#96;</code>  打开 `vscode terminal`。
	+ 执行 `npm install` 安装项目所有依赖。
	+ 运行  `ionic build --prod`  构建项目。
	+ 构建完后会生成一个 `www`  文件夹，里面就是构建后的代码。

+ 依赖说明
	+ `hammerjs` : 移动端手势事件库。
	+ `socket.io-client` ： `socket.io` 客户端，和服务端进行双向通信。
	+ `@edgeros/web-sdk`: 爱智提供与`edgeros`交互的前端`api`接口,在此项目中用于获取用户`token` 等信息。
	+ `@edgeros/web-mediaclient`: `WebMedia` 客户端 API 模块，用于连接流媒体服务器并与服务器进行数据交互。
	+ `NodePlayer.js` 播放器，【[开发文档]( https://www.nodemedia.cn/doc/web/#/1?page_id=1)】。

# 后端构建说明
+ 构建方式：
	+ 执行 `npm install` 安装项目所有依赖。
	+ 将前端工程构建生成`www`文件夹的文件 `copy` 到 `camera/public` 文件夹下。
	+ 使用`vscode edgeros` 插件将项目部署到 `edgeros`。

+ 依赖说明：
	+ `@edgeros/jsre-onvif`:  `onvif` 协议模块，发现设备，获取摄像头设备 `rtsp` 地址。
	+ `@edgeros/jsre-medias`: `WebMedia` 服务封装模块，支持管理一组流媒体服务。
	+ `@edgeros/jsre-camera-src`: `WebMedia.MediaSource` 的实现，支持人脸识别和人脸跟踪。

# 环境配置
- 设备: 
	- 支持 `onvif` 与 `rtsp` 协议访问的网络摄像头，带云台功能优先。
	- `Spirit 1` ：【 [淘宝 THINGS翼辉官方店]( https://shop328678746.taobao.com/?spm=a1z10.1-c-s.0.0.6d16d0a1lA0llo)】
	
- 设备连接： 
	
	- 网络摄像头按产品说明接入`Spirit 1`， 注意 `onvif` 功能是否开启，确认账号密码。

**注意**：购买网络摄像头时需确定清楚摄像头是否支持 `onvif` 与 `rtsp` 协议。