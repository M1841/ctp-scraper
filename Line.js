import puppeteer, { Browser } from "puppeteer";
import Store from "./Store.js";

/**
 * Static class providing an API for operations on bus line data
 */
export default class Line {
  static baseUrl = "https://ctpcj.ro/index.php/ro/orare-linii/";
  static lineTypes = [
    "urban",
    "metropolitan",
    "night",
    "express",
    "supermarket",
  ];
  static typeUrls = {
    urban: this.baseUrl + "linii-urbane/",
    metropolitan: this.baseUrl + "linii-metropolitane/",
    night: this.baseUrl + "transport-noapte/",
    express: this.baseUrl + "linie-expres/",
    supermarket: this.baseUrl + "linii-supermarket/",
  };

  /**
   * @type {Browser | null}
   */
  static browser = null;
  /**
   * Get a singleton instance of the Puppeteer browser
   * @returns {Promise<Browser>} A promise that resolves to a Puppeteer browser instance
   */
  static getBrowserInstance = async () => {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: true,
        args: [
          "--disable-gpu",
          "--disable-dev-shm-usage",
          "--disable-setuid-sandbox",
          "--no-sandbox",
        ],
      });
    }
    return this.browser;
  };

  /**
   * Fetch the URL for a specific bus line number
   * @param {string} lineNumber The bus line number to fetch the URL for
   * @returns {Promise<{
   *   result: string;
   *   error: null;
   * } | {
   *   result: null;
   *   error: HttpError;
   * }>} A promise that resolves to an object containing the URL or an error
   */
  static fetchUrl = async (lineNumber) => {
    if (Store.data?.lines && Store.data.lines[lineNumber]) {
      console.log(`Serving cached url for line ${lineNumber}`);
      return { result: Store.data.lines[lineNumber].url, error: null };
    }

    let baseUrl = this.typeUrls["urban"];
    switch (true) {
      case lineNumber[0] === "M":
        baseUrl = this.typeUrls["metropolitan"];
        break;
      case lineNumber.at(-1) === "N":
        baseUrl = this.typeUrls["night"];
        break;
      case lineNumber.at(-1) === "E":
        baseUrl = this.typeUrls["express"];
        break;
      case lineNumber.slice(0, 2) === "99":
        baseUrl = this.typeUrls["supermarket"];
        break;
    }

    const browser = await this.getBrowserInstance();
    const page = await browser.newPage();

    await page.setRequestInterception(true);
    page.on("request", (req) => {
      const resourceType = req.resourceType();
      if (["image", "stylesheet", "font"].includes(resourceType)) {
        req.abort();
      } else {
        req.continue();
      }
    });

    await page.goto(baseUrl, { waitUntil: "domcontentloaded", timeout: 0 });
    await page.waitForSelector("div.tzPortfolio");

    let lineUrl = await page.evaluate((lineNumber) => {
      const anchors = document.querySelectorAll("div.tzPortfolio a");

      for (const anchor of anchors) {
        if (anchor.textContent.trim().split(" ")[1] === lineNumber) {
          return { result: anchor.href, error: null };
        }
      }
      return {
        result: null,
        error: { status: 404, message: `Line ${lineNumber} not found` },
      };
    }, lineNumber);

    await page.close();
    console.log(`Serving fetched url for line ${lineNumber}`);
    return lineUrl;
  };

  /**
   * Fetch the schedule for a bus line number
   * @param {string} lineNumber The line number to fetch the schedule for
   * @returns {Promise<{
   *   result: StationDepartures[];
   *   error: null;
   * } | {
   *   result: null;
   *   error: HttpError;
   * }>} A promise that resolves to an object containing the schedule or an error
   */
  static fetchSchedule = async (lineNumber) => {
    if (Store.data?.schedules && Store.data.schedules[lineNumber]) {
      console.log(`Serving cached schedule for line ${lineNumber}`);
      return { result: Store.data.schedules[lineNumber], error: null };
    }

    let { result: url, error } = await this.fetchUrl(lineNumber);
    if (error) {
      return { result: null, error: error };
    }
    const browser = await this.getBrowserInstance();
    const page = await browser.newPage();

    await page.setRequestInterception(true);
    page.on("request", (req) => {
      const resourceType = req.resourceType();
      if (["image", "stylesheet", "font"].includes(resourceType)) {
        req.abort();
      } else {
        req.continue();
      }
    });

    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 0 });
    await page.waitForSelector("table.tztable");

    let schedule = await page.evaluate(() => {
      let tableIndex = 1;
      const today = new Date().getDay();
      switch (today) {
        case 0:
          tableIndex = 2;
          break;
        case 6:
          tableIndex = 1;
          break;
      }
      const table = document.querySelectorAll("table.tztable")[tableIndex];
      if (!table) {
        return { result: [], error: null };
      }

      const rows = Array.from(
        table.querySelector("tbody").querySelectorAll("tr")
      );
      const stations = Array.from(table.querySelectorAll("th"));

      let result = stations.map((station) => ({
        station: station.textContent.trim(),
        departures: [],
      }));

      let time = new Date();
      for (const row of rows) {
        const cells = Array.from(row.querySelectorAll("td"));
        for (let index = 0; index < cells.length; index++) {
          const cell = cells[index];

          const timeString = cell.textContent.trim().slice(0, 5);
          let [hours, minutes] = timeString.split(":").map(Number);
          time.setHours(hours, minutes);

          result[index].departures.push(time.getTime());
        }
      }
      return { result: result, error: null };
    });

    await page.close();
    console.log(`Serving fetched schedule for line ${lineNumber}`);
    return schedule;
  };

  /**
   * Fetch basic details (number, url and type) for all bus lines
   * @returns {Promise<{
   *   result: LinesResult;
   *   error: null;
   * } | {
   *   result: null;
   *   error: HttpError;
   * }>} A promise that resolves to an object containing all bus lines or an error
   */
  static fetchAll = async () => {
    if (Store.data?.lines && Object.keys(Store.data.lines).length > 0) {
      console.log("Serving cached lines");
      return { result: Store.data.lines, error: null };
    }

    const responses = await Promise.all(
      this.lineTypes.map((lineType) => this.fetchAllByType(lineType))
    );
    /**
     * @type {LinesResult}
     */
    let result = [];
    for (const response of responses) {
      if (response.error) {
        return { result: null, error: error };
      }
      result = Object.fromEntries([
        ...Object.entries(result),
        ...Object.entries(response.result),
      ]);
    }

    console.log("Serving fetched lines");
    return { result: result, error: null };
  };

  /**
   * Fetch basic details (number, url and type) for bus lines of a specific type
   * @param {LineType} lineType
   * @returns {Promise<{
   *   result: LinesResult;
   *   error: null;
   * } | {
   *   result: null;
   *   error: HttpError;
   * }>} A promise that resolves to an object containing the requested bus lines or an error
   */
  static fetchAllByType = async (lineType) => {
    if (!this.lineTypes.includes(lineType.toLowerCase())) {
      return {
        result: null,
        error: { status: 400, message: `${lineType} is an invalid line type` },
      };
    }
    if (Store.data?.lines && Object.keys(Store.data.lines).length > 0) {
      console.log(`Serving cached ${lineType} lines`);
      return {
        result: Object.fromEntries(
          Object.entries(Store.data.lines).filter(
            ([_, line]) => line.type === lineType
          )
        ),
        error: null,
      };
    }
    const url = this.typeUrls[lineType];

    const browser = await this.getBrowserInstance();
    const page = await browser.newPage();

    await page.setRequestInterception(true);
    page.on("request", (req) => {
      const resourceType = req.resourceType();
      if (["image", "stylesheet", "font"].includes(resourceType)) {
        req.abort();
      } else {
        req.continue();
      }
    });

    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 0 });
    await page.waitForSelector("div.tzPortfolio");

    let lines = await page.evaluate((lineType) => {
      let result = {};
      const anchors = document.querySelectorAll("div.tzPortfolio a");

      for (const anchor of anchors) {
        const [text, number] = anchor.textContent.trim().split(" ");
        if (text === "Linia") {
          result[number] = {
            url: anchor.href,
            type: lineType,
          };
        }
      }
      return result;
    }, lineType);

    await page.close();
    console.log(`Serving fetched ${lineType} lines`);
    return { result: lines, error: null };
  };
}
