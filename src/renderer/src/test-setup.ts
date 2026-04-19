// src/renderer/src/test-setup.ts
import '@testing-library/jest-dom'

// jsdom doesn't implement scrollTo — provide a no-op (only in browser/jsdom environment)
if (typeof Element !== 'undefined') {
  Element.prototype.scrollTo = () => {}
}
