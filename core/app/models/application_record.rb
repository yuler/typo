class ApplicationRecord < ActiveRecord::Base
  primary_abstract_class
  include HasBase36Uuid
end
