Rails.application.routes.draw do
  resource :session do
    scope module: :sessions do
      # resources :transfers
      resource :magic_link
      resource :menu
    end
  end

  resource :onboarding, only: %i[ new create ]
  resource :device, only: [] do
    scope module: :devices do
      resource :authorization, only: [ :show, :update ], path: "authorization(/:user_code)"
    end
  end


  # Dashboard is now at the "root" of the mounted slug
  # Because the middleware moves the slug to SCRIPT_NAME,
  # Rails sees "/" as the path for the dashboard.
  resource :dashboard, only: :show

  # Defines the root path route ("/")
  root to: "dashboards#show"

  # Reveal health status on /up that returns 200 if the app boots with no exceptions, otherwise 500.
  # Can be used by load balancers and uptime monitors to verify that the app is live.
  get "up" => "rails/health#show", as: :rails_health_check

  # Render dynamic PWA files from app/views/pwa/* (remember to link manifest in application.html.erb)
  # get "manifest" => "rails/pwa#manifest", as: :pwa_manifest
  # get "service-worker" => "rails/pwa#service_worker", as: :pwa_service_worker

  # API
  namespace :api do
    namespace :v1, defaults: { format: :json } do
      resources :completions, only: :create

      resource :device, only: [] do
        scope module: :devices do
          resource :authorization, only: :create
          resource :token, only: :show
        end
      end
      namespace :test do
        get :private, to: "private#show"
        get :public, to: "public#show"
      end
    end
  end

  # Admin
  namespace :admin do
    mount MissionControl::Jobs::Engine, at: "/jobs"
  end

  # Devs only
  if Rails.env.development?
    namespace :dev do
      mount LetterOpenerWeb::Engine, at: "/letter_opener"
    end
  end
end
