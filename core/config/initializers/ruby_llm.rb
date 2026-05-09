RubyLLM.configure do |config|
  config.deepseek_api_key = ENV["DEEPSEEK_API_KEY"]
  config.default_model = "deepseek-v4-flash"
end
