const fs = require("fs");
const yaml = require("js-yaml");
const playwright = require('playwright');

const yamlFile = "showcase.yaml";

(async () => {
  const browser = await playwright.firefox.launch({headless:false, slowMo:0});
  const data_master = {};
  urls = Object.entries(loadYAML(yamlFile));
  await Promise.all(urls.map(async name_url  => {
    const page = await browser.newPage();
    const [name, url] = name_url;
    const data = [];
    await page.goto(url);
    await page.waitForSelector(".detail-title");
    await scrollMenu(page);
    parseList = await page.$$("li.detail-item");
    console.log(`${name} has ${parseList.length} items`);
    await parseDetail(page, parseList, data);
    data_master[name] = data;
  }))
  await browser.close();
  writeToJSON(`./output/${+new Date()}.json`, data_master);
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
