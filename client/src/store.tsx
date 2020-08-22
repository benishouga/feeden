import React from "react";
import produce from "immer";
import { createTinyContext } from "tiny-context";

type State = { debug: string };

export class Actions {
  async fetch(state: State, url: string, webOrRss: string) {
    const res = await fetch(`http://localhost:3000/api/${webOrRss}?url=${encodeURIComponent(url)}`, {
      method: "GET",
      mode: "cors",
      cache: "no-cache",
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
      },
    });
    const json = await res.json();
    return produce(state, (draft) => {
      draft.debug = JSON.stringify(json, null, "  ");
    });
  }
}

const { Provider, useContext } = createTinyContext<State>().actions(new Actions());

export const useAppContext = useContext;
export const AppProvider = ({ children }: { children: React.ReactNode }) => (
  <Provider value={{ debug: "" }}>{children}</Provider>
);
