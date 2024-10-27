import cron from "node-cron";
import Line from "./Line.js";

export default class Store {
  /**
   * @type Data
   */
  static data = {
    lines: {},
    schedules: {},
  };

  static init = () => {
    cron.schedule("* 3 * * *", this.refresh);
    this.refresh();
  };

  static refresh = async () => {
    try {
      console.log("Started data refresh");

      const { result, error } = await Line.fetchAll();
      if (error) {
        throw new Error(error.message);
      }
      this.data.lines = result;

      const responses = await Promise.all(
        Object.entries(result).map(async ([lineNumber, _]) => {
          const schedule = await Line.fetchSchedule(lineNumber);
          return { lineNumber, schedule };
        })
      );
      for (const response of responses) {
        if (response.schedule.error) {
          throw new Error(response.schedule.error.message);
        }
        this.data.schedules[response.lineNumber] = response.schedule.result;
      }

      console.log("Finished data refresh");
      console.log(this.data);
    } catch (exception) {
      console.error(`Failed data refresh: ${exception.message}`);
    }
  };
}
