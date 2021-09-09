const fs = require("fs");
const assert = require("assert");
const yaml = require("js-yaml");
const playwright = require('playwright');

const yamlFile = "linksToCrawl.yaml"

function writeToJSON (file, data) {
  fs.writeFileSync(file, JSON.stringify(data))
};

function loadYAML (filePath) {
  let content = fs.readFileSync(filePath, encoding="utf-8");
  content = yaml.load(content);
  return content
};

async function fetchLinkFromPage ([link, isFirstPage]) {
  const parseHtmlFromText = (text) => {
    const parser = new DOMParser();
    return parser.parseFromString(text, 'text/html');
  };
  const simpleExtract = (listing, key) => {
    const element = listing.getElementsByClassName(key)[0]
    if (element != undefined) {
      return element.textContent.trim()
    } else {
      return null
    }
  };
  const dataPage = {}
  const page = await fetch(link).then(response => response.text()).then(text => parseHtmlFromText(text));
  if (isFirstPage) {
    const element = page.querySelector(".re__pagination-icon")
    const lastPage = element ? +element.getAttribute("pid") : 0
    const expectListings = +page.querySelector("#count-number").textContent.replace(",","")
    dataPage["lastPage"] = lastPage;
    dataPage["expectListings"] = expectListings;
  }
  const dataItem = []
  const allListings = page.getElementsByClassName("product-item");
  for (const listing of allListings) {
    const infoCard = {}
    infoCard["Title"] = simpleExtract(listing, "product-title");
    infoCard["Price"] = simpleExtract(listing, "price");
    infoCard["Area"] = simpleExtract(listing, "area");
    infoCard["PostDate"] = simpleExtract(listing, "tooltip-time");
    infoCard["Reference"] = listing.getElementsByClassName("wrap-plink")[0].href
    dataItem.push(infoCard);
  }
  dataPage["data"] = dataItem
  return dataPage
}

async function processPage (mainPage, link, pageID) {
  const linkToCrawl = pageID === 1 ? link :  `${link}/p${pageID}`;
  return await mainPage.evaluate( fetchLinkFromPage , [linkToCrawl, true]);
}

(async () => {
  const browser = await playwright.firefox.launch({headless:false, slowMo:0});
  const dataMaster = {};
  const crawlEntries = Object.entries(loadYAML(yamlFile));
  try {
    await Promise.all(crawlEntries.map(async entry  => {
      const [name, url] = entry;
      dataMaster[name] = [];
      const mainPage = await browser.newPage();
      await mainPage.goto("https://batdongsan.com.vn/");
      await mainPage.waitForSelector("body")
      // mainPage.on('console', consoleObj => console.log(consoleObj.text()));
      const firstPage = await processPage(mainPage, url, 1);
      dataMaster[name].push(...firstPage["data"]);
      const expectListings = firstPage["expectListings"];
      const expectPages = firstPage["lastPage"];
      console.log(`Found ${expectListings} listings in ${expectPages} pages for ${url}`);
      if (expectPages != 0) {
        const nextPages = Array.from(new Array(expectPages - 1), (x,i) => i + 2);
        await Promise.all(nextPages.map(async pageID => {
          const dataPage = await processPage(mainPage, url, pageID)
          dataMaster[name].push(...dataPage["data"])
        }))
      }
      const parsedListings = dataMaster[name].length
      if ( parsedListings != expectListings )
      {
        console.log(`Anomalies detected in ${url}. Actual: ${parsedListings}. Expect ${expectListings}`);
      }
    }))
  } catch(e) {
    throw e
  } finally {
    await browser.close();
  }
  const finishTime = new Date();
  const pathOutput = `./output/crawlLink/${+finishTime}.json`
  writeToJSON(pathOutput, dataMaster);
  console.log(`Finished writing to ${pathOutput} on ${finishTime}`);
})();
