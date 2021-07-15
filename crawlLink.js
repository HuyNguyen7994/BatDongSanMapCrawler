const fs = require("fs");
const assert = require("assert");
const yaml = require("js-yaml");
const playwright = require('playwright');

const yamlFile = "crawlLink.yaml"


function writeToJSON (file, data) {
  fs.writeFileSync(file, JSON.stringify(data))
};

function loadYAML (filePath) {
  let content = fs.readFileSync(filePath, encoding="utf-8");
  content = yaml.load(content);
  return content
};

async function processPage (browser, link, pageID) {
  const page = await browser.newPage();
  const linkToCrawl = `${link}/p${pageID}`;
  const dataPage = {};
  await page.goto(linkToCrawl);
  await page.waitForSelector(".product-item")
  if (pageID == 1) {
    const lastPage = await page.evaluate(() => {
      const element = document.getElementsByClassName("re__pagination-icon")[0]
      if (element != undefined) {
        return element.getAttribute("pid")
      } else {
        return 0
      }
    })
    const expectListings = await page.evaluate(() => document.getElementById("count-number").textContent)
    dataPage["lastPage"] = +lastPage;
    dataPage["expectListings"] = + expectListings.replace(",","");
  }
  dataPage["data"] = await page.evaluate(() => {
    const allListings = document.getElementsByClassName("product-item");
    const data = [];
    const simpleExtract = (listing, key) => {
      const element = listing.getElementsByClassName(key)[0]
      if (element != undefined) {
        return element.textContent.trim()
      } else {
        return null
      }
    };
    for (const listing of allListings) {
      const infoCard = {}
      infoCard["Title"] = simpleExtract(listing, "product-title");
      infoCard["Price"] = simpleExtract(listing, "price");
      infoCard["Area"] = simpleExtract(listing, "area");
      infoCard["PostDate"] = simpleExtract(listing, "tooltip-time");
      infoCard["Reference"] = listing.getElementsByClassName("wrap-plink")[0].href
      data.push(infoCard);
    }
    return data
  })
  await page.close()
  return dataPage
}


(async () => {
  const browser = await playwright.firefox.launch({headless:true, slowMo:0});
  const dataMaster = {};
  const crawlEntries = Object.entries(loadYAML(yamlFile));
  await Promise.all(crawlEntries.map(async entry  => {
    const [name, url] = entry;
    dataMaster[name] = [];
    const firstPage = await processPage(browser, url, 1);
    dataMaster[name].push(...firstPage["data"]);
    const expectListings = firstPage["expectListings"];
    const expectPages = firstPage["lastPage"];
    console.log(`Found ${expectListings} listings in ${expectPages} pages for ${url}`);
    if (expectPages != 0) {
      const nextPages = Array.from(new Array(expectPages - 1), (x,i) => i + 2);
      await Promise.all(nextPages.map(async pageID => {
        const dataPage = await processPage(browser, url, pageID)
        dataMaster[name].push(...dataPage["data"])
      }))
    }
    const parsedListings = dataMaster[name].length
    assert.strictEqual(parsedListings, expectListings, `Errors while crawling ${url}`)
  }))
  await browser.close();
  const finishTime = new Date();
  const pathOutput = `./output/crawlLink/${+finishTime}.json`
  writeToJSON(pathOutput, dataMaster);
  console.log(`Finished writing to ${pathOutput} on ${finishTime}`);
})();
