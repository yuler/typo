import { Controller } from '@hotwired/stimulus'

export default class extends Controller {
  static targets = ['input', 'output']
  static values = { fallback: String }

  update() {
    const val = this.inputTarget.value.trim()
    this.outputTarget.textContent = val || this.fallbackValue
  }
}
