module ApiAuthentication
  extend ActiveSupport::Concern

  included do
    before_action :require_authentication
    before_action :require_account
    helper_method :authenticated?

    etag { Current.identity.id if authenticated? }

    include Authentication::ViaMagicLink, UrlHelper
  end

  class_methods do
    def disallow_account_scope(**options)
      skip_before_action :require_account, **options
      before_action :redirect_accounted_request, **options
    end

    def require_unauthenticated_access(**options)
      allow_unauthenticated_access(**options)
      before_action :redirect_authenticated_user, **options
    end

    def allow_unauthenticated_access(**options)
      skip_before_action :require_authentication, **options
      before_action :resume_session, **options
      allow_unauthorized_access(**options)
    end
  end

  private
    def authenticated?
      Current.identity.present?
    end

    def require_authentication
      authenticate_by_bearer_token || authenticate_by_query_token || json_request_unauthorized
    end

    def authenticate_by_bearer_token
      if request.authorization.to_s.include?("Bearer")
        if bearer_token_authenticatable_request?
          authenticate_or_request_with_http_token do |token|
            if identity = Identity.find_by_permissable_access_token(token, method: request.method)
              Current.identity = identity
            end
          end
        else
          request_http_token_authentication
        end
      end
    end

    def bearer_token_authenticatable_request?
      request.format.json?
    end

    def authenticate_by_query_token
      if token = params[:token]
        if identity = Identity.find_by_permissable_access_token(token, method: request.method)
          Current.identity = identity
        end
      end
    end

    def json_request_unauthorized
      render json: { error: "Unauthorized" }, status: :unauthorized
    end

    def require_account
      Current.account || Current.identity.personal_account || json_request_account_not_found
    end

    def json_request_account_not_found
      render json: { error: "Account not found in api url or as identity user personal account" }, status: :not_found
    end

    def start_new_session_for(identity)
      identity.sessions.create!(user_agent: request.user_agent, ip_address: request.remote_ip).tap do |session|
        set_current_session session
      end
    end

    def set_current_session(session)
      Current.session = session
      cookies.signed.permanent[:session_token] = { value: session.signed_id, httponly: true, same_site: :lax }
    end

    def terminate_session
      Current.session&.destroy
      cookies.delete(:session_token)
    end

    def session_token
      cookies[:session_token]
    end
end
