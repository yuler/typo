class CompletionPersistenceJob < ApplicationJob
  queue_as :default

  def perform(completion, attributes)
    completion.update!(attributes)
  rescue ActiveRecord::RecordInvalid, ActiveRecord::RecordNotFound => e
    Rails.logger.error "Failed to persist completion: #{e.message}"
  end
end
