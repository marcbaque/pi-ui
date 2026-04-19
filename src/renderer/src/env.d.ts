/// <reference types="vite/client" />

import type { PiAPI } from '../../shared/types'

declare global {
  interface Window {
    pi: PiAPI
  }
}
