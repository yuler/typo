class Api::V1::Sessions::HeartbeatsController < Api::V1::BaseController
  # Ensure we don't need a specific account slug for the heartbeat
  skip_account_scope

  def show
    Current.session.update!(last_active_at: Time.current)
    render json: {
      name: Current.identity.display_name,
      email: Current.identity.email,
      avatar_url: nil # Extend later if identity/user gains an avatar field
    }
  end
end
