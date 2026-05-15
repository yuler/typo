# Desktop Device Login (Backend) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement OAuth 2.0 Device Authorization Grant backend using Rails signed_id for stateless bearer tokens.

**Architecture:** Use a temporary `DeviceAuthorization` model for the handshake and extend the `Session` model with a `kind` field. Authenticate desktop clients using the `signed_id` of their session.

**Tech Stack:** Rails 8.x, PostgreSQL.

---

### Task 1: Database Migrations

**Files:**
- Create: `core/db/migrate/20260515000001_create_device_authorizations.rb`
- Create: `core/db/migrate/20260515000002_add_kind_to_sessions.rb`

- [ ] **Step 1: Create `device_authorizations` migration**

```ruby
class CreateDeviceAuthorizations < ActiveRecord::Migration[8.0]
  def change
    create_table :device_authorizations, id: :uuid do |t|
      t.string :device_code, null: false, index: { unique: true }
      t.string :user_code, null: false, index: { unique: true }
      t.references :identity, type: :uuid, foreign_key: true
      t.string :status, default: "pending", null: false
      t.datetime :expires_at, null: false

      t.timestamps
    end
  end
end
```

- [ ] **Step 2: Create `add_kind_to_sessions` migration**

```ruby
class AddKindToSessions < ActiveRecord::Migration[8.0]
  def change
    add_column :sessions, :kind, :string, default: "web", null: false
  end
end
```

- [ ] **Step 3: Run migrations**

Run: `cd core && bin/rails db:migrate`

- [ ] **Step 4: Commit**

```bash
git add core/db/migrate
git commit -m "db: create device_authorizations and add kind to sessions"
```

---

### Task 2: DeviceAuthorization Model

**Files:**
- Create: `core/app/models/device_authorization.rb`
- Create: `core/test/models/device_authorization_test.rb`

- [ ] **Step 1: Implement Model logic**

```ruby
class DeviceAuthorization < ApplicationRecord
  belongs_to :identity, optional: true

  validates :device_code, :user_code, :expires_at, presence: true
  validates :status, inclusion: { in: %w[pending approved denied expired consumed] }

  before_validation :set_defaults, on: :create

  scope :pending, -> { where(status: "pending") }
  scope :active, -> { where("expires_at > ?", Time.current) }

  def expired?
    expires_at < Time.current || status == "expired"
  end

  private

  def set_defaults
    self.device_code ||= SecureRandom.hex(32)
    self.user_code ||= SecureRandom.alphanumeric(8).upcase.insert(4, "-")
    self.expires_at ||= 15.minutes.from_now
  end
end
```

- [ ] **Step 2: Write unit tests**

```ruby
require "test_helper"

class DeviceAuthorizationTest < ActiveSupport::TestCase
  test "sets defaults on creation" do
    auth = DeviceAuthorization.create!
    assert auth.device_code.present?
    assert auth.user_code.present?
    assert auth.expires_at > Time.current
    assert_equal "pending", auth.status
  end
end
```

- [ ] **Step 3: Run tests and commit**

---

### Task 3: Update Authentication Concern

**Files:**
- Modify: `core/app/controllers/concerns/authentication.rb`
- Modify: `core/app/models/identity.rb`

- [ ] **Step 1: Implement `authenticate_by_bearer_token` using `signed_id`**

Update `core/app/controllers/concerns/authentication.rb`:
```ruby
    def authenticate_by_bearer_token
      if request.authorization.to_s.include?("Bearer")
        authenticate_or_request_with_http_token do |token|
          if session = Session.find_signed(token)
            set_current_session session
          end
        end
      end
    end
```

- [ ] **Step 2: Update `Identity.find_by_permissable_access_token`**

Actually, we are bypassing `Identity` check and using `Session.find_signed` directly in the controller as shown above. This is simpler.

---

### Task 4: API::Auth::DevicesController

**Files:**
- Create: `core/app/controllers/api/auth/devices_controller.rb`
- Modify: `core/config/routes.rb`

- [ ] **Step 1: Implement `authorize` and `token` actions**

```ruby
module Api
  module Auth
    class DevicesController < ApplicationController
      allow_unauthenticated_access

      def authorize
        device_auth = DeviceAuthorization.create!
        render json: {
          device_code: device_auth.device_code,
          user_code: device_auth.user_code,
          verification_uri: main_app.device_url,
          expires_in: 900,
          interval: 5
        }
      end

      def token
        device_auth = DeviceAuthorization.find_by!(device_code: params[:device_code])

        if device_auth.expired?
          render json: { error: "expired_token" }, status: :gone
        elsif device_auth.status == "approved"
          session = device_auth.identity.sessions.create!(
            kind: "desktop",
            user_agent: request.user_agent,
            ip_address: request.remote_ip
          )
          device_auth.update!(status: "consumed")
          render json: { access_token: session.signed_id, identity: device_auth.identity }
        else
          render json: { error: "authorization_pending" }, status: :precondition_required
        end
      end
    end
  end
end
```

- [ ] **Step 2: Add API routes**

```ruby
namespace :api do
  namespace :auth do
    post "device", to: "devices#authorize"
    post "device/token", to: "devices#token"
  end
end
```

---

### Task 5: Web UI for Verification

**Files:**
- Create: `core/app/controllers/devices_controller.rb`
- Create: `core/app/views/devices/show.html.erb`
- Modify: `core/config/routes.rb`

- [ ] **Step 1: Implement Controller**

```ruby
class DevicesController < ApplicationController
  def show
    @device_auth = DeviceAuthorization.find_by(user_code: params[:user_code]) if params[:user_code]
  end

  def update
    @device_auth = DeviceAuthorization.find_by!(user_code: params[:user_code])
    if params[:commit] == "approve"
      @device_auth.update!(identity: Current.identity, status: "approved")
      redirect_to root_path, notice: "Device successfully authorized."
    else
      @device_auth.update!(status: "denied")
      redirect_to root_path, alert: "Authorization denied."
    end
  end
end
```

- [ ] **Step 2: Add Web routes**

```ruby
resource :device, only: [:show, :update]
```

---

### Task 6: Integration Testing

- [ ] **Step 1: Write integration test for the full flow**

1. POST `/api/auth/device` -> get `device_code` and `user_code`.
2. Login as user.
3. POST `/device` with `user_code` and `approve`.
4. POST `/api/auth/device/token` with `device_code` -> get `access_token`.
5. GET `/api/profile` (existing endpoint) with `Bearer <access_token>` -> 200 OK.
