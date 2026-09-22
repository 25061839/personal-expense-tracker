# 「个人记账」Windows 打包指南（小白版）

> 照着做即可，全程约 15～30 分钟。所有下载地址都已配置国内镜像，一般不会慢。
> 有任何一步卡住，把屏幕截图发给 Claude 处理。

## 第一步：把文件传到 Windows 电脑

把 `个人记账-Windows打包.zip`（在 Mac 桌面上）通过 U 盘、微信文件传输助手或 QQ 传到 Windows 电脑，**解压到桌面**。
解压后得到一个项目文件夹，双击进去，能看到 `package.json` 文件就对了。

## 第二步：安装 Node.js（只装这一次，以后打包不用再装）

1. 打开网址：`https://nodejs.org/zh-cn`
   （如果打不开或下载很慢，改用：`https://npmmirror.com/mirrors/node/latest-v22.x/`，选文件名里带 `x64.msi` 的那个）
2. 下载「LTS 长期支持版」的 Windows 安装包（.msi 文件）
3. 双击安装，一路点「下一步」，全部默认设置即可
4. 验证：按键盘 `Win` 键，输入 `cmd` 回车，打开黑色窗口，输入 `node -v` 回车，显示 `v22.x.x` 就成功了

## 第三步：打包出 .exe

1. 打开解压出来的项目文件夹，用鼠标点击窗口**顶部的地址栏**，输入 `cmd` 然后回车
   （会弹出一个黑色窗口，这表示命令会在当前文件夹里执行）
2. 输入下面这行，回车（第一次要下载约 400MB 组件，耐心等 5～15 分钟，结束时能继续输入下一行就是成功）：
   ```
   npm install
   ```
3. 再输入下面这行，回车（约 3～10 分钟）：
   ```
   npm run build:win
   ```
4. 看到 `building target=nsis` 和 `completed` 之类的字样就是成功了

## 第四步：拿到安装包

进入项目文件夹里的 `release` 文件夹，`个人记账 Setup 0.1.0.exe` 就是安装包。

双击它安装到 Windows 电脑即可。**如果安装或运行时提示「Windows 已保护你的电脑」**（蓝色窗口）：
点「更多信息」→「仍要运行」。这是正常现象——我们没买微软的付费签名，软件本身是安全的。

## 常见问题

- **npm install 卡住或提示超时**：把黑色窗口关掉，重新按第三步第 1 条打开，先输入下面这行再重新 `npm install`：
  ```
  npm config set registry https://registry.npmmirror.com
  ```
- **卡在 better-sqlite3**：关掉窗口重开，先输入下面这行再 `npm install`：
  ```
  set npm_config_better_sqlite3_binary_host_mirror=https://registry.npmmirror.com/-/binary/better-sqlite3/
  ```
- **提示缺少 python 或 Visual Studio**：截图发给 Claude 处理（一般不会出现）。
- **以后想重新打包新版本**：把新代码拷过来覆盖旧文件夹，重复第三步的 2、3 两条命令即可。

## 安装后说明

- 数据保存在 Windows 电脑上（`C:\Users\你的用户名\AppData\Roaming\个人记账\expense.db`），不联网、不上传。
- 卸载：像普通软件一样在「设置 → 应用」里卸载即可（数据文件会保留）。
