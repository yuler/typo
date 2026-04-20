import { describe, expect, it } from 'vitest'
import { interpolate } from '../src/index'

describe('interpolate', () => {
  it('returns the template unchanged when there are no placeholders', () => {
    expect(interpolate('Hello world', {})).toBe('Hello world')
  })

  it('substitutes a single placeholder', () => {
    expect(interpolate('Hello, {name}', { name: 'Yule' })).toBe('Hello, Yule')
  })

  it('substitutes multiple placeholders', () => {
    expect(
      interpolate('{greeting}, {name}!', { greeting: 'Hi', name: 'Yule' }),
    ).toBe('Hi, Yule!')
  })

  it('coerces numeric values to strings', () => {
    expect(interpolate('Count: {count}', { count: 42 })).toBe('Count: 42')
  })

  it('leaves the placeholder intact when the variable is missing', () => {
    expect(interpolate('Hello, {name}', {})).toBe('Hello, {name}')
  })

  it('only substitutes alphanumeric/underscore tokens', () => {
    expect(interpolate('a {x_1} b', { x_1: 'OK' })).toBe('a OK b')
  })

  it('does not touch unrelated braces', () => {
    expect(interpolate('JSON: {"k":1}', {})).toBe('JSON: {"k":1}')
  })
})
