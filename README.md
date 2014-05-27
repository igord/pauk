pauk
=========

Basic Node.js web crawler.

## Example:

```js
var pauk = new Pauk({maxRequests: 10});
pauk.onFinish = function(cache) {
    cache.forEach(function(v, uri) {
        if (v.error) console.log("Error:\n" + v.error);
	    else console.log("Links:\n" + v.links.join("\n"), "\nCrawled Parents:\n" + v.parents.join("\n") + "\n");
    });
};
pauk.crawl('http://example.com');
```
## API
### new Pauk(config)
Constructor.
Configuration defaults:
```js
www: true, // if true, www.example.com will resolve to example.com
maxRequests: 5, // maximum number of total requests
ignoreQuery: true // if true, query part of the URI will be ignored
```
Object passed to the constructor will be merged to default configuration object.

Example:
```js
var pauk = new Pauk({maxRequests: 55});
```
### crawl(uri, parent)
Main method that will crawl the webpage.
- uri - URI to be crawled
- parent - URI of the page that contains link to uri

Example:
```js
var pauk = new Pauk();
pauk.crawl('http://example.com');
```
### onFinish
Called when crawling is finished. Parameter passed to this function is object containing the crawling data. Keys of this object are normalized URIs and values are objects containing:
```js
{
    error: 'string', // (optional) in case of an error
    assets: {
        images: [], // values of src attributes of 'img' tags
        scripts: [], // values of src attributes of 'script' tags
        css: [], // values of href attributes of 'link' tags
        other: [] // values of href attributes of 'a' tags that are not URIs
    },
    links: [], // values of href attributes of 'a' tags (relative are converted to absolute)
    external: [] // values of href attributes of 'a' tags that are external links
}
```

Example:
```js
var pauk = new Pauk();
pauk.onFinish = function(cache) {
    cache.forEach(function(v, uri) {
        if (v.error) console.log(uri + "\n" + v.error);
	    else console.log(uri + ": OK");
    });
}
pauk.crawl('http://example.com');
```
