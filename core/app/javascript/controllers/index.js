import { eagerLoadControllersFrom } from '@hotwired/stimulus-loading'
// Import and register all your controllers from the importmap via controllers/**/*_controller
import { application } from 'controllers/application'

eagerLoadControllersFrom('controllers', application)
