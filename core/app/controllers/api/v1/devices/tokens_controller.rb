class Api::V1::Devices::TokensController < ApplicationController
  allow_unauthenticated_access
  disallow_account_scope

  def create
    device_authorization = Device::Authorization.find_by(device_code: params[:device_code])
    return render json: { error: "invalid_grant" }, status: :bad_request unless device_authorization

    if device_authorization.expired?
      render json: { error: "expired_token" }, status: :bad_request
    elsif device_authorization.status == "approved"
      session = device_authorization.identity.sessions.create!(
        kind: "desktop",
        user_agent: request.user_agent,
        ip_address: request.remote_ip
      )
      device_authorization.update!(status: "consumed")
      render json: { access_token: session.signed_id, identity: device_authorization.identity }
    else
      render json: { error: "authorization_pending" }, status: :bad_request
    end
  end
end
