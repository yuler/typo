# Design Spec: Desktop Device Login (Backend)

Implementation of OAuth 2.0 Device Authorization Grant (RFC 8628) for Typo Desktop.

## Overview

The desktop app requires a secure way to authenticate users without requiring them to type their credentials directly into the app. This is achieved by the Device Flow, where the user authorizes the device via a browser on their primary machine.

## Data Models

### `DeviceAuthorization` (New)
Temporary record to track the authorization process.

- `id`: uuid
- `device_code`: string (index, unique, high entropy)
- `user_code`: string (index, short code like "ABC-123")
- `identity_id`: uuid (belongs_to Identity, optional until approved)
- `status`: string (enum: `pending`, `approved`, `denied`, `expired`, `consumed`)
- `expires_at`: datetime (15 minutes from creation)

**Lifecycle**: Record is retained for audit purposes. Once a session is successfully created, the status transitions to `consumed`.

### `Session` (Extended)
- `kind`: string (default: `web`, values: `web`, `desktop`)

*(Note: No token columns are required. The Bearer token issued to the desktop client will be the cryptographically secured `signed_id` of the Session record.)*

## API Endpoints

### Device Flow (API Namespace)
- `POST /api/auth/device`: Start authorization. Returns `device_code`, `user_code`, `verification_uri`.
- `POST /api/auth/device/token`: Poll for status. If approved, returns `access_token` and marks `DeviceAuthorization` as `consumed`.

### User Interface (Web)
- `GET /device`: Simple page for users to enter/confirm `user_code`.
- `POST /device`: Submit approval or denial.

## Security

1. **Token Storage**: Only SHA256 digests are stored in the database.
2. **Rate Limiting**: Polling is restricted by the `interval` returned in the initial response.
3. **Expiration**: `device_code` and `user_code` expire after 15 minutes.
4. **IDOR Prevention**: `device_code` is a long, unguessable string.

## Success Criteria

1. Desktop app can initiate a login flow and receive a `device_code`.
2. User can approve the request in the browser.
3. Desktop app receives a Bearer token and can successfully make authenticated API requests.
4. Session is visible and revocable in the user's settings.
