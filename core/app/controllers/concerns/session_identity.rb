module SessionIdentity
  extend ActiveSupport::Concern

  private
    def render_session_identity
      Current.session.update!(last_active_at: Time.current)
      render json: {
        name: Current.identity.display_name,
        email: Current.identity.email,
        avatar_url: nil
      }
    end
end
