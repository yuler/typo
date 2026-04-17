# Development Guide

## Tauri Signing Keys

To enable automatic updates, the application must be signed. If you lose your keys or they expire, follow these steps to reset them.

### 1. Generate New Key Pair

Run the following command to generate a new signing key:

```bash
pnpm tauri signer generate -w ~/.tauri/typo.key
```

This will create:

- `~/.tauri/typo.key`: Your private key (Keep this secret!).
- `~/.tauri/typo.key.pub`: Your public key.

### 2. Update GitHub Secrets

Copy the **entire content** of the private key file, including the `untrusted comment` line:

```bash
cat ~/.tauri/typo.key
```

Go to your GitHub Repository -> **Settings** -> **Secrets and variables** -> **Actions** and update `TAURI_SIGNING_PRIVATE_KEY` with the content you copied.

### 3. Update Tauri Configuration

Get your new public key:

```bash
cat ~/.tauri/typo.key.pub
```

Update the `pubkey` field in `src-tauri/tauri.conf.json`:

```json
{
  "bundle": {
    "updater": {
      "active": true,
      "pubkey": "YOUR_NEW_PUBLIC_KEY_HERE"
    }
  }
}
```

> [!IMPORTANT]
> Changing the signing key will prevent users with older versions (installed with the old public key) from automatically updating to the new version. They will need to manually download and install the update once.
