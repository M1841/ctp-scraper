import express from "express";
import Line from "./Line.js";
import Store from "./Store.js";

const app = express();
const port = 8080;

app.get("/schedule/:lineNumber", async (req, res) => {
  try {
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
  } catch (exception) {
    return res.status(500).send(exception.message);
  }
});

app.get("/url/:lineNumber", async (req, res) => {
  try {
    if (!req?.params?.lineNumber) {
      return res.status(400).send("Missing line number");
    }
    const lineNumber = req.params.lineNumber.toUpperCase();

    const { result, error } = await Line.fetchUrl(lineNumber);
    if (error) {
      return res.status(error.status).send(error.message);
    } else {
      return res.json(result);
    }
  } catch (exception) {
    return res.status(500).send(exception.message);
  }
});

app.get("/lines", async (_, res) => {
  try {
    const { result, error } = await Line.fetchAll();
    if (error) {
      return res.status(error.status).send(error.message);
    } else {
      return res.json(result);
    }
  } catch (exception) {
    return res.status(500).send(exception.message);
  }
});

app.get("/lines/:lineType", async (req, res) => {
  try {
    const { result, error } = await Line.fetchAllByType(req.params.lineType);
    if (error) {
      return res.status(error.status).send(error.message);
    } else {
      return res.json(result);
    }
  } catch (exception) {
    return res.status(500).send(exception.message);
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
  Store.init();
});
