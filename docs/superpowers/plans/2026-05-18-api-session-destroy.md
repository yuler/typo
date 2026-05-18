# API Session Destroy and Dashboard Sessions List Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable desktop sign-out via API and provide a session management UI in the dashboard.

**Architecture:** 
- Add `DELETE /api/v1/session` endpoint for API session invalidation.
- Add `GET /sessions` and `DELETE /sessions/:id` for managing all sessions in the web dashboard.
- Update `SessionsController` to support listing and revoking specific sessions.

**Tech Stack:** Rails 8 (Ruby), SQLite, Minitest.

---

### Task 1: API Session Destruction

**Files:**
- Modify: `core/config/routes.rb`
- Create: `core/app/controllers/api/v1/sessions_controller.rb`
- Create: `core/test/controllers/api/v1/sessions_controller_test.rb`

- [ ] **Step 1: Write the failing test for API session destruction**

```ruby
# core/test/controllers/api/v1/sessions_controller_test.rb
require "test_helper"

class Api::V1::SessionsControllerTest < ActionDispatch::IntegrationTest
  setup do
    @identity = Identity.create!(email: "test@#{SecureRandom.hex}.com")
    @session = @identity.sessions.create!(user_agent: "TestAgent", ip_address: "127.0.0.1")
  end

  test "should destroy session" do
    assert_difference "Session.count", -1 do
      delete api_v1_session_url, headers: { "Authorization" => "Bearer #{@session.signed_id}" }, as: :json
    end
    assert_response :no_content
  end

  test "should return unauthorized if no session" do
    delete api_v1_session_url, as: :json
    assert_response :unauthorized
  end
end
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd core && bin/rails test test/controllers/api/v1/sessions_controller_test.rb`
Expected: FAIL (Route not found)

- [ ] **Step 3: Add the API session route**

```ruby
# core/config/routes.rb (inside namespace :v1)
# Find 'resources :completions, only: :create' and add below:
resource :session, only: :destroy
```

- [ ] **Step 4: Implement Api::V1::SessionsController**

```ruby
# core/app/controllers/api/v1/sessions_controller.rb
class Api::V1::SessionsController < Api::V1::BaseController
  def destroy
    Current.session&.destroy
    head :no_content
  end
end
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd core && bin/rails test test/controllers/api/v1/sessions_controller_test.rb`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add core/config/routes.rb core/app/controllers/api/v1/sessions_controller.rb core/test/controllers/api/v1/sessions_controller_test.rb
git commit -m "feat: add API session destruction endpoint"
```

### Task 2: Dashboard Sessions Index

**Files:**
- Modify: `core/config/routes.rb`
- Modify: `core/app/controllers/sessions_controller.rb`
- Create: `core/app/views/sessions/index.html.erb`
- Create: `core/test/controllers/sessions_controller_test.rb`

- [ ] **Step 1: Write the failing test for sessions index**

```ruby
# core/test/controllers/sessions_controller_test.rb
require "test_helper"

class SessionsControllerTest < ActionDispatch::IntegrationTest
  setup do
    @identity = Identity.create!(email: "test@#{SecureRandom.hex}.com")
    @session = @identity.sessions.create!(user_agent: "TestAgent", ip_address: "127.0.0.1")
  end

  test "should get index when signed in" do
    cookies.signed[:session_token] = @session.signed_id
    get sessions_url
    assert_response :success
    assert_select "h1", "Active Sessions"
  end

  test "should redirect to login when not signed in" do
    get sessions_url
    assert_redirected_to new_session_path
  end
end
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd core && bin/rails test test/controllers/sessions_controller_test.rb`
Expected: FAIL (Route not found)

- [ ] **Step 3: Add the sessions routes**

```ruby
# core/config/routes.rb
# Add near top-level routes:
resources :sessions, only: [ :index, :destroy ]
```

- [ ] **Step 4: Update SessionsController**

```ruby
# core/app/controllers/sessions_controller.rb
# Update the require_unauthenticated_access line:
require_unauthenticated_access except: [ :index, :destroy ]

# Add index action:
def index
  @sessions = Current.identity.sessions.order(created_at: :desc)
end

# Update destroy action:
def destroy
  if params[:id]
    Current.identity.sessions.find(params[:id]).destroy
    redirect_to sessions_path, notice: "Session revoked."
  else
    terminate_session
    redirect_to_login_url
  end
end
```

- [ ] **Step 5: Create the sessions index view**

```erb
<%# core/app/views/sessions/index.html.erb %>
<h1>Active Sessions</h1>

<table>
  <thead>
    <tr>
      <th>Device/Browser</th>
      <th>IP Address</th>
      <th>Created</th>
      <th></th>
    </tr>
  </thead>
  <tbody>
    <% @sessions.each do |session| %>
      <tr>
        <td><%= session.user_agent %></td>
        <td><%= session.ip_address %></td>
        <td><%= time_ago_in_words(session.created_at) %> ago</td>
        <td>
          <%= button_to "Revoke", session_path(session), method: :delete, data: { confirm: "Are you sure?" } %>
        </td>
      </tr>
    <% end %>
  </tbody>
</table>
```

- [ ] **Step 6: Run test to verify it passes**

Run: `cd core && bin/rails test test/controllers/sessions_controller_test.rb`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add core/config/routes.rb core/app/controllers/sessions_controller.rb core/app/views/sessions/index.html.erb core/test/controllers/sessions_controller_test.rb
git commit -m "feat: add dashboard sessions management"
```

### Task 3: Revoking Other Sessions

- [ ] **Step 1: Write test for revoking another session**

```ruby
# core/test/controllers/sessions_controller_test.rb (add to existing class)
  test "should revoke another session" do
    other_session = @identity.sessions.create!(user_agent: "OtherAgent", ip_address: "1.1.1.1")
    cookies.signed[:session_token] = @session.signed_id
    assert_difference "Session.count", -1 do
      delete session_url(other_session)
    end
    assert_redirected_to sessions_url
    assert_equal "Session revoked.", flash[:notice]
  end

  test "should logout when destroying current session without ID" do
    cookies.signed[:session_token] = @session.signed_id
    delete session_url
    assert_redirected_to new_session_path
    assert_nil cookies.signed[:session_token]
  end
```

- [ ] **Step 2: Run test to verify it passes**

Run: `cd core && bin/rails test test/controllers/sessions_controller_test.rb`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add core/test/controllers/sessions_controller_test.rb
git commit -m "test: verify session revocation and logout"
```
