class CompletionPersistenceJob < ApplicationJob
  queue_as :default

  def perform(attributes)
    Completion.create!(attributes)
  rescue ActiveRecord::RecordInvalid => e
    Rails.logger.error "Failed to persist completion: #{e.message}"
  end
end
