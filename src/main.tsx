import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import { BrowserRouter } from "react-router-dom";
import { PersistGate } from "redux-persist/integration/react";

import App from "./App.tsx";
import { store, persistor } from "./store/index.ts";
import { setupAxiosInterceptors } from "./api/axios.instance.ts";
import { AppThemeProvider } from "./theme/ThemeContext.tsx";
import { PreferencesProvider } from "./preferences/PreferencesContext.tsx";
import "./i18n";
import "./index.css";

setupAxiosInterceptors(store);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <AppThemeProvider>
          <PreferencesProvider>
            <BrowserRouter>
              <App />
            </BrowserRouter>
          </PreferencesProvider>
        </AppThemeProvider>
      </PersistGate>
    </Provider>
  </StrictMode>
);
