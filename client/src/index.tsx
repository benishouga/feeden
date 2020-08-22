import React from "react";
import ReactDOM from "react-dom";

import { App } from "./App";
import { AppProvider } from "./store";

const rootElement = document.getElementById("root");
ReactDOM.render(
  <AppProvider>
    <App />
  </AppProvider>,
  rootElement
);
