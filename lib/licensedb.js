/*

  This file is part of JSlich, a JavaScript license checker.
  Copyright 2014, Kuno Woudt <kuno@frob.nl>.
  License: copyleft-next 0.3.0

*/

var _ = require ('underscore');
var fs = require ('fs');
var xdg = require ('xdg');
var download = require ('download');
var when = require ('when');

var database_url = 'https://licensedb.org/dl/license-database.tar.gz'

var cache_path = xdg.basedir.cachePath('jslich');
var licensedb_json_path = cache_path + '/license-database/json';

var global = { verbose: false };

var message = function (msg) {
    if (global.verbose) {
        console.log (msg);
    }
};

var make_array = function (item) {
    if (item === undefined || item === null) {
        return [];
    }
    else if (_(item).isArray ()) {
        return item;
    }
    else {
        return [ item ];
    }
};

exports.download = function (verbose) {
    var deferred = when.defer ();

    global.verbose = verbose;

    if (fs.existsSync (licensedb_json_path)) {
        message ("Using cached licensedb at " + licensedb_json_path + '/');
        deferred.resolve (licensedb_json_path);
    }
    else {
        console.log ('License database cache not found, downloading ...');
        var downloading = download(database_url, cache_path, { extract: true });
        downloading.on ('close', function () {
            deferred.resolve (licensedb_json_path);
            console.log ('done.');
        });
    }

    return deferred.promise;
};

exports.all_chained = function () {
    var files = fs.readdirSync (licensedb_json_path);

    return _(files).chain ().map (function (filename) {
        return JSON.parse (fs.readFileSync (
            licensedb_json_path + '/' + filename));
    });
};

exports.all = function () {
    return exports.all_chained ().value ();
};

exports.all_by_id = function () {
    return exports.all_chained ()
        .map (function (data) {
            // FIXME: I think licensedb.org should return full urls in li:id.
            return [ 'https://licensedb.org/id/' + data['li:id'], data ];
        })
        .object ()
        .value ();
};

var librejs_magnet = function (data) {
    var sameAs = make_array (data['owl:sameAs']);
    var libre = make_array (data['li:libre']);

    if (_(libre).isEmpty()) {
        return undefined;
    }

    return _(sameAs).find (function (item) {
        return item.match (/^magnet:/);
    });
};

exports.librejs_free = function () {
    return exports.all_chained ()
        .map (function (data) {
            var magnet = librejs_magnet (data);
            return magnet ? [ magnet, data ] : null;
        })
        .compact ()
        .object ()
        .value ();
};
