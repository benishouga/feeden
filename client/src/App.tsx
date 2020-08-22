import React, { useState } from "react";
import { useAppContext } from "./store";

export function App() {
  const {
    actions: { fetch },
    state: { debug },
  } = useAppContext();

  const [feedUrl, setFeedUrl] = useState("");
  const [webOrRss, setWebOrRss] = useState("web");

  return (
    <div>
      <input type="text" value={feedUrl} onChange={(e) => setFeedUrl(e.target.value)} />
      <input type="radio" value={"web"} checked={"web" === webOrRss} onChange={(e) => setWebOrRss(e.target.value)} />
      web
      <input type="radio" value={"rss"} checked={"rss" === webOrRss} onChange={(e) => setWebOrRss(e.target.value)} />
      rss <button onClick={() => fetch(feedUrl, webOrRss)}>test</button>
      <pre>{debug}</pre>
    </div>
  );
}
