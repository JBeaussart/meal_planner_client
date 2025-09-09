import axios from 'axios'

export const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000'

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
})

let authToken: string | null = null

export const setAuthToken = (token: string | null) => {
  authToken = token
}

api.interceptors.request.use((config) => {
  if (authToken) {
    config.headers = config.headers || {}
    config.headers['Authorization'] = authToken
  }
  return config
})

api.interceptors.response.use(
  (response) => {
    const auth =
      (response.headers as any)?.authorization || (response.headers as any)?.Authorization
    if (auth) authToken = auth
    return response
  },
  (error) => Promise.reject(error),
)

export const endpoints = {
  login: '/api/v1/users/sign_in',
  logout: '/api/v1/users/sign_out',
  recipes: '/api/v1/recipes',
}

// Helpers to handle JSON:API format returned by server
export type JsonApiResource<T> = {
  id: string
  type: string
  attributes: T
  relationships?: Record<string, any>
}

export type JsonApiList<T> = {
  data: JsonApiResource<T>[]
  included?: any[]
}

export type JsonApiOne<T> = {
  data: JsonApiResource<T>
  included?: any[]
}
