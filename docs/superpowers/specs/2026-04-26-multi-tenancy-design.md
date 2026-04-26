# Multi-Tenancy (URL-Based) Design Spec

Design for a path-based multi-tenant system in the Typo Rails core, featuring magic link authentication and identity-based session tracking.

## 1. Data Models

All tables use base36 UUIDs as primary keys.

### `Identity`
Represents a unique email address across the system.
- `id`: PK (UUID)
- `email`: string (unique, indexed)

### `MagicLink`
Temporary authentication codes sent via email.
- `id`: PK (UUID)
- `identity_id`: FK
- `code`: string (secure, unique, indexed)
- `expires_at`: datetime
- `used_at`: datetime (nullable)

### `Session`
Persistent login sessions for identities.
- `id`: PK (UUID)
- `identity_id`: FK
- `token`: string (unique, indexed)
- `ip_address`: string
- `user_agent`: string
- `last_active_at`: datetime

### `Account`
The tenant container. All resources belong to an account.
- `id`: PK (UUID)
- `name`: string
- `slug`: string (unique, indexed)
- `personal`: boolean (default: true)

### `User`
The membership link between an Identity and an Account.
- `id`: PK (UUID)
- `identity_id`: FK
- `account_id`: FK
- `role`: enum (`owner`, `admin`, `member`)

## 2. Routing Architecture

### Flat Slug Routing
Account-scoped resources are accessible via `/:account_slug/`.

```ruby
# config/routes.rb
constraints(AccountSlugConstraint) do
  scope ":account_slug", as: :account do
    root to: "dashboards#show"
  end
end
```

### Reserved Slugs
The following words are reserved and cannot be used as account slugs:
`admin, api, assets, billing, dashboard, help, jobs, login, logout, magic_link, rails, settings, setup, static, support, typo`.

## 3. Workflows

### Onboarding & Login
1. User provides `email`.
2. Find or create `Identity`.
3. Create `MagicLink` with a secure `code`.
4. Send email with verification code.
5. User visits `/session/magic_link` and enters the code.
6. If valid:
   - Create `Session` (recording `ip_address`, `user_agent`).
   - Check if the identity already has a personal `Account` (where `personal: true` and they are the `owner`).
   - If no personal account exists, create one (slug derived from email + random suffix) and create a `User` record (role: `owner`).
   - Redirect to the `/:account_slug/` of their personal account (or the last active account).

### Multi-Tenancy Resolution
1. Middleware (AccountSlug::Extractor) extracts the account slug from the URL and sets `Current.account`.
2. The slug is moved from PATH_INFO to SCRIPT_NAME, making Rails think it's "mounted" at that path.
3. Verify the current `Identity` has a `User` record for that `Account`.
4. Set `Current.account` and `Current.user` for the request scope.

## 4. Security

- `MagicLink` codes are short-lived (e.g., 15 minutes) and single-use.
- `Session` tokens are long-lived but revocable.
- `AccountSlugConstraint` prevents routing collisions with system paths.
