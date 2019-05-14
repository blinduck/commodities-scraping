let {MiningCopper, FastMarkets} = require('./article');


let mining_general = {
  name: "Mining.com - General",
  page_url: function (page_no) {
    return `http://www.mining.com/page/${page_no}`;
  },
  link_selector: '.kesselPost h3 a',
  last_page: 2200,

}

let mining_copper = {
    name: "Mining.com - Copper",
    page_url: function (page_no) {
      return `http://www.mining.com/tag/copper/page/${page_no}`;
    },
    link_selector: '.archive-post h3 a',
    last_page: 314,
}

let mining_nickel = {
  name: "Mining.com - Nickel",
  page_url: function (page_no) {
    return `http://www.mining.com/tag/nickel/page/${page_no}`;
  },
  link_selector: '.archive-post h3 a',
  last_page: 60,
}
let mining_zinc = {
  name: "Mining.com - Zinc",
  page_url: function (page_no) {
    return `http://www.mining.com/tag/zinc/page/${page_no}`;
  },
  link_selector: '.archive-post h3 a',
  last_page: 65,
}

let fastmarkets = {
  name: 'fastmarkets',
  page_url: function(page_no) {
    return `https://www.fastmarkets.com/commodities/base-metals/news/${page_no}`;
  },
  link_selector: '.mediaItem-body a',
  last_page: 100
}


module.exports = {
  mining_general: mining_general,
  mining_copper: mining_copper,
  mining_nickel: mining_nickel,
  mining_zinc: mining_zinc,
  fastmarkets: fastmarkets
}
;