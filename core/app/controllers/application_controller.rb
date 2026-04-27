class ApplicationController < ActionController::Base
  include Authentication
  include Authorization
  include CurrentRequest

  allow_browser versions: :modern

  rescue_from ActionController::ParameterMissing do |exception|
    redirect_back fallback_location: root_path, alert: exception.message
  end
end
