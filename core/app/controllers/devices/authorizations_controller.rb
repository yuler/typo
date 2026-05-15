class Devices::AuthorizationsController < ApplicationController
  disallow_account_scope

  def show
    @device_authorization = Device::Authorization.find_by(user_code: params[:user_code]) if params[:user_code]
  end

  def update
    @device_authorization = Device::Authorization.find_by!(user_code: params[:user_code])
    if params[:decision] == "approve"
      @device_authorization.update!(identity: Current.identity, status: "approved")
      redirect_to root_path, notice: "Device successfully authorized."
    else
      @device_authorization.update!(status: "denied")
      redirect_to root_path, alert: "Authorization denied."
    end
  end
end
