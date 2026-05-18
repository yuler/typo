# Spec: API Session Destroy and Dashboard Sessions List

## Status
Proposed

## Context
The Typo ecosystem needs a way for the desktop app to securely sign out (invalidate its session) and for users to manage their active sessions (web, desktop, etc.) via the dashboard. Currently, the API lacks a session destruction endpoint, and there is no UI to view or revoke active sessions.

## Goals
1.  Implement `DELETE /api/v1/session` for desktop app sign-out.
2.  Implement a "Sessions" management page in the dashboard.
3.  Allow users to revoke specific sessions (including their current one).

## Design

### 1. API Session Destruction
A new endpoint will be added to the API to allow clients to invalidate their current session.

- **Route:** `resource :session, only: :destroy` inside `namespace :v1`.
- **Controller:** `Api::V1::SessionsController < Api::V1::BaseController`
- **Behavior:**
    - Uses `Current.session` (identified via Bearer token in `ApiAuthentication` concern).
    - Calls `destroy` on the session if present.
    - Returns `head :no_content`.

### 2. Dashboard Sessions Management
Users will be able to view and manage all active sessions associated with their identity.

- **Routes:** Add `resources :sessions, only: [:index, :destroy]` to the main routes.
- **Controller Changes (`SessionsController`):**
    - `index`: List `Current.identity.sessions.order(created_at: :desc)`.
    - `destroy`: 
        - If `params[:id]` is present: Find specific session in `Current.identity.sessions` and destroy it. Redirect to `sessions_path` with a notice.
        - If `params[:id]` is NOT present: Terminate the *current* browser session (existing behavior) and redirect to login.
- **View (`app/views/sessions/index.html.erb`):**
    - Displays a list of sessions.
    - Includes User Agent (parsed or raw), IP Address, and relative creation time (e.g., "3 hours ago").
    - "Revoke" button for each session.

## Testing Strategy
- **API:** Request `DELETE /api/v1/session` with a valid token and verify the session is removed from the database and subsequent requests with the same token fail.
- **Dashboard:** 
    - Verify all active sessions for the identity are listed.
    - Verify revoking a specific session (e.g., a desktop session) removes it.
    - Verify revoking the *current* session logs the user out.
