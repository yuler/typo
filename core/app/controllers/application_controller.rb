class ApplicationController < ActionController::Base
  include Authentication
  include Authorization

  allow_browser versions: :modern
end
