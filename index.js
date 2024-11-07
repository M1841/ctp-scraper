import uws from "uWebSockets.js";
import Line from "./Line.js";

const app = uws.App();
const port = 8080;

app.get("/lines", async (res, _) => {
  res.onAborted(() => console.log("Request aborted"));
  try {
    const { result, error } = await Line.fetchAll();
    if (error) {
      return res.cork(() =>
        res.writeStatus(error.status.toString()).end(error.message)
      );
    } else {
      return res.cork(() =>
        res
          .writeHeader("Content-Type", "application/json")
          .end(JSON.stringify(result))
      );
    }
  } catch (exception) {
    return res.cork(() => res.writeStatus("500").end(exception.message));
  }
});

app.get("/health", (res, _) => {
  res.cork(() => res.writeStatus("200").endWithoutBody());
});

app.listen(port, async (socket) => {
  if (socket) {
    console.log(`Server running at port ${port}`);
  } else {
    console.error("Failed starting the server");
  }
});
