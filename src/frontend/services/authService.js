
import {
  request,
  setStoredToken,
  clearStoredToken,
} from './httpClient.js'

export const authService = {
  async register(body, persist = true) {
    const result = await request('/auth/register', {
      method: 'POST',
      body,
      auth: false,
    })

    setStoredToken(result.token, persist)
    return result
  },

  async login(body, persist = true) {
    const result = await request('/auth/login', {
      method: 'POST',
      body,
      auth: false,
    })

    setStoredToken(result.token, persist)
    return result
  },

  async logout() {
    const result = await request('/auth/logout', {
      method: 'POST',
    })

    clearStoredToken()
    return result
  },

  me: () => request('/auth/me'),

  saveBankDetails: (body) =>
    request('/users/me/bank-details', {
      method: 'PUT',
      body,
    }),

  removeBankDetails: () =>
    request('/users/me/bank-details', {
      method: 'DELETE',
    }),
}
