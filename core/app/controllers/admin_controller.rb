class AdminController < ApplicationController
  disallow_account_scope
  before_action :ensure_staff

  def show
  end
end
