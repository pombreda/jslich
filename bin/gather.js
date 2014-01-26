#!/usr/bin/env phantomjs
/* -*- mode: javascript -*-

  This file is part of JSlich, a JavaScript license checker.
  Copyright 2013, Kuno Woudt <kuno@frob.nl>.
  License: copyleft-next 0.3.0

*/

var page = require('webpage').create();
var system = require('system');

console.error = function () {
    require("system").stderr.write(Array.prototype.join.call(arguments, ' ') + '\n');
};

var scripts = {};

var wait = function (condition) {
    if (/^[0-9]+$/.test (condition)) {
        return function (page, callback) {
            console.error ("waiting", condition, "seconds for page to settle");
            setTimeout (callback, parseInt (condition, 10) * 1000);
        };
    }
    else
    {
        return function (page, callback) { callback (); };
    }
};

var find_web_labels_page = function (page) {
    page.injectJs ('node_modules/URIjs/src/URI.js');

    return page.evaluate (function () {
        var link = document.querySelector ("*[rel=jslicense]");
        if (!link) {
            return null;
        };
        var link_href = link.getAttribute("href");
        if (!link_href) {
            return null;
        }

        var base = new URI(document.baseURI);
        var href = new URI(link_href);
        return "" + (href.is ("absolute") ? href : href.absoluteTo (base));
    });

};

var main = function (address, wait) {

    page.onResourceReceived = function (res) {
        if (/javascript/i.test (res.contentType)) {
            scripts[res.url] = true;
        }
    };

    page.onError = function (msg, trace) {
        console.error (msg);
    };


    page.open(address, function (status) {
        if (status !== 'success') {
            console.error('ERROR loading', address);
        }
        else
        {
            var jslicense = find_web_labels_page (page);
            wait (page, function () {
                console.log (JSON.stringify ({
                    "jslicense": [ jslicense ],
                    "scripts": Object.keys (scripts),
                    "page": [ address ]
                }, undefined, 4));

                phantom.exit();
            });
        }
    });
};

if (system.args.length === 1) {
    console.log([ "Usage: gather <URL> [wait-for]",
                  "",
                  "    URL        The URL to audit.",
                  "    wait-for   How long to wait for the page to settle.",
                  "               (this should only be needed if your page",
                  "                loads more javascript dynamically, e.g.",
                  "                using RequireJS client-side).",
                  "" ].join ("\n"));

    phantom.exit(1);
} else {
    main (system.args[1], wait(system.args[2]));
}
