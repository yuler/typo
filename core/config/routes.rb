Rails.application.routes.draw do
  resource :session, only: [:new, :create, :destroy]
  resource :magic_link, only: [:new, :create]
  
  # Dashboard is now at the "root" of the mounted slug
  # Because the middleware moves the slug to SCRIPT_NAME,
  # Rails sees "/" as the path for the dashboard.
  resource :dashboard, only: [:show]
  
  root to: "dashboards#show"
end
