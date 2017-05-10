/*
    globals require console
*/
var Express = require('express');
var Http = require('http');
var Https = require('https');
var BodyParser = require('body-parser');
var Fs = require('fs');
var WebSocketServer = require('ws').Server;
var NetfluxSrv = require('./node_modules/chainpad-server/NetfluxWebsocketSrv');
var Package = require('./package.json');
/* ONLYOFFICE sockjs server */
var OOServer = require('./ooserver.js');
var config = require('./config');
var websocketPort = config.websocketPort || config.httpPort;
var useSecureWebsockets = config.useSecureWebsockets || false;

// support multiple storage back ends
var Storage = require(config.storage||'./storage/file');

var app = Express();

var httpsOpts;

var DEV_MODE = !!process.env.DEV
if (DEV_MODE) {
    console.log("DEV MODE ENABLED");
}

const clone = (x) => (JSON.parse(JSON.stringify(x)));

var setHeaders = (function () {
    if (typeof(config.httpHeaders) !== 'object') { return function () {}; }

    const headers = clone(config.httpHeaders);
    if (config.contentSecurity) {
        headers['Content-Security-Policy'] = clone(config.contentSecurity);
    }
    const padHeaders = clone(headers);
    if (config.padContentSecurity) {
        padHeaders['Content-Security-Policy'] = clone(config.padContentSecurity);
    }
    if (Object.keys(headers).length) {
        return function (req, res) {
            const h = /^\/pad\/inner\.html.*/.test(req.url) ? padHeaders : headers;
            for (let header in h) { res.setHeader(header, h[header]); }
        };
    }
    return function () {};
}());

(function () {
if (!config.logFeedback) { return; }

const logFeedback = function (url) {
    url.replace(/\?(.*?)=/, function (all, fb) {
        console.log('[FEEDBACK] %s', fb);
    });
};

app.head(/^\/common\/feedback\.html/, function (req, res, next) {
    logFeedback(req.url);
    next();
});
}());

app.use(function (req, res, next) {
    setHeaders(req, res);
    if (/[\?\&]ver=[^\/]+$/.test(req.url)) { res.setHeader("Cache-Control", "max-age=31536000"); }
    next();
});

app.use(Express.static(__dirname + '/www'));

Fs.exists(__dirname + "/customize", function (e) {
    if (e) { return; }
    console.log("Cryptpad is customizable, see customize.dist/readme.md for details");
});

// FIXME I think this is a regression caused by a recent PR
// correct this hack without breaking the contributor's intended behaviour.

var mainPages = config.mainPages || ['index', 'privacy', 'terms', 'about', 'contact'];
var mainPagePattern = new RegExp('^\/(' + mainPages.join('|') + ').html$');
app.get(mainPagePattern, Express.static(__dirname + '/customize.dist'));

app.use("/customize", Express.static(__dirname + '/customize'));
app.use("/customize", Express.static(__dirname + '/customize.dist'));
app.use(/^\/[^\/]*$/, Express.static('customize'));
app.use(/^\/[^\/]*$/, Express.static('customize.dist'));

if (config.privKeyAndCertFiles) {
    var privKeyAndCerts = '';
    config.privKeyAndCertFiles.forEach(function (file) {
        privKeyAndCerts = privKeyAndCerts + Fs.readFileSync(file);
    });
    var array = privKeyAndCerts.split('\n-----BEGIN ');
    for (var i = 1; i < array.length; i++) { array[i] = '-----BEGIN ' + array[i]; }
    var privKey;
    for (var i = 0; i < array.length; i++) {
        if (array[i].indexOf('PRIVATE KEY-----\n') !== -1) {
            privKey = array[i];
            array.splice(i, 1);
            break;
        }
    }
    if (!privKey) { throw new Error("cannot find private key"); }
    httpsOpts = {
        cert: array.shift(),
        key: privKey,
        ca: array
    };
}

app.get('/api/config', function(req, res){
    var host = req.headers.host.replace(/\:[0-9]+/, '');
    res.setHeader('Content-Type', 'text/javascript');
    res.send('define(' + JSON.stringify({
        requireConf: {
            waitSeconds: 60,
            urlArgs: 'ver=' + Package.version + (DEV_MODE? '-' + (+new Date()): ''),
        },
        websocketPath: config.useExternalWebsocket ? undefined : config.websocketPath,
        websocketURL:'ws' + ((useSecureWebsockets) ? 's' : '') + '://' + host + ':' +
            websocketPort + '/cryptpad_websocket',
    }) + ');');
});

app.use(Express.static(__dirname + '/'));

/* SPECIAL CODE FOR ONLYOFFICE 
/* Font support as onlyoffice requires fonts transformed to js */  
var FONT_OBFUSCATION_MAGIC = new Buffer([
    0xA0, 0x66, 0xD6, 0x20, 0x14, 0x96, 0x47, 0xfa, 0x95, 0x69, 0xB8, 0x50, 0xB0, 0x41, 0x49, 0x48
]);


var FONT_NAME_MAP = {};
[ './www/onlyoffice/fonts/' ].forEach(function (path) {
    Fs.readdir(path, function (err, list) {
        if (err) { throw err; }
        list.forEach(function (fontName) {
            FONT_NAME_MAP[fontName.toLowerCase()] = path + fontName;
        });
    });
});

/* Code to automatically transform font to js */ 
/* Currently not active, but might be necessary */
app.use("/onlyoffice/fonts/odttf/:name", function (req, res) {
    var name = req.params.name.replace(/\.js$/, '').toLowerCase();
    console.log(name);
    if (!FONT_NAME_MAP[name]) {
        console.log(name);
        console.log(FONT_NAME_MAP[name]);
        res.status(400).send('No such font');
        return;
    }
    Fs.readFile(FONT_NAME_MAP[name], function (err, ret) {
        if (err) { throw err; }
        var maxLen = Math.min(32, ret.length);
        for (var i = 0; i < maxLen; i++) {
            ret[i] ^= FONT_OBFUSCATION_MAGIC[i % 16];
        }
        res.end(ret);
    });
});


/* Set of manual fonts needed by the editors */
/* It would be better to use the convertor but if the font is missing then the editor might not load */
/*
app.use("/onlyoffice/fonts/odttf/epywa1knkjr1hinwea.js",
    Express.static("./www/onlyoffice/fonts/epywa1knkjr1hinwea.js"));
app.use("/onlyoffice/fonts/odttf/epywa1knkjrw1m1wktdy.js",
    Express.static("./www/onlyoffice/fonts/epywa1knkjrw1m1wktdy.js"));
app.use("/onlyoffice/fonts/odttf/epywa1knkjrwrm1wktdy.js",
    Express.static("./www/onlyoffice/fonts/epywa1knkjrw1m1wktdy.js"));
app.use("/onlyoffice/fonts/odttf/epywa1knkjriwm1wktdy.js",
    Express.static("./www/onlyoffice/fonts/epywa1knkjrw1m1wktdy.js"));
app.use("/onlyoffice/fonts/odttf/q31zr3dbp3o1h7dwca.js",
    Express.static("./www/onlyoffice/fonts/epywa1knkjrw1m1wktdy.js"));
app.use("/onlyoffice/fonts/odttf/q31zr3dbp3os1muwqtuy.js",
    Express.static("./www/onlyoffice/fonts/epywa1knkjrw1m1wktdy.js"));
app.use("/onlyoffice/fonts/odttf/q31zr3dbp3osrmuwqtuy.js",
    Express.static("./www/onlyoffice/fonts/epywa1knkjrw1m1wktdy.js"));
app.use("/onlyoffice/fonts/odttf/q31zr3dbp3ozwmuwqtuy.js",
    Express.static("./www/onlyoffice/fonts/epywa1knkjrw1m1wktdy.js"));
app.use("/onlyoffice/fonts/odttf/cf3g1aucpcz8e7dg.js",
    Express.static("./www/onlyoffice/fonts/epywa1knkjrw1m1wktdy.js"));
app.use("/onlyoffice/fonts/odttf/cjozeamqchz8e7dd.js",
    Express.static("./www/onlyoffice/fonts/epywa1knkjrw1m1wktdy.js"));
*/

/* All fonts file replaced by the list of fonts in ttf */
app.use("/onlyoffice/sdkjs/common/AllFonts.js",
    Express.static("./www/onlyoffice/allfonts-noobf.js"));

/* Replace fonts thumbnail call */
app.use("/onlyoffice/sdkjs/common/Images/fonts_thumbnail@2x.png",
    Express.static("./www/onlyoffice/fonts_thumbnail.png"));


var httpServer = httpsOpts ? Https.createServer(httpsOpts, app) : Http.createServer(app);

/* Install sockjs websocket server */
OOServer.install(httpServer, () => {
 httpServer.listen(config.httpPort,config.httpAddress,function(){
    console.log('[%s] listening on port %s', new Date().toISOString(), config.httpPort);
 });
/* END ONLY OFFICE CODE */

var wsConfig = { server: httpServer };

var createSocketServer = function (err, rpc) {
    if(!config.useExternalWebsocket) {
        if (websocketPort !== config.httpPort) {
            console.log("setting up a new websocket server");
            wsConfig = { port: websocketPort};
        }
        var wsSrv = new WebSocketServer(wsConfig);
        Storage.create(config, function (store) {
            NetfluxSrv.run(store, wsSrv, config, rpc);
        });
    }
};

var loadRPC = function (cb) {
    config.rpc = typeof(config.rpc) === 'undefined'? './rpc.js' : config.rpc;

    if (typeof(config.rpc) === 'string') {
        // load pin store...
        var Rpc = require(config.rpc);
        Rpc.create(config, function (e, rpc) {
            if (e) { throw e; }
            cb(void 0, rpc);
        });
    } else {
        cb();
    }
};

loadRPC(createSocketServer);
});
