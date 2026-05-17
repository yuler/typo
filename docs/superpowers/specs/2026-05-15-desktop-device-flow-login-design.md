# Spec: Desktop Device Flow Login Implementation

**Date**: 2026-05-15
**Status**: Draft
**Topic**: Implementing the desktop side of the Device Authorization Grant (RFC 8628) to allow users to log in to the Typo desktop app using their web account.

## 1. Overview
The goal is to implement a seamless login experience in the Tauri desktop app that leverages the existing Rails backend Device Flow API. Users will initiate login on the desktop, see a code, and authorize it in their browser.

## 2. Architecture & State Management

### 2.1 `useAuth` Composable
The `useAuth.ts` composable will be refactored into a state machine:

- **State**:
    - `isLoggedIn`: Boolean (reactive).
    - `user`: Object containing `email`, `name`, `avatar`.
    - `authStatus`: `'idle' | 'authorizing' | 'success' | 'error'`.
    - `deviceCode`: Object from API containing `user_code`, `device_code`, `verification_uri`, `expires_in`, `interval`.
- **Actions**:
    - `login()`: Initiates the flow by calling the authorization endpoint and starting the polling loop.
    - `logout()`: Clears the stored token and resets state.
    - `cancel()`: Stops the polling loop and resets to `idle`.

### 2.2 Storage
- The `access_token` will be stored in `store.json` via the `@tauri-apps/plugin-store`.
- Key: `access_token`.
- Key: `user_info` (cached profile data).

## 3. API Integration

- **Base URL**: `https://app.typo.yuler.cc`
- **Endpoints**:
    1. `POST /api/v1/device/authorization`:
        - Returns: `device_code`, `user_code`, `verification_uri`, `interval`, `expires_in`.
    2. `POST /api/v1/device/token`:
        - Body: `{ device_code: string }`
        - Polling logic: Wait `interval` seconds between calls. Handle `slow_down` (increase interval) and `authorization_pending` errors.

## 4. UI Components

### 4.1 `DeviceAuthModal.vue`
A new dialog component that is triggered when `authStatus === 'authorizing'`.
- Large display of `user_code` (e.g., `ABCD-1234`).
- Clickable link to `verification_uri`.
- Loading spinner/indicator for polling.
- Error state display if the code expires or the request fails.

### 4.2 Entry Points
- **AppHome.vue**: Large button in the hero section for logged-out users.
- **AppSidebar.vue**: Login link in the footer for logged-out users; User profile dropdown for logged-in users.

## 5. Security Considerations
- The `access_token` is stored in a JSON file. While accessible on the filesystem, it's consistent with existing settings storage.
- All API communication must be over HTTPS.

## 6. Implementation Plan (High Level)
1. Add `VITE_API_BASE_URL` to env/config.
2. Implement API client functions for Device Flow.
3. Refactor `useAuth.ts` with real logic and store integration.
4. Create `DeviceAuthModal.vue`.
5. Integrate the modal into `Main.vue` or a global layer.
6. Update `AppHome` and `AppSidebar` to use real `isLoggedIn` state.

---

## Spec Self-Review
- **Placeholder scan**: No "TBD" or "TODO". Backend URL is explicitly set to `https://app.typo.yuler.cc`.
- **Internal consistency**: The flow matches RFC 8628 and the Rails controller logic previously researched.
- **Scope check**: Focused purely on the login flow.
- **Ambiguity check**: Polling interval behavior is clearly defined to follow API suggestions.
