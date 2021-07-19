const fs = require("fs");
const assert = require("assert");
const yaml = require("js-yaml");
const playwright = require('playwright');

const yamlFile = "full.yaml";

(async () => {
  const browser = await playwright.firefox.launch({headless:true, slowMo:0});
  const data_master = {};
  urls = Object.entries(loadYAML(yamlFile));
  try {
    await Promise.all(urls.map(async name_url  => {
      const page = await browser.newPage();
      const [name, url] = name_url;
      const data = [];
      await page.goto(url);
      await page.waitForSelector(".detail-title");
      const totalListing = + await page.evaluate(() => document.querySelector("div#lblResultMessage > font").textContent);
      console.log(`${name} has ${totalListing} listings`);
      await scrollMenu(page);
      parseList = await page.$$("li.detail-item");
      assert.strictEqual(parseList.length , totalListing, `${name} either failed to scroll or parse fully`);
      await parseDetail(page, parseList, data);
      data_master[name] = data;
      await page.close()
    }))
  } catch(e) {
    throw e
  } finally {
    await browser.close();
  }
  const finishTime = new Date();
  const pathOutput = `./output/crawlMap/${+finishTime}.json`
  writeToJSON(pathOutput, data_master);
  console.log(`Finished writing to ${pathOutput} on ${finishTime}`);
})();

function loadYAML (filePath) {
  let content = fs.readFileSync(filePath, encoding="utf-8");
  content = yaml.load(content);
  return content
}

async function scrollMenu (page) {
  let previousHeight;
  const scrollElement = 'document.getElementsByClassName("item-view")[0]';
  while (true) {
    try {
      previousHeight = await page.evaluate(`${scrollElement}.scrollHeight`);
      await page.evaluate(`${scrollElement}.scrollTo(0, ${scrollElement}.scrollHeight)`);
      await page.waitForFunction(`${scrollElement}.scrollHeight > ${previousHeight}`, 69 , {timeout:1000});
    } catch (e) {
      if (e instanceof playwright.errors.TimeoutError) {
        break;
      } else {
        throw(e);
      }
    }
  }
}

function writeToJSON( file, data) {
  fs.writeFileSync(file, JSON.stringify(data))
}

async function parseDetail (page, parseList, targetData) {
  for (const item of parseList) {
    await item.scrollIntoViewIfNeeded();
    await item.click();
    await page.waitForSelector(".infowindow-product-detail");
    infoCard = await page.evaluate(() => {
      const infoCard = {};
      const title = document.querySelector(".infowindow-product-title").textContent.trim();
      infoCard["Title:"] = title;
      const details = document.querySelectorAll(".infowindow-product-detail > strong");
      for (const detail of details) {
        const key = detail.textContent.trim();
        const value = detail.nextSibling.textContent.trim();
        infoCard[key] = value
      }
      const href = document.querySelector(".infowindow-product-bottom > a[target]").href;
      infoCard["href:"] = href;
      return infoCard
    });
    targetData.push(infoCard);
  }
}
