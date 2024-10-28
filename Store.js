import cron from "node-cron";
import Line from "./Line.js";

/**
 * Static class handling resource acquisition and storage
 */
export default class Store {
  /**
   * @type {Data}
   */
  static data = {
    lines: {},
    schedules: {},
  };

  /**
   * Initializes the Store by setting up a cron job and performing an initial data refresh
   */
  static init = () => {
    cron.schedule("* 3 * * *", this.refresh);
    this.refresh();
  };

  /**
   * Refreshed the data by fetching all the bus lines and their schedules
   * @returns {Promise<void>}
   */
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
