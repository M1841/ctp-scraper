import uws from "uWebSockets.js";
import Line from "./Line.js";
import Store from "./Store.js";

const app = uws.App();
const port = 8080;

app.get("/schedule/:lineNumber", async (res, req) => {
  res.onAborted(() => console.log("Request aborted"));
  try {
    if (!req?.getParameter("lineNumber")) {
      return res.writeStatus("400").end("Missing line number parameter");
    }
    const lineNumber = req.getParameter("lineNumber").toUpperCase();

    const { result, error } = await Line.fetchSchedule(lineNumber);
    if (error) {
      return res.writeStatus(error.status.toString()).end(error.message);
    } else {
      return res
        .writeHeader("Content-Type", "application/json")
        .end(JSON.stringify(result));
    }
  } catch (exception) {
    return res.writeStatus("500").end(exception.message);
  }
});

app.get("/url/:lineNumber", async (res, req) => {
  res.onAborted(() => console.log("Request aborted"));
  try {
    if (!req?.getParameter("lineNumber")) {
      return res.writeStatus("400").end("Missing line number parameter");
    }
    const lineNumber = req.getParameter("lineNumber").toUpperCase();

    const { result, error } = await Line.fetchUrl(lineNumber);
    if (error) {
      return res.writeStatus(error.status.toString()).end(error.message);
    } else {
      return res
        .writeHeader("Content-Type", "application/json")
        .end(JSON.stringify(result));
    }
  } catch (exception) {
    return res.writeStatus("500").end(exception.message);
  }
});

app.get("/lines", async (res, _) => {
  res.onAborted(() => console.log("Request aborted"));
  try {
    const { result, error } = await Line.fetchAll();
    if (error) {
      return res.writeStatus(error.status.toString()).end(error.message);
    } else {
      return res
        .writeHeader("Content-Type", "application/json")
        .end(JSON.stringify(result));
    }
  } catch (exception) {
    return res.writeStatus("500").end(exception.message);
  }
});

app.get("/lines/:lineType", async (res, req) => {
  res.onAborted(() => console.log("Request aborted"));
  try {
    if (!req?.getParameter("lineType")) {
      return res.writeStatus("400").end("Missing line type parameter");
    }
    const lineType = req.getParameter("lineType").toLowerCase();

    const { result, error } = await Line.fetchAllByType(lineType);
    if (error) {
      return res.writeStatus(error.status.toString()).end(error.message);
    } else {
      return res
        .writeHeader("Content-Type", "application/json")
        .end(JSON.stringify(result));
    }
  } catch (exception) {
    return res.writeStatus("500").end(exception.message);
  }
});

app.get("/health", (res, _) => {
  res.writeStatus("200").endWithoutBody();
});

app.listen(port, async (socket) => {
  if (socket) {
    console.log(`Server running at port ${port}`);
    await Store.init();
  } else {
    console.error("Failed starting the server");
  }
});
