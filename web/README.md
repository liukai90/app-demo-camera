### 前端构建
+ 技术架构
	- 框架：【[Angular](https://angular.cn/)】。
	- UI： 【[Ionic](https://ionicframework.com/docs/)】。

+ 如何构建
    - 安装 `node` 环境。
    - 执行 `npm install -g @ionic/cli` 安装 `ionic` 脚手架。
    - 用 `vscode` 打开 `web` 文件夹。
    - 快捷键 `Ctrl` + `Shift` + <code> &#96;</code>  打开 `vscode terminal`。
    - 执行 `npm install` 安装项目所有依赖。
    - 运行  `ionic build --prod`  构建项目。
    - 构建完后会生成一个 `www`  文件夹，里面就是构建后的代码。
    
+ 依赖说明
    - `hammerjs` : 移动端手势事件库。
    - `socket.io-client` ： `socket.io` 客户端，和服务端进行双向通信。
    - `@edgeros/websdk` 爱智提供与 `EdgerOS` 交互的前端 `api` 接口,在此项目中用到了获取用户 `token` 的接口。

