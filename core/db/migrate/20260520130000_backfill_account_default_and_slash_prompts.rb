class BackfillAccountDefaultAndSlashPrompts < ActiveRecord::Migration[8.2]
  def up
    say_with_time "Backfilling default_prompt and slash_prompts for accounts" do
      Account.find_each do |account|
        backfill_default_prompt(account)
        backfill_slash_prompts(account)
      end
    end
  end

  def down
    # Data backfill is not reversed.
  end

  private

  def backfill_default_prompt(account)
    return if account.default_prompt.present?

    DefaultPrompt.create!(
      account: account,
      value: DefaultPrompt::DEFAULT_VALUE
    )
  end

  def backfill_slash_prompts(account)
    SlashPrompt::DEFAULT_SLASH_COMMANDS.each do |cmd|
      next if account.slash_prompts.exists?(key: cmd[:key])

      account.slash_prompts.create!(
        key: cmd[:key],
        value: cmd[:value],
        aliases: cmd[:aliases] || []
      )
    end
  end
end
