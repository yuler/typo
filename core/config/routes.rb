Rails.application.routes.draw do
  resource :session do
    scope module: :sessions do
      # resources :transfers
      resource :magic_link
    end
  end

  # Dashboard is now at the "root" of the mounted slug
  # Because the middleware moves the slug to SCRIPT_NAME,
  # Rails sees "/" as the path for the dashboard.
  resource :dashboard, only: [:show]

  root to: "dashboards#show"
end
