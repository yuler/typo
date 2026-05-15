module Api
  module Auth
    class DevicesController < ApplicationController
      allow_unauthenticated_access
      disallow_account_scope

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
