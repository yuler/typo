module AccountSlug
  class Extractor
    RESERVED_SLUGS = %w[admin api assets billing dashboard help jobs login logout magic_link rails settings setup static support typo session]

    def initialize(app)
      @app = app
    end

    def call(env)
      request = Rack::Request.new(env)
      path_parts = request.path_info.split("/")
      first_part = path_parts[1]

      if first_part.present? && !RESERVED_SLUGS.include?(first_part)
        # Move the slug from PATH_INFO to SCRIPT_NAME
        # This makes Rails routes unaware of the slug prefix
        env["SCRIPT_NAME"] = env["SCRIPT_NAME"].to_s + "/#{first_part}"
        env["PATH_INFO"] = "/" + path_parts[2..].join("/")
        env["typo.account_slug"] = first_part
      end

      @app.call(env)
    end
  end
end
