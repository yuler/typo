import { Controller } from '@hotwired/stimulus'

export default class extends Controller {
  static targets = ['input', 'output']
  static values = { fallback: String }

  update() {
    const val = this.inputTarget.value.trim()
    const slugified = val.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
    
    this.outputTarget.textContent = slugified || this.fallbackValue
  }
}
