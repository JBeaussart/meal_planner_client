import axios from "axios";
import { Platform } from "react-native";

// Prefer localhost when running in a web browser to avoid unreachable LAN IPs
// In native (iOS/Android), use EXPO_PUBLIC_API_URL so devices can reach the host
export const BASE_URL =
  Platform.OS === "web"
    ? "http://localhost:3000"
    : process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000";

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: {
    // Default to JSON; will be removed for FormData in interceptor below
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

let authToken: string | null = null;

export const setAuthToken = (token: string | null) => {
  authToken = token;
};

api.interceptors.request.use((config) => {
  if (authToken) {
    config.headers = config.headers || {};
    config.headers["Authorization"] = authToken;
  }
  // If sending FormData (file uploads), let Axios/Env set proper boundaries
  const isFormData = typeof FormData !== 'undefined' && config.data instanceof FormData;
  if (isFormData) {
    // Remove any preset content-type so the runtime can set correct multipart boundary
    if (config.headers) {
      delete (config.headers as any)["Content-Type"];
      delete (config.headers as any)["content-type"];
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => {
    const auth =
      (response.headers as any)?.authorization ||
      (response.headers as any)?.Authorization;
    if (auth) authToken = auth;
    return response;
  },
  (error) => Promise.reject(error)
);

export const endpoints = {
  login: "/api/v1/users/sign_in",
  logout: "/api/v1/users/sign_out",
  recipes: "/api/v1/recipes",
  scheduled_recipes: "/api/v1/scheduled_recipes",
  shopping_list: "/api/v1/shopping_list",
  shopping_list_check: "/api/v1/shopping_list/check",
};

// Helpers to handle JSON:API format returned by server
export type JsonApiResource<T> = {
  id: string;
  type: string;
  attributes: T;
  relationships?: Record<string, any>;
};

export type JsonApiList<T> = {
  data: JsonApiResource<T>[];
  included?: any[];
};

export type JsonApiOne<T> = {
  data: JsonApiResource<T>;
  included?: any[];
};
