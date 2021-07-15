# BatDongSan Map Crawler
Just a simple script to crawl and extract information from BatDongSan website
## Usage Guide
1. Install nodejs. In my case it is just `conda install node`
2. Install playwright. `npm i playwright` then `playwright install`
3. Run either script with `node crawlLink.js` or `node crawlMap.js`
4. Check `output` folder for results

[Demo for crawlMap.js](https://www.youtube.com/watch?v=0Ab3y0GQn4w)

## Warning
- `crawlLink.js` is greedy. It will catalogue the list of all available pages, then proceed to **crawl every single one simultaneously**. My computer crashed at 51<sup>st</sup> page. Try to limit to 10 pages maximum. Rate limit crawling will be implemented later.
- These script work on my machine.