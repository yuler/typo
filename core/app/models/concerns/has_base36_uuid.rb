module HasBase36Uuid
  extend ActiveSupport::Concern

  included do
    self.primary_key = :id
    before_create :generate_base36_uuid
  end

  private

  def generate_base36_uuid
    self.id ||= ActiveRecord::Type::Uuid.generate if self.class.primary_key == "id"
  end
end
