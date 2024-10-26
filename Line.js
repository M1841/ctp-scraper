import puppeteer, { Browser } from "puppeteer";

export default class Line {
  static browser = null;
  /**
   *
   * @returns {Promise<Browser>}
   */
  static getBrowserInstance = async () => {
    if (!this.browser) {
      this.browser = await puppeteer.launch();
    }
    return this.browser;
  };

  /**
   * @param {string} lineNumber
   * @returns {Promise<{ result: any; error: null; } | { result: null; error: { status: number; message: string; }; }>}
   */
  static fetchUrl = async (lineNumber) => {
    let url = "https://ctpcj.ro/index.php/ro/orare-linii/";
    switch (true) {
      case lineNumber[0] === "M":
        url += "linii-metropolitane/";
        break;
      case lineNumber.at(-1) === "N":
        url += "transport-noapte/";
        break;
      case lineNumber.at(-1) === "E":
        url += "linie-expres/";
        break;
      case lineNumber.slice(0, 2) === "99":
        url += "linii-supermarket/";
        break;
      default:
        url += "linii-urbane/";
        break;
    }

    const browser = await this.getBrowserInstance();
    const page = await browser.newPage();

    await page.setRequestInterception(true);
    page.on("request", (req) => {
      const resourceType = req.resourceType();
      if (["image", "sylesheet", "font"].includes(resourceType)) {
        req.abort();
      } else {
        req.continue();
      }
    });

    await page.goto(url, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("div.tzPortfolio");

    let lineUrl = await page.evaluate((lineNumber) => {
      const anchors = document.querySelectorAll("div.tzPortfolio a");

      for (let anchor of anchors) {
        if (anchor.textContent.includes(" " + lineNumber)) {
          return { result: anchor.href, error: null };
        }
      }
      return {
        result: null,
        error: { status: 404, message: `Line ${lineNumber} not found` },
      };
    }, lineNumber);

    await page.close();
    return lineUrl;
  };

  /**
   * @param {string} lineNumber
   * @returns {Promise<{ result: { station: string; departures: Date[]; }[]; error: null; } | { result: null; error: { status: number; message: string; }; }>}
   */
  static fetchSchedule = async (lineNumber) => {
    let { result: url, error } = await this.fetchUrl(lineNumber);
    if (error) {
      return { result: null, error: error };
    }
    const browser = await this.getBrowserInstance();
    const page = await browser.newPage();

    await page.setRequestInterception(true);
    page.on("request", (req) => {
      const resourceType = req.resourceType();
      if (["image", "sylesheet", "font"].includes(resourceType)) {
        req.abort();
      } else {
        req.continue();
      }
    });

    await page.goto(url, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("table.tztable");

    let schedule = await page.evaluate(() => {
      const tables = document.querySelectorAll("table.tztable");
      let currentTable;

      const today = new Date().getDay();
      switch (today) {
        case 0:
          currentTable = tables[2];
          break;
        case 6:
          currentTable = tables[1];
          break;
        default:
          currentTable = tables[0];
      }

      const rows = Array.from(
        currentTable.querySelector("tbody").querySelectorAll("tr")
      );
      const stations = Array.from(currentTable.querySelectorAll("th"));

      let result = stations.map((station) => ({
        station: station.textContent.trim(),
        departures: [],
      }));

      let time = new Date();
      for (let row of rows) {
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
}
