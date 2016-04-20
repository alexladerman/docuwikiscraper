var http = require("http");
var url = require("url");
var fs = require('fs');
var cheerio = require('cheerio');
var querystring = require('querystring');
var tough = require('tough-cookie');

var docuwikiurl = "http://docuwiki.net/index.php?title=Category:Name&until=z";
var mvgroupbaseurl = "http://forums.mvgroup.org";
var mvgheaders = {};

var doculistfromfile = true;
var pagefromfile = false;
var mvgframefromfile = false;
var f = [];

// var lis = [];
var startat = 500;
var maxiter = 520;

getmvgcookie(function() {
    getdoculist(function(docus) {
	console.log("getdoculist();");
	recurse(docus, startat);
    });
});

function setmvgheaders(req) {
    console.log("setmvgheaders();");
    req.setHeader("Accept", mvgheaders["Accept"]);
    req.setHeader("Accept-Encoding", mvgheaders["Accept-Encoding"]);
    req.setHeader("Accept-Language", mvgheaders["Accept-Language"]);
    req.setHeader("Cache-Control", mvgheaders["Cache-Control"]);
    req.setHeader("Connection", mvgheaders["Connection"]);
    req.setHeader("Cookie", mvgheaders["Cookie"]);
    req.setHeader("DNT", mvgheaders["DNT"]);
    req.setHeader("Host", mvgheaders["Host"]);
    req.setHeader("Cookie", mvgheaders["Cookie"]);
    req.setHeader("Referer", mvgheaders["Host"]);
    req.setHeader("User-Agent", mvgheaders["User-Agent"]);
    return req;
}

function getmvgcookie(callback) {
    console.log("getmvgcookie();");

    try {
	mvgheaders = JSON.parse(fs.readFileSync('mvgheaders.json', 'utf8'));
    } catch (e) {
	console.log("catch: " + mvgheaders);

	mvgheaders["Accept"] = "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8";
	mvgheaders["Accept-Encoding"] = "gzip,deflate,sdch";
	mvgheaders["Accept-Language"] = "en-US,en;q=0.8,es;q=0.6";
	mvgheaders["Cache-Control"] = "max-age=0";
	mvgheaders["Connection"] = "keep-alive";
	mvgheaders["DNT"] = "1";
	mvgheaders["Host"] = "forums.mvgroup.org";
	mvgheaders["Cookie"] = "mvg_ipb_stronghold=b7dd0788bc1890077bd1ff1fccfb3771; mvg_coppa=0; mvg_topicsread=a%3A8%3A%7Bi%3A25566%3Bi%3A1399478218%3Bi%3A39813%3Bi%3A1399478248%3Bi%3A53336%3Bi%3A1399478278%3Bi%3A15625%3Bi%3A1399478471%3Bi%3A52220%3Bi%3A1399478513%3Bi%3A3380%3Bi%3A1399482243%3Bi%3A46663%3Bi%3A1399482285%3Bi%3A27191%3Bi%3A1399576168%3B%7D; mvg_member_id=0; mvg_pass_hash=0; mvg_anonlogin=-1; mvg_session_id=80c8efa3f366df0fe27d62fffca5c872";
	mvgheaders["Referer"] = "http://forums.mvgroup.org/index.php?";
	mvgheaders["User-Agent"] = "Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/35.0.1916.86 Safari/537.36";
	writejson(mvgheaders, "mvgheaders.json");
    } finally {
	var post_data = querystring.stringify({
	    'act' : 'Login',
	    'CODE' : '01',
	    's' : 'd8ecb3584e8c4c297b109ce18004747c',
	    'CookieDate' : '1',
	    'UserName' : 'a*******7',
	    'PassWord' : 'S*******7',
	});

	var post_options = url.parse(mvgroupbaseurl + "/index.php");
	post_options["method"] = 'POST';
	post_options["headers"] = {
	    'Content-Length' : post_data.length
	};

	var req = http.request(post_options, function(response) {

	    mvgheaders["Cookie"] = response.headers["set-cookie"];

	    response.setEncoding('utf8');
	    response.on('data', function(chunk) {
	    });

	    response.on('end', function() {
		writejson(mvgheaders, "mvgheaders.json");
		callback();
	    });
	}).on('error', function(e) {
	    console.log("Got error: " + e.message);
	});

	req = setmvgheaders(req);
	console.log("\n" + "request.rawHeaders: " + JSON.stringify(req._headers) + "\n");
	req.write(post_data);
	req.end();

    }
}

function recurse(docus, i) {
    if (docus[i].hasOwnProperty('magnet')) {
	console.log("has magnet");
	recurse(docus, i + 1);
    } else {
	getpage(docus[i]["href"], function(pagedata) {
	    if (!empty(pagedata["mvgpageid"])) {
		getmvgframe(mvgroupbaseurl + "/maintrackfunctemp.php?releaseurl=" + pagedata["mvgpageid"], pagedata, function(pagedata, framedata) {
		    console.log(pagedata);
		    if (!empty(pagedata["generalinfo"]))
			docus[i]["generalinfo"] = pagedata["generalinfo"];
		    if (!empty(pagedata["info"]))
			docus[i]["info"] = pagedata["info"];
		    console.log(framedata);
		    if (!empty(framedata["magnet"]))
			docus[i]["magnet"] = framedata["magnet"];
		    if (!empty(framedata["imdblink"]))
			docus[i]["imdblink"] = framedata["imdblink"];
		    if (!empty(framedata["subtitles"]))
			docus[i]["subtitles"] = framedata["subtitles"];
		    if (!empty(framedata["seeds"]))
			docus[i]["seeds"] = framedata["seeds"];
		    if (!empty(framedata["peers"]))
			docus[i]["peers"] = framedata["peers"];
		    console.log("i: " + i);
		    console.log("maxiter: " + maxiter);
		    console.log("startat: " + startat);
		    if (i < maxiter) {
			recurse(docus, i + 1);
		    } else {
			var fewdocus = [];
			for (var j = startat; j < (maxiter + 1); j++)
			    fewdocus.push(docus[j]);
			writejson(fewdocus, "docusparsed.json");
		    }
		});
	    } else if (i < maxiter) {
		recurse(docus, i + 1);
	    } else {
		var fewdocus = [];
		for (var j = startat; j < (maxiter + 1); j++)
		    fewdocus.push(docus[j]);
		writejson(fewdocus, "docusparsed.json");
	    }
	});
    }
}

function writejson(json, filename) {
    fs.writeFileSync(filename, JSON.stringify(json), 'utf8', function(err) {
	if (err)
	    throw err;
	console.log('writeFile(' + filename + ');');
    });
}

function getdoculist(callback) {
    fs.readFile('docus.json', 'utf8', function(err, data) {
	if (err || data.length < 1) {
	    console.log("readFile(docus.json); failed");
	    var body = "";
	    if (doculistfromfile) {
		body = fs.readFileSync("index.html", 'utf8');
		callback(doculistparsehtml(body));
	    } else {
		http.get(docuwikiurl, function(response) {
		    console.log("Got response: " + response.statusCode);
		    response.on("data", function(data) {
			body += data;
		    });
		    response.on("end", function() {
			body = body.toString();
			fs.writeFileSync('index.html', body, function(err) {
			    if (err)
				throw err;
			    console.log('writeFile("index.html")');
			});
			callback(doculistparsehtml(body));
		    });

		}).on('error', function(e) {
		    console.log("Got error: " + e.message);
		});
	    }
	} else {
	    // console.log("readFile(docus.json);" + data);
	    callback(JSON.parse(data));
	}
    });
}

function doculistparsehtml(body) {
    $ = cheerio.load(body);

    var docus = [];
    $('table li').each(function(i, li) {
	docus[i] = {
	    "title" : $(this).find('a').attr('title'),
	    "href" : "http://docuwiki.net" + $(this).find('a').attr('href')
	};
    });

    writejson(docus, "docus.json");

    return docus;
}

function getpage(docuwikiurl, callback) {
    console.log("getpage();");
    var body = "";
    if (pagefromfile) {
	body = fs.readFileSync("docuwikipage.html", 'utf8');
	callback(pageparsehtml(body));
    } else {
	http.get(docuwikiurl, function(response) {
	    console.log("Got response: " + response.statusCode);
	    response.on("data", function(data) {
		body += data;
	    });
	    response.on("end", function() {
		body = body.toString();
		callback(pageparsehtml(body));
	    });

	}).on('error', function(e) {
	    console.log("Got error: " + e.message);
	});
    }
}

function pageparsehtml(body) {
    $ = cheerio.load(body);
    var mvglink;

    $('a').each(function(i, elem) {
	if ($(this).text().indexOf("torrent") > -1)
	    mvglink = $(this).attr('href');
    });

    var generalinfo;
    var info;

    $('.mw-headline').each(function(i, elem) {
	if ($(elem).text().indexOf("General Information") > 0 && generalinfo == undefined) {
	    generalinfo = $(elem).parent('h2').next('p').first().text().replace(/(\r\n|\n|\r)/gm, "");
	} else if ($(elem).text().indexOf("Information") > 0 && info == undefined) {
	    info = $(elem).parent('h2').next('p').first().text().toString();
	}
    });

    var mvgpageid;

    if (!empty(mvglink))
	mvgpageid = url.parse(mvglink, true).query["showtopic"];

    return {
	"mvgpageid" : mvgpageid,
	"generalinfo" : generalinfo,
	"info" : info
    };
}

function getmvgframe(mvgframeurl, pagedata, callback) {
    console.log("getmvgframe();");
    var body = "";
    if (mvgframefromfile) {
	body = fs.readFileSync("mvgframe.html", 'utf8');
	callback(pagedata, mvgframeparsehtml(body));
    } else {

	var options = url.parse(mvgframeurl);

	var req = http.request(options, function(response) {
	    console.log("Got response: " + response.statusCode);
	    response.on("data", function(data) {
		body += data;
	    });
	    response.on("end", function() {
		body = body.toString();
		callback(pagedata, mvgframeparsehtml(body));
	    });

	}).on('error', function(e) {
	    console.log("Got error: " + e.message);
	});

	req = setmvgheaders(req);
	console.log("getmvgframe: " + JSON.stringify(req._headers));
	req.end();

    }
}

function mvgframeparsehtml(body) {
    $ = cheerio.load(body);
    var magnet = $('a.magnetlink').attr('href');

    var imdblink = $('a .imdblink').first().attr('href');
    if (!empty(imdblink))
	imdblink = imdblink.split('?')[1];

    var subtitles = [];

    $('a').each(function(i, elem) {
	var link = $(elem).attr('href');
	if (link.indexOf('.srt') > 0) {
	    subtitles.push({
		"language" : $(elem).attr('title'),
		"link" : mvgroupbaseurl + link
	    });
	}
    });

    var seeds = $('#torrentlist > tbody > tr:nth-child(2) > td:nth-child(2)').text();
    var peers = $('#torrentlist > tbody > tr:nth-child(2) > td:nth-child(3)').text();

    return framedata = {
	"magnet" : magnet,
	"imdblink" : imdblink,
	"subtitles" : subtitles,
	"seeds" : seeds,
	"peers" : peers
    };
}

function empty(data) {
    if (typeof (data) == 'number' || typeof (data) == 'boolean')
	return false;
    if (typeof (data) == 'undefined' || data === null)
	return true;
    if (typeof (data.length) != 'undefined')
	return data.length == 0;
    var count = 0;
    for ( var i in data) {
	if (data.hasOwnProperty(i))
	    count++;
    }
    return count == 0;
}
