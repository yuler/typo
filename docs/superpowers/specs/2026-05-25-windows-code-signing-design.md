# Windows Code Signing Design

## Problem Context
The Tauri desktop application (`typo_1.5.4_x64-setup.exe`) is being flagged as a trojan virus by 360 Security (and potentially other AVs / Windows SmartScreen) on Windows. This is a false positive caused by the executable being unsigned. 

## Solution Architecture
To permanently resolve this and build trust with Microsoft and antivirus vendors, we will implement Windows Code Signing in the GitHub Actions CI pipeline. We will use a standard or EV code signing certificate and configure Tauri's native signing capabilities.

### 1. Secrets Management
The developer will purchase a Code Signing Certificate (`.pfx` format) and configure the following GitHub Repository Secrets:
- `WINDOWS_CER_BASE64`: The base64-encoded string of the `.pfx` certificate file.
- `WINDOWS_CER_PASSWORD`: The password for the `.pfx` certificate.
- `WINDOWS_CER_THUMBPRINT`: The SHA-1 thumbprint of the certificate.

### 2. CI/CD Pipeline Update (`.github/workflows/desktop-release.yml`)
We will modify the `desktop-release` workflow specifically for Windows builds (`matrix.platform == 'windows-latest'`):
- Add a step before the `tauri-action` to decode `WINDOWS_CER_BASE64` into a temporary `.pfx` file and install it into the Windows runner's local certificate store. We can use existing community actions (like `kikito/action-import-pfx-certificate` or similar) or run a simple PowerShell script.
- Ensure the secrets are mapped into the workflow environment.

### 3. Tauri Configuration (`apps/desktop/src-tauri/tauri.conf.json`)
Tauri automatically signs the output `.exe` and `.msi` files if the `certificateThumbprint` is provided in the `tauri.conf.json` under `bundle.windows.certificateThumbprint`. 
Since we don't want to hardcode the thumbprint or deal with it locally if a developer doesn't have it, we will keep it as `null` in the source code.
During the GitHub Action run for Windows, we will inject the `WINDOWS_CER_THUMBPRINT` into the `tauri.conf.json` (or set the environment variable if Tauri v1 supports it natively, though string replacement in the JSON before building is more robust).

## Scope & Constraints
- This only addresses Windows builds. MacOS signing is handled separately via Apple Developer certificates and `tauri-action` handles those with its own mechanisms.
- It requires the developer to purchase and maintain a valid Code Signing Certificate.
- If the secrets are missing, the build should still succeed but output unsigned binaries.

## Testing Strategy
- Once implemented, the developer will trigger a workflow dispatch or push a tag.
- The resulting `.exe` should be downloaded, and we will verify its signature in Windows (Right click -> Properties -> Digital Signatures tab).
- Submitting the newly signed `.exe` to 360 Security or running it locally should no longer trigger a severe SmartScreen or Antivirus warning.
