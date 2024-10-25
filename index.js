import puppeteer from "puppeteer";

async function getLineUrl(lineIdx) {
  let url = "https://ctpcj.ro/index.php/ro/orare-linii/";
  switch (true) {
    case lineIdx[0] === "M":
      url += "linii-metropolitane/";
      break;
    case lineIdx.at(-1) === "N":
      url += "transport-noapte/";
      break;
    case lineIdx.at(-1) === "E":
      url += "linie-expres/";
      break;
    case lineIdx.slice(0, 2) === "99":
      url += "linii-supermarket/";
      break;
    default:
      url += "linii-urbane/";
      break;
  }
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  await page.goto(url, { waitUntil: "networkidle2" });
  await page.waitForSelector("div.tzPortfolio");

  let lineUrl = await page.evaluate((lineIdx) => {
    const anchors = document.querySelectorAll("div.tzPortfolio a");
    for (let anchor of anchors) {
      if (anchor.textContent.includes(" " + lineIdx)) {
        return { result: anchor.href, error: null };
      }
    }
    return { result: null, error: "404 Not Found" };
  }, lineIdx);

  await browser.close();
  return lineUrl;
}

async function getLineSchedule(lineIdx) {
  let { result: url, error } = await getLineUrl(lineIdx);
  if (error) {
    return { result: null, error: error };
  }
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  await page.goto(url, { waitUntil: "networkidle2" });
  await page.waitForSelector("table.tztable");

  let schedule = await page.evaluate(() => {
    const tables = document.querySelectorAll("table.tztable");
    let currentTable;

    const today = new Date().getDay();
    switch (today) {
      case 7:
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

    rows.forEach((row) => {
      const cells = Array.from(row.querySelectorAll("td"));
      cells.forEach((cell, index) => {
        const timeString = cell.textContent.trim().slice(0, 5);

        let [hours, minutes] = timeString.split(":").map(Number);

        let time = new Date();
        time.setHours(hours, minutes);

        result[index].departures.push(time.toTimeString());
      });
    });
    return { result: result, error: null };
  });

  await page.close();
  await browser.close();
  return schedule;
}

const { result: schedule, error } = await getLineSchedule("35");
if (error) {
  console.error(`Error: ${error}`);
} else {
  console.log(schedule);
}
