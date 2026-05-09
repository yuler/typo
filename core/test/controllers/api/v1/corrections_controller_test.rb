require "test_helper"

class Api::V1::CorrectionsControllerTest < ActionDispatch::IntegrationTest
  test "should get success on create" do
    post api_v1_corrections_url, params: { text: "hello", system_prompt: "correct this" }, as: :json
    assert_response :success
  end
end
