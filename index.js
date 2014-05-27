var
    url = require('url'),
    request = require('request'),
    _ = require('lodash'),
    htmlparser = require('htmlparser');


function Pauk(cnf) {
    this.config = _.extend({
	// if true, www.example.com will resolve to example.com
	www: true,
	// maximum number of total requests
	maxRequests: 5,
	ignoreQuery: true
    }, cnf || {});
}

module.exports = Pauk;
_.extend(Pauk.prototype, {
    // collection with crawled URIs as keys; values are objects with properties:
    // assets - object with images, css and scripts arrays, webpage static assets
    // parents - array of URIs that link to this URI
    // links - array of URIs that this URI links to
    // external - array of external links
    // protocol - protocol of this URI
    // error(optional) - message in case that URI is wrong
    cache: {},
    // total number of requests
    total: 0,
    // finished requests
    finished: 0,
    // public main method
    // uri - URI to crawl
    // parent - uri of the page that links to this uri
    crawl: function(uri, parent) {
	var pUri = this.parseUri(uri);
	if (pUri.key) {
	    if (!this.cache[pUri.key]) {
		this.cache[pUri.key] = {
		    protocol: pUri.protocol,
		    parents: []
		};
		this.getUrl(pUri.key);
	    }
	    if (parent && this.cache[pUri.key].parents.indexOf(parent) === -1) this.cache[pUri.key].parents.push(parent);
	} else {
	    this.cache[uri] = {
		error: "Wrong URI, " + uri
	    };
	    if (this.total === this.finished) this.onFinish(this.cache);
	}
    },
    // returns parsed URL object and if it is valid:
    // - adds property 'key' to be used as key for cache
    // - adds property 'external' if the host of the key is not the same as host of the first URI
    // Parameters:
    // uri - absolute or relative path
    // protocol(optional) - if uri is realtive path, use protocol, default: 'http:'
    parseUri: function(uri, protocol) {
	/* http://user:pass@host.com:8080/p/a/t/h?query=string#hash
	 *
	 * href: 'http://user:pass@host.com:8080/p/a/t/h?query=string#hash'
	 * protocol: 'http:'
	 * host: 'host.com:8080'
    	 * auth: 'user:pass'
	 * hostname: 'host.com'
	 * port: '8080'
	 * pathname: '/p/a/t/h'
	 * search: '?query=string'
	 * path: '/p/a/t/h?query=string'
	 * query: 'query=string' or {'query':'string'}
	 * hash: '#hash'
	*/
	var p = url.parse(uri);
	// relative path
	if (p.host === null) {
	    if (!this.host) throw Error("First URI must have host part");
	    if (typeof p.path !== "string") return p;

	    p = url.parse(url.resolve((protocol || "http:") + "//" + this.host, p.path));
	} else {
	    if (this.config.www) {
		var sp = p.host.split(".");
		if (sp.length === 3 && sp[0] === "www") {
		    sp.shift();
		    p.host = sp.join(".");
		}
	    }
	    // set host that we crawl or throw error if URI host is different
	    if (!this.host) this.host = p.host;
	    if (typeof p.path !== "string") return p;
	}	
	if (this.host !== p.host) p.external = true;
	p.key = this.config.ignoreQuery? url.resolve(p.protocol + "//" + this.host, p.pathname) : p.href;

	return p;
    },
    getUrl: function(key) {
	var t = this;
	this.total++;
	request(key, function(err, response, body) {
	    t.finished++;
	    t.onResponse(err, key, response.statusCode, body);
	});
    },
    onResponse: function(err, key, statusCode, body) {
	var c = this.cache[key];
	if (err) {
	    c.error = "Request failed, URI: " + key + ", " + err;
	} else if (statusCode === 200) {
	    _.extend(c, {
		assets: {
		    images: [],
		    scripts: [],
		    css: [],
		    other: []
		},
		links: [],
		external: []
	    });
	    this.parser(body, key);
	    for (var i = 0; i < c.links.length; i++) {
		// crawl either when maxRequests number is not reached or when page is already cached, to add parent link
		if (this.total < this.config.maxRequests || this.cache[c.links[i]]) this.crawl(c.links[i], key);
	    }
	} else {
	    c.error = "Status Code " + statusCode;
	}
	if (this.total === this.finished) this.onFinish(this.cache);
    },
    parser: function(s, key) {
	var t = this,
	    handler = new htmlparser.DefaultHandler(function(err, dom) {
		t.onParser(err, key, dom);
	    }, {verbose: false, ignoreWhitespace: true}),
	    parser = new htmlparser.Parser(handler);
	parser.parseComplete(s);	
    },
    onParser: function(err, key, dom) {
	var o = this.cache[key];
	if (err) {
	    o.error = "htmlparser failed, URI: " + key + ", " + err;
	} else {
	    this.parseDom(dom, o);
	}
    },
    // main recursive method for parsing dom object returned by htmlparser
    parseDom: function(dom, o) {
	_.each(dom, function(v) {
	    if (v.attribs) {
		if (v.attribs.src) {
		    if (v.type === 'tag' && v.name === 'img') o.assets.images.push(v.attribs.src);
		    else if (v.type === 'script') o.assets.scripts.push(v.attribs.src);
		} else if (v.attribs.href) {
		    if (v.name === 'a') {
			var p = this.parseUri(v.attribs.href, o.protocol);
			    
			if (p.key) {
			    if (p.external && o.external.indexOf(p.href) === -1) o.external.push(p.href);
			    else if (o.links.indexOf(p.key) === -1) o.links.push(p.key);
			} else if (o.assets.other.indexOf(p.href) === -1) {
			    o.assets.other.push(p.href);
			}

		    } else if (v.name === "link") o.assets.css.push(v.attribs.href);
		}
	    }
	    if (v.children) this.parseDom(v.children, o);
	}, this);
    },
    // public, called when crawling is finished
    onFinish: function(cache) {
    }
});


