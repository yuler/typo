class Api::V1::Devices::TokensController < Api::V1::BaseController
  skip_account_scope
  allow_unauthenticated_access

  def create
    device_authorization = Device::Authorization.find_by(device_code: params[:device_code])
    return render json: { error: "invalid_grant" }, status: :bad_request unless device_authorization

    if device_authorization.expired?
      return render json: { error: "expired_token" }, status: :unauthorized
    end

    if device_authorization.polling_too_fast?
      device_authorization.update_column(:last_polled_at, Time.current)
      return render json: { error: "slow_down" }, status: :bad_request
    end

    device_authorization.update_column(:last_polled_at, Time.current)

    case device_authorization.status
    when "approved"
      session = nil
      device_authorization.transaction do
        device_authorization.lock!
        if device_authorization.status == "approved"
          session = device_authorization.identity.sessions.create!(
            kind: "desktop",
            user_agent: request.user_agent,
            ip_address: request.remote_ip
          )
          device_authorization.update!(status: "consumed")
        end
      end

      if session
        render json: { access_token: session.signed_id, identity: device_authorization.identity }
      else
        render json: { error: "invalid_grant" }, status: :bad_request
      end
    when "pending"
      render json: { error: "authorization_pending" }, status: :bad_request
    else # denied, consumed
      render json: { error: "invalid_grant" }, status: :bad_request
    end
  end
end
