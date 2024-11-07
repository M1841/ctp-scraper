import puppeteer, { Browser, Page } from "puppeteer";

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
   * Block all image, stylesheet and font requests sent by a page
   * @param {Page} page The page on which to block unwanted requests
   */
  static filterResourceRequests = async (page) => {
    await page.setRequestInterception(true);
    page.on("request", (req) => {
      const resourceType = req.resourceType();
      if (["image", "stylesheet", "font"].includes(resourceType)) {
        req.abort();
      } else {
        req.continue();
      }
    });
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

    await this.filterResourceRequests(page);
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
   * @param {string} url The URL with the line's schedule
   * @returns {Promise<{
   *   result: StationDepartures[];
   *   error: null;
   * } | {
   *   result: null;
   *   error: HttpError;
   * }>} A promise that resolves to an object containing the schedule or an error
   */
  static fetchSchedule = async (url) => {
    const browser = await this.getBrowserInstance();
    const page = await browser.newPage();

    await this.filterResourceRequests(page);
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
    return schedule;
  };

  /**
   * Fetch basic details (number, url and type) for bus lines of a specific type
   * @param {LineType} lineType
   * @returns {Promise<{
   *   result: LineMap;
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
    const url = this.typeUrls[lineType];

    const browser = await this.getBrowserInstance();
    const page = await browser.newPage();

    await this.filterResourceRequests(page);
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 0 });
    await page.waitForSelector("div.tzPortfolio");

    let lines = await page.evaluate(async (lineType) => {
      /**
       * @type {LineMap}
       */
      let result = {};
      const anchors = document.querySelectorAll("div.tzPortfolio a");

      await Promise.all(
        Array.from(anchors).map(async (anchor) => {
          const [text, number] = anchor.textContent.trim().split(" ");
          if (text === "Linia") {
            result[number] = {
              url: anchor.href,
              type: lineType,
              stations: {},
            };
          }
        })
      );

      return result;
    }, lineType);

    await Promise.all(
      Object.entries(lines).map(async ([_, line]) => {
        line.stations = await this.fetchSchedule(line.url);
      })
    );

    await page.close();
    return { result: lines, error: null };
  };

  /**
   * Fetch basic details (number, url and type) for all bus lines
   * @returns {Promise<{
   *   result: LineMap;
   *   error: null;
   * } | {
   *   result: null;
   *   error: HttpError;
   * }>} A promise that resolves to an object containing all bus lines or an error
   */
  static fetchAll = async () => {
    const responses = await Promise.all(
      this.lineTypes.map((lineType) => this.fetchAllByType(lineType))
    );

    /**
     * @type {LineMap}
     */
    let result = {};
    for (const response of responses) {
      if (response.error) {
        return { result: null, error: error };
      }
      result = Object.fromEntries([
        ...Object.entries(result),
        ...Object.entries(response.result),
      ]);
    }

    return { result: result, error: null };
  };
}
