class DevicesController < ApplicationController
  allow_unauthenticated_access only: [:show]
  disallow_account_scope

  def show
    @device_auth = DeviceAuthorization.find_by(user_code: params[:user_code]) if params[:user_code]
  end

  def update
    @device_auth = DeviceAuthorization.find_by!(user_code: params[:user_code])
    if params[:commit] == "approve"
      @device_auth.update!(identity: Current.identity, status: "approved")
      redirect_to root_path, notice: "Device successfully authorized."
    else
      @device_auth.update!(status: "denied")
      redirect_to root_path, alert: "Authorization denied."
    end
  end
end
