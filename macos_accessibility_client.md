# macOS 辅助功能权限在自动更新后失效的问题

## 现象

自动升级之后还是需要再授权一次辅助功能（Accessibility），但其实之前已经授权过了，系统设置里看起来也是勾选状态，这个状态不对。

相关代码：

```14:31:apps/desktop/src-tauri/src/lib.rs
fn request_mac_accessibility_permissions() -> Result<bool, String> {
    #[cfg(target_os = "macos")]
    {
        let trusted =
            macos_accessibility_client::accessibility::application_is_trusted_with_prompt();
        if trusted {
            print!("Application is totally trusted!");
        } else {
            print!("Application isn't trusted :(");
        }
        Ok(trusted)
    }

    #[cfg(not(target_os = "macos"))]
    {
        Ok(true)
    }
}
```

## 根因分析

这不是 `request_mac_accessibility_permissions` 函数本身的 bug，而是 **macOS 辅助功能权限 + Tauri 自动更新 + 未签名应用** 三者结合产生的已知问题。

### 1. 应用没有用 Apple Developer ID 签名

`apps/desktop/src-tauri/tauri.conf.json`：

```json
"macOS": {
  "entitlements": null,
  "exceptionDomain": "",
  "frameworks": [],
  "providerShortName": null,
  "signingIdentity": null
}
```

而且 `.github/workflows/desktop-release.yml` 里也没有配 `APPLE_CERTIFICATE` / `APPLE_SIGNING_IDENTITY` / `APPLE_ID` / `APPLE_TEAM_ID` 之类的 secret，也就是说每次发出去的 `.app` 是 **未签名 + 临时 ad-hoc 签名** 的。

### 2. macOS TCC 用「代码要求」匹配权限

macOS 的 TCC（隐私数据库，包括 Accessibility）记录的是：

- Bundle ID (`com.typo.app`) — 没变
- **Code Requirement / Code Signature 哈希** — 每次构建都在变

没签名的 app，TCC 用 cdhash（可执行文件哈希）做匹配。自动更新后 `typo_lib` / `typo` 二进制的哈希变了，TCC 就认定这是"另一个 app"。

这会出现一个非常迷惑的现象：

- 系统设置 → 隐私与安全性 → 辅助功能里，typo **看起来还是打勾的**
- 但 `AXIsProcessTrusted()` 返回 `false`
- 所以 `application_is_trusted_with_prompt()` 又弹一次授权框

### 3. `application_is_trusted_with_prompt` 的行为

`lib.rs:18` 调用的是带 prompt 的版本 — 只要没 trusted 就无条件弹系统对话框。所以每次更新后首次打开主窗口都会弹一下，这跟 `onMounted` 里每次显示 Main 都会调用是一起放大了用户感知：

```108:119:apps/desktop/src/windows/Main.vue
  if (isMacOS.value) {
    try {
      const trusted = await invoke('request_mac_accessibility_permissions')
      if (!trusted) {
        errorText.value = t('main.error.accessibility')
        state.value = 'error'
      }
    }
    catch (err) {
      console.error(err)
    }
  }
```

## 解决方案（按推荐程度）

### 方案 A — 根治：配 Apple Developer ID 签名 + 公证（强烈推荐）

这是唯一能让 TCC 权限在版本间"延续"的正路。只要每个版本都用同一个 `Developer ID Application: Your Name (TEAMID)` 证书签名并公证过，TCC 就会用 DesignatedRequirement（固定的签名身份）匹配，授权一次就行，以后自动更新无感。

需要做的：

1. Apple Developer Program ($99/year)
2. 生成 `Developer ID Application` 证书，导出 `.p12`
3. GitHub secrets：`APPLE_CERTIFICATE`（base64 的 p12）、`APPLE_CERTIFICATE_PASSWORD`、`APPLE_SIGNING_IDENTITY`、`APPLE_ID`、`APPLE_PASSWORD`（App-specific password）、`APPLE_TEAM_ID`
4. `tauri.conf.json` 里 `signingIdentity` 设成 `"Developer ID Application: ... (TEAMID)"`
5. `tauri-action` 会自动读这些环境变量去签 + notarize + staple

### 方案 B — 临时缓解：不每次弹框，并引导用户修复

在找不到 Apple 账号的过渡期，至少改善 UX：

1. 拆成两个 command：检查态（不弹）+ 主动请求（弹）
2. `onMounted` 里只用"检查"版本
3. 检测到"曾经授权但现在失效"时，提示用户去系统设置里先删除 typo 再重新添加（这样 TCC 会创建一条新签名的记录）

代码大概这样：

```rust
#[tauri::command]
fn check_mac_accessibility_permissions() -> Result<bool, String> {
    #[cfg(target_os = "macos")]
    {
        Ok(macos_accessibility_client::accessibility::application_is_trusted())
    }
    #[cfg(not(target_os = "macos"))]
    { Ok(true) }
}

#[tauri::command]
fn request_mac_accessibility_permissions() -> Result<bool, String> {
    #[cfg(target_os = "macos")]
    {
        Ok(macos_accessibility_client::accessibility::application_is_trusted_with_prompt())
    }
    #[cfg(not(target_os = "macos"))]
    { Ok(true) }
}
```

前端首次 mount 只调 `check_*`，用户点按钮触发实际功能时再调 `request_*`。

### 方案 C — 引导用户手动修复当前已安装版本

对现在已经遇到问题的用户，教他们：

- 打开「系统设置 → 隐私与安全性 → 辅助功能」
- 找到 typo，点减号删掉
- 重新打开 typo，它再弹框时允许，就好了

也可以用命令：

```bash
tccutil reset Accessibility com.typo.app
```

但需要管理员权限。
