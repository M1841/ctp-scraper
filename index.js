import express from "express";
import Line from "./Line.js";

const app = express();
const port = 8080;

app.get("/schedule/:lineNumber", async (req, res) => {
  if (!req?.params?.lineNumber) {
    return res.status(400);
  }
  const lineNumber = req.params.lineNumber.toUpperCase();

  const { result, error } = await Line.fetchSchedule(lineNumber);
  if (error) {
    return res.status(error.status).send(error.message);
  } else {
    return res.json(result);
  }
});

app.get("/url/:lineNumber", async (req, res) => {
  if (!req?.params?.lineNumber) {
    return res.status(400);
  }
  const lineNumber = req.params.lineNumber.toUpperCase();

  const { result, error } = await Line.fetchUrl(lineNumber);
  if (error) {
    return res.status(error.status).send(error.message);
  } else {
    return res.json(result);
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
