// src/renderer/src/test-setup.ts
import '@testing-library/jest-dom'

// jsdom doesn't implement scrollTo — provide a no-op
Element.prototype.scrollTo = () => {}
