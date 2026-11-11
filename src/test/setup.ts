import 'fake-indexeddb/auto'
import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, beforeEach } from 'vitest'
import { resetDb } from './db'

beforeEach(async () => {
  await resetDb()
})

afterEach(() => {
  cleanup()
  localStorage.clear()
  window.location.hash = ''
})
