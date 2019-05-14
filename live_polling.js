const puppeteer = require('puppeteer');
const {client} = require('./db');
const squel = require("squel");
const moment = require('moment');
const sdk = require('matrix-js-sdk');

const roomId = '!vsjFNPcXOSUNCOOLgQ:chat.alphien.com';
let chatClient = null;

let browser;

async function setUpClient() {
  chatClient = sdk.createClient({
    baseUrl: "https://matrix.alphien.com/",
    accessToken: "MDAxZWxvY2F0aW9uIGNoYXQuYWxwaGllbi5jb20KMDAxM2lkZW50aWZpZXIga2V5CjAwMTBjaWQgZ2VuID0gMQowMDJiY2lkIHVzZXJfaWQgPSBAZGVlcGFuOmNoYXQuYWxwaGllbi5jb20KMDAxNmNpZCB0eXBlID0gYWNjZXNzCjAwMjFjaWQgbm9uY2UgPSBDWWtQUVZeN2UwYyN0KmNLCjAwMmZzaWduYXR1cmUgUcZifuhlibDxX5Z3ErDDzly-w6VBf5BSE2KCFoTkZfwK",
    userId: "@deepan:chat.alphien.com"
  });
  await chatClient.startClient();
}

async function sendMessage(message, type='m.text') {
  var content = {
    "body": message,
    "msgtype": type
  };
  return chatClient.sendEvent(roomId, "m.room.message", content, "")
}

let POLL_INTERVAL = 30000;

let CONF = {
  reuters: {
    name: 'Reuters - Commodities',
    url: "https://www.reuters.com/finance/commodities",
    selector: ".featured-article a",
    title: '.featured-article .story-title',
    last_article: null
  },
  mining_copper: {
    name: 'Mining.com - Copper',
    url: 'http://www.mining.com/tag/copper/',
    selector: '.archive-post a',
    title: '.archive-post .post-headline',
    last_article: null
  },
  mining_iron: {
    name: 'Mining.com - Iron',
    url: 'http://www.mining.com/tag/iron-ore/',
    selector: '.archive-post a',
    title: '.archive-post .post-headline',
    last_article: null
  },
  mining_nickel: {
    name: 'Mining.com - Nickel',
    url: 'http://www.mining.com/tag/nickel/',
    selector: '.archive-post a',
    title: '.archive-post .post-headline',
    last_article: null
  },
  mining_general: {
    name: 'Mining.com - General',
    url: 'http://www.mining.com',
    selector: '.kesselPost a',
    title: '.kesselPost .post-headline',
    last_article: null
  },
  google_news_commodities: {
    name: "Google News - Commodities",
    url: 'https://news.google.com/search?for=commodities&hl=en-SG&gl=SG&ceid=SG:en',
    selector: "article a",
    title: "article h4",
    last_article: null
  },
  google_news_copper: {
    name: "Google News - Copper",
    url: 'https://news.google.com/search?for=copper&hl=en-SG&gl=SG&ceid=SG:en',
    selector: "article a",
    title: "article h4",
    last_article: null
  }
};

async function checkAlreadyExists(url) {
  let query_str = `select exists(select id from news where original_url='${url}');`
  return new Promise((resolve, reject) => {
    return client.query(query_str, (err, res) => {
      return resolve(res.rows[0].exists)
    })
  })
}

async function save_article(tab, url, title, conf) {
  const response = await tab.goto(url, {waitUntil: 'networkidle2'});
  let final_page_url = response.url();

  let already_exists = await checkAlreadyExists(final_page_url)
  if (already_exists) {
    console.log('Already exists, return early', final_page_url); 
    return 
  }
  
  let full_html = await tab.content();

  let production = process.env.NODE_ENV == 'production';
  production = true;
  if (production) {
    await sendMessage(`${new Date().toString()}: ${conf.name}: ${title} ${final_page_url}`);
  }

  let query_str = squel.insert({replaceSingleQuotes: true})
      .into('news')
      .setFields({
        original_url: final_page_url,
        full_html: full_html,
        source: conf.name,
        article_timestamp: moment.utc().format()
      })
      .toString();
  query_str += ' ON CONFLICT (original_url) DO NOTHING';
  return new Promise((resolve, reject) => {
    return client.query(query_str, (err, res) => {
      if (err) reject(err);
      else resolve(res)
    });
  });

}



async function checkPage(tab, conf) {
  tab.setExtraHTTPHeaders({
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/39.0.2171.95 Safari/537.36'
  });
  try {
    await tab.goto(conf.url, {waitUntil: 'networkidle2'});

    let [latest_article, title] = await tab.evaluate(function (sel, title_sel) {
      let node = document.querySelector(sel);
      let titleNode = document.querySelector(title_sel);
      let link = node ? node.href : "Empty";
      let title = titleNode ? titleNode.innerText : "No Title";
      return [link, title]
    }, conf.selector, conf.title);

    if (latest_article == 'Empty') {
      let html = await tab.evaluate(function (sel) {
        return document.documentElement.innerHTML
      });
      console.error('ERROR1', conf.name, html);
    }

    else if (conf.last_article  === null) {
      console.log("First setup");
      conf.last_article = latest_article
    }

    else if (conf.last_article !== latest_article) {
      console.log('ARTICLE CHANGED', latest_article, conf.name);
      await save_article(tab, latest_article, title, conf);
      conf.last_article = latest_article;
    }
    return latest_article;
  } catch (E) {
    console.error('ERROR2', E, conf.name);
  } finally {
    setTimeout(checkPage.bind(this, tab, conf), POLL_INTERVAL);
  }
}

async function run() {
  await setUpClient();
  let headless = process.env.NODE_ENV == 'production';
  if (headless) {
    console.log('Starting in Production'); 
  } else {
    console.log('Starting in Development');
  }
  browser = await puppeteer.launch({
    headless: headless
  });

  for (site in CONF) {
    let tab = await browser.newPage();
    checkPage(tab, CONF[site]);
  }


}

//async function test () {
//  await  setUpClient();
//  await sendMessage('<a href="https://google.com">Waht waht </a>', 'm.html');
//}
//test();

run();

//async function test() {
//  let res = await checkAlreadyExists('http://www.mining.com/web/what-americans-actually-think-about-energy-and-the-climate/');
//  let res2 = await checkAlreadyExists('asdfa');
//  console.log(res, typeof res);
//  console.log(res2, typeof res);
//}
//
//test();



