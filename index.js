#!/usr/bin/env node

var request = require('request'),
  FeedParser = require('feedparser');

var allSources = {
  'SE': [ 
    { name: 'SvD', url: 'http://www.svd.se/?service=rss'},
    { name: 'DN', url: 'http://www.dn.se/rss/senaste-nytt/'},
    { name: 'SVT', url: 'http://www.svt.se/nyheter/rss.xml'} // This feed contains local news, sometimes even news in finnish...
  ],
  'US': [
    { name: 'NYT', url: 'http://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml'},
    { name: 'CNN', url: 'http://rss.cnn.com/rss/edition.rss'}
  ],
  'GB': [
    { name: 'BBC', url: 'http://feeds.bbci.co.uk/news/rss.xml'},
    { name: 'Reuters', url: 'http://mf.feeds.reuters.com/reuters/UKTopNews'}
  ]
};

var maxArticles, countryCode, sources, articles = [];

var parseArguments = function() {
  if (process.argv.length > 2) {
    maxArticles = parseInt(process.argv[2]);
    if (isNaN(maxArticles)) { 
      console.error('Usage: latest [maxArticles] [countryCode]');
      console.error('Example: latest 10 SE');
      process.exit(1);  
    }
  }
  else 
    maxArticles = 20;

  if (process.argv.length > 3) {
    countryCode = process.argv[3].toUpperCase();
    if (!allSources.hasOwnProperty(countryCode)) {
      console.error('Error: Country code ' + countryCode + ' not supported.');
      console.error('Supported country codes: ' + 
        Object.getOwnPropertyNames(allSources).join(', '));
      process.exit(1);
    }
  }
  else
    countryCode = 'SE';  
};

var grabNews = function(callback) {
  sources = allSources[countryCode];
  var count = 0;
  sources.forEach(function(source) {
    request(source.url)
      .pipe(new FeedParser())
      .on('error', function(error) {
        console.error('Error: ' + error);  
      })
      .on('readable', function() {
        var stream = this, item;
        while (item = stream.read()) {
          if (item.title && item.summary) { 
            item.source = source.name;
            articles.push(item);
          };
        };
      })
      .on('end', function() {
        if (++count == sources.length)
          callback();
      });
  });
};

var printArticles = function() {
  articles.sort(compareArticles);
  articles.splice(maxArticles, articles.length);
  for (var i = 0; i < articles.length; i++) {
    console.log(cleanText(articles[i].title));
    console.log(cleanText(articles[i].summary));
    console.log('(' + articles[i].source + ')');
    console.log();
  };
};

var cleanText = function(text) {
  var replacementChars = {
    'nbsp': ' ',
    'quot': '”',
    'amp': '&'  
  };
  text = text.replace(/&(npsp|quot|amp);/g, function(_, charEntity) {
    return replacementChars[charEntity];
  });
  return text.replace(/(<([^>]+)>)/ig, '');  
};

var compareArticles = function(first, second) {
  if (first.pubDate > second.pubDate)
    return -1;
  else if (first.pubDate < second.pubDate)
    return 1;
  return 0;  
};

parseArguments();
grabNews(printArticles);
