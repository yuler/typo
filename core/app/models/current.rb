class Current < ActiveSupport::CurrentAttributes
  attribute :identity, :account, :user, :session
end
