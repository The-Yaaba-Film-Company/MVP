import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterAll, afterEach, beforeAll } from 'vitest'
import { server } from '../api/mocks/server'

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

// RTL cannot self-register cleanup when vitest `globals: false`
afterEach(() => cleanup())

// ---- jsdom gaps commonly needed by Spectrum + Tiptap ----

const featureWindow = window as {
  matchMedia?: typeof window.matchMedia
  ResizeObserver?: typeof window.ResizeObserver
}

function createMediaQueryList(): MediaQueryList {
  return {
    matches: false,
    media: '',
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }
}

if (!featureWindow.matchMedia) {
  featureWindow.matchMedia = createMediaQueryList
}

if (!featureWindow.ResizeObserver) {
  featureWindow.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
}

Object.defineProperty(window, 'scrollTo', {
  value: () => {},
  writable: true,
})

// jsdom lacks these; ProseMirror (Tiptap) and user-event rely on them:
// - elementFromPoint (selection handling)
// - Element/Range geometry (typing into a contenteditable)
if (typeof document.elementFromPoint !== 'function') {
  document.elementFromPoint = () => null
}
const emptyRects = () => [] as unknown as DOMRectList
if (typeof Element.prototype.getClientRects !== 'function') {
  Element.prototype.getClientRects = emptyRects
}
if (typeof Range.prototype.getClientRects !== 'function') {
  Range.prototype.getClientRects = emptyRects
}
if (typeof Range.prototype.getBoundingClientRect !== 'function') {
  Range.prototype.getBoundingClientRect = () => ({
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: 0,
    height: 0,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  })
}
