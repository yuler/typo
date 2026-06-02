class Api::V1::BaseController < ActionController::API
  include ApiAuthentication
  include Authorization
  include CurrentRequest
  include GearedPagination::Controller

  # Bump when shipping a release that must block older desktop clients.
  MINIMUM_DESKTOP_VERSION = "1.7.0"

  before_action :require_supported_desktop_version

  rescue_from ActiveRecord::RecordNotFound do |exception|
    render json: { error: exception.message }, status: :not_found
  end

  private
    def require_supported_desktop_version
      version = desktop_client_version
      return if version.blank?

      if Gem::Version.new(version) < Gem::Version.new(MINIMUM_DESKTOP_VERSION)
        render json: {
          error: "Upgrade required",
          minimum_version: MINIMUM_DESKTOP_VERSION
        }, status: :upgrade_required
      end
    end

    def desktop_client_version
      request.user_agent&.match(/Typo Desktop\/(\d+\.\d+\.\d+)/)&.[](1)
    end
end
