import express from "express";
import cors from "cors";

import { Article } from "./lib/article";

console.log("article initilizing");
const article = new Article();
article.initialize().then(() => {
  console.log("article initialization completed");

  const app = express();
  app.use(cors());

  app.get("/api/web", async (req, res) => {
    console.log("/api/web", req.query.url);
    const result = await article.web(req.query.url as string);
    return res.status(200).json(result).end();
  });

  app.get("/api/rss", (req, res) => {
    return res.status(400).send("Bad Request").end();
  });

  app.listen(3000, function () {
    console.log(`Application listening at http://localhost:3000`);
  });
});
