import puppeteer from "puppeteer";

const browser = await puppeteer.launch({ headless: false });
const page = await browser.newPage();

await page.goto(
  "https://ctpcj.ro/index.php/ro/orare-linii/linii-urbane/linia-35",
  { waitUntil: "networkidle2" }
);

await page.setViewport({ width: 1024, height: 1024 });

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

  let result = [
    { station: stations[0].textContent.trim(), departures: [] },
    { station: stations[1].textContent.trim(), departures: [] },
  ];

  rows.map((row) => {
    const cells = Array.from(row.querySelectorAll("td"));
    let departures = cells.map((cell) => {
      const timeString = cell.textContent.trim();

      let hours = Number(timeString.slice(0, 2));
      let minutes = Number(timeString.slice(3, 5));

      let time = new Date();
      time.setHours(hours, minutes, 0, 0);

      return time;
    });
    result[0].departures.push(departures[0]);
    result[1].departures.push(departures[1]);
  });
  return result;
});

console.log(schedule);

await browser.close();
