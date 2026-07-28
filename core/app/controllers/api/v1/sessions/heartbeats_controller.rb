# Deprecated: remove in API v2 — clients should use GET /api/v1/session instead.
class Api::V1::Sessions::HeartbeatsController < Api::V1::BaseController
  include SessionIdentity

  skip_account_scope

  def show
    render_session_identity
  end
end
