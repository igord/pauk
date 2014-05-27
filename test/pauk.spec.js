var chai = require('chai');
chai.use(require('sinon-chai'));
global.expect = chai.expect;
global.should = chai.should();
global.assert = chai.assert;
global.sinon = require('sinon');

var Pauk = require('../index');

describe('class Pauk', function () {
    var pauk = new Pauk();

    it('is instantiable', function () {
        expect(pauk).to.be.an.instanceof(Pauk);
    });
    it ('has expected public properties', function() {
        expect(pauk).to.have.a.property('config');
        expect(pauk).to.have.a.property('cache');
	expect(pauk.crawl).to.be.a('function');
	expect(pauk.onFinish).to.be.a('function');
    });
    describe('argument', function () {
        it('is object merged to config', function () {
            var args = {foo: 'woof'},
		pauk = new Pauk(args);
            expect(pauk.config).to.have.a.property('foo', args.foo);
        });
    });
    describe('parseUri method', function () {
	var parsed;
        it('exists', function () {
	    expect(pauk.parseUri).to.be.a('function');
	});
	it("throws error if called first time with relative uri", function() {
	    try {
		parsed = pauk.parseUri('some/path');
	    } catch (e) {
		should.not.exist(parsed);
	    }
	});
	it("sets host property of the instance on first valid call", function() {
	    pauk.parseUri('http://www.runbanner.com');
	    expect(pauk.host).to.be.eql('runbanner.com');
	});
	it("properly detects external domain", function() {
	    parsed = pauk.parseUri('http://www.google.com');
	    should.exist(parsed.external);
	});
	it("removes www from the key", function() {
	    parsed = pauk.parseUri('http://www.runbanner.com/some/path');
	    expect(parsed.host).to.be.eql('runbanner.com');
	});
	it("removes search query from the key", function() {
	    parsed = pauk.parseUri('http://www.runbanner.com/some/path?p=234&hello=world');
	    expect(parsed.key).to.be.eql('http://runbanner.com/some/path');
	});
	it("protocol argument applied to relative url", function() {
	    parsed = pauk.parseUri('some/path?p=234&hello=world', 'ftp:');
	    expect(parsed.protocol).to.be.eql('ftp:');
	});
	
    });
    describe("crawl method", function() {
        var parse, get, uri;
	before(function () {
	    parse = sinon.spy(pauk, 'parseUri');
	    get = sinon.stub(pauk, 'getUrl');
	});

	it("is calling parseUri and getUrl", function() {
	    uri = 'test';
	    pauk.crawl(uri);
	    parse.should.have.been.calledWith(uri);
	    get.should.have.been.calledWith(parse.returnValues[0].key);
	});
	it("sets error on wrong uri", function() {
	    uri = 'htpp://test';
	    pauk.crawl(uri);
	    should.exist(pauk.cache[uri].error);
	});
	it("is calling getUrl only if uri is not cached", function() {
	    uri = 'http://runbanner.com/really/new/path';
	    pauk.crawl(uri);
	    get.should.have.been.calledWith(uri);
	    get.reset();
	    uri = 'http://runbanner.com/really/new/path';
	    pauk.crawl(uri);
	    get.should.have.not.been.calledWith(uri);
	});
	it("argument 'parent' is added to parents array", function() {
	    uri = 'http://runbanner.com/test';
	    pauk.crawl(uri, 'test');
	    expect(pauk.cache[uri].parents).to.contain('test');
	    //should.exist(pauk.cache[uri].parents);
	});
	after(function() {
	    parse.restore();
	    get.restore();
	});
	
    });	
    describe("onResponse method", function() {
	var parser, key = 'test';
	before(function() {
	    pauk.cache = {};
	    parser = sinon.stub(pauk, 'parser');
	});
        beforeEach(function() {
	    pauk.cache[key] = {};
	});
	it("sets error on request error", function() {
	    pauk.onResponse(new Error("some error"), key);
	    should.exist(pauk.cache[key].error);
	});
	it("sets error when status code not 200", function() {
	    pauk.onResponse(null, key, 401);
	    should.exist(pauk.cache[key].error);
	});
	it("prepares cache on proper response", function() {
	    pauk.onResponse(null, key, 200, '');
	    expect(pauk.cache[key]).to.have.a.property('assets');
	    expect(pauk.cache[key].assets).to.have.a.property('images');
	    expect(pauk.cache[key].assets).to.have.a.property('scripts');
	    expect(pauk.cache[key].assets).to.have.a.property('css');
	    expect(pauk.cache[key].assets).to.have.a.property('other');
	    expect(pauk.cache[key]).to.have.a.property('links');
	    expect(pauk.cache[key]).to.have.a.property('external');
	    parser.should.have.callCount(1);
	});
	after(function() {
	    parser.restore();
	});
    });	
    describe("parser", function() {
        var key = 'test', s;
	before(function() {
	    pauk.cache = {};
	    parser = sinon.spy(pauk, 'parser');
	});
        beforeEach(function() {
	    pauk.cache[key] = {
		assets: {
		    images: [],
		    scripts: [],
		    css: [],
		    other: []
		},
		links: [],
		external: []
	    };
	});
	it("img tag", function() {
	    s = '<img src="test.png" />';
	    pauk.parser(s, key);
	    expect(pauk.cache[key].assets.images).to.contain('test.png');
	});
	it("script tag", function() {
	    s = '<script src="test.js" />';
	    pauk.parser(s, key);
	    expect(pauk.cache[key].assets.scripts).to.contain('test.js');
	});
	it("css tag", function() {
	    s = '<link href="test.css" />';
	    pauk.parser(s, key);
	    expect(pauk.cache[key].assets.css).to.contain('test.css');
	});
	it("mailto link", function() {
	    s = '<a href="mailto:info@runbanner.com" />';
	    pauk.parser(s, key);
	    expect(pauk.cache[key].assets.other).to.contain('mailto:info@runbanner.com');
	});
	it("external link", function() {
	    s = '<a href="http://google.com/" />';
	    pauk.parser(s, key);
	    expect(pauk.cache[key].external).to.contain('http://google.com/');
	});
	it("relative link", function() {
	    s = '<a href="http://www.runbanner.com/" />';
	    pauk.parser(s, key);
	    s = '<a href="hello/path" />';
	    pauk.parser(s, key);
	    expect(pauk.cache[key].links).to.contain('http://runbanner.com/hello/path');
	});
	
    });	
    
    
});

