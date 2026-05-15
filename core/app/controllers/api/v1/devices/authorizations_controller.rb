class Api::V1::Devices::AuthorizationsController < ApplicationController
  allow_unauthenticated_access
  disallow_account_scope

  def create
    authorization = Device::Authorization.create!
    render json: {
      device_code: authorization.device_code,
      user_code: authorization.user_code,
      verification_uri: main_app.device_authorization_url(user_code: authorization.user_code),
      expires_in: (authorization.expires_at - Time.current).to_i,
      interval: Device::Authorization::POLLING_INTERVAL
    }
  end
end
