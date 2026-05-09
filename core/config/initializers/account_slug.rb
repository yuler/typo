module AccountSlug
  PATTERN = /([a-zA-Z0-9_-]{4,16})/
  FORMAT = /\A[a-z0-9\-_]+\z/
  LENGTH = 4..16
  PATH_INFO_MATCH = /\A(\/#{AccountSlug::PATTERN})/
  RESERVED_SLUGS = %w[session dashboard onboarding dev admin api assets billing help jobs login logout magic_link rails settings setup static support typo]

  class Extractor
    def initialize(app)
      @app = app
    end

    # We're using account id prefixes in the URL path. Rather than namespace
    # all our routes, we're "mounting" the Rails app at this URL prefix.
    def call(env)
      request = ActionDispatch::Request.new(env)

      # Match standard API path patterns, e.g.: /api/v1/:account_slug/xxx or /api/v1/accounts/:account_slug/xxx
      # $1 = api prefix (/api/v1) or (/api/v1/accounts), $2 = :account_slug, $' = remaining path (/test/private)
      if request.path_info =~ %r{\A(/api/v\d+(?:/accounts)?)/(#{AccountSlug::PATTERN})} && !$2.in?(RESERVED_SLUGS)
        env["typo.account_slug"] = AccountSlug.decode($2)
        request.path_info = "#{$1}#{$'}"
      # $1, $2, $' == script_name, slug, path_info
      elsif request.script_name && request.script_name =~ PATH_INFO_MATCH
        # Likely due to restarting the action cable connection after upgrade
        env["typo.account_slug"] = AccountSlug.decode($2)
      elsif request.path_info =~ PATH_INFO_MATCH && !$2.in?(RESERVED_SLUGS)
        # Yanks the prefix off PATH_INFO and move it to SCRIPT_NAME
        request.engine_script_name = request.script_name = $1
        request.path_info = $'.empty? ? "/" : $'
        env["typo.account_slug"] = AccountSlug.decode($2)
      end

      Rails.logger.info { "[AccountSlug] slug=#{env["typo.account_slug"].inspect} path=#{env["PATH_INFO"]}" }

      # Set the account in the current thread
      if env["typo.account_slug"]
        account = Account.find_by(slug: env["typo.account_slug"])
        Current.with_account(account) do
          @app.call(env)
        end
      else
        Current.without_account do
          @app.call(env)
        end
      end
    end
  end

  # Decode slug to ID
  def self.decode(slug) slug.to_s end
  # Encode ID to slug
  def self.encode(id) id.to_s end
end

Rails.application.config.middleware.insert_after Rack::TempfileReaper, AccountSlug::Extractor
