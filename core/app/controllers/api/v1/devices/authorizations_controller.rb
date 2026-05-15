class Api::V1::Devices::AuthorizationsController < ApplicationController
  allow_unauthenticated_access
  disallow_account_scope

  def create
    device_auth = Device::Authorization.create!
    render json: {
      device_code: device_auth.device_code,
      user_code: device_auth.user_code,
      verification_uri: main_app.device_authorization_url(code: device_auth.user_code),
      expires_in: (device_auth.expires_at - Time.current).to_i,
      interval: 5
    }
  end
end
