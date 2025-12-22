import axios from "axios";
import { API_BASE_URL } from "../constants/index";
import type { AppStore } from "../store/index";
import { logout } from "../store/authSlice";

const http = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

export const setupAxiosInterceptors = (store: AppStore) => {
  http.interceptors.request.use((config) => {
    const token = store.getState().auth.token;

    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  });

  http.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response && error.response.status === 401) {
        console.warn("Token expired or invalid");
        store.dispatch(logout());
      }
      return Promise.reject(error);
    }
  );
};
export default http;
