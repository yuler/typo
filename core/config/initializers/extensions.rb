Dir["#{Rails.root}/lib/rails_ext/*.rb"].each { |path| require "rails_ext/#{File.basename(path, ".rb")}" }
