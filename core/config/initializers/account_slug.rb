module AccountSlug
  PATTERN = /([a-zA-Z0-9_-]{3,24})/
  PATH_INFO_MATCH = /\A(\/#{AccountSlug::PATTERN})/

  class Extractor
    RESERVED_SLUGS = %w[admin api assets billing dashboard help jobs login logout magic_link rails settings setup static support typo session]

    def initialize(app)
      @app = app
    end

    # We're using account id prefixes in the URL path. Rather than namespace
    # all our routes, we're "mounting" the Rails app at this URL prefix.
    def call(env)
      request = Rack::Request.new(env)

      # $1, $2, $' == script_name, slug, path_info
      if request.script_name && request.script_name =~ PATH_INFO_MATCH
        # Likely due to restarting the action cable connection after upgrade
        env["typo.account_slug"] = AccountSlug.decode($2)
      elsif request.path_info =~ PATH_INFO_MATCH
        # Yanks the prefix off PATH_INFO and move it to SCRIPT_NAME
        request.engine_script_name = request.script_name = $1
        request.path_info = $'.empty? ? "/" : $'
        env["typo.account_slug"] = AccountSlug.decode($2)
      end

      Rails.logger.info "\n\n\nAccount slug: #{env["typo.account_slug"]}\n\n\n"

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
