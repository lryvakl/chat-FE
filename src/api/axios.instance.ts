import axios from "axios";
import { SERVER_URL } from "../constants/index";
import { store } from "../store/index";
import { logout } from "../store/authSlice";

const http = axios.create({
  baseURL: SERVER_URL,
  headers: { "Content-Type": "application/json" },
});

http.interceptors.request.use((config) => {
  const state = store.getState();
  const token = state.auth.token;
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

export default http;
