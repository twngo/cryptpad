require.config({ paths: {
    'json.sortify': '/bower_components/json.sortify/dist/JSON.sortify'
}});

define([
    '/api/config?cb=' + Math.random().toString(16).substring(2),
    '/bower_components/chainpad-netflux/chainpad-netflux.js',
    '/bower_components/hyperjson/hyperjson.js',
    '/bower_components/chainpad-crypto/crypto.js',
    '/common/toolbar.js',
    '/bower_components/textpatcher/TextPatcher.amd.js',
    'json.sortify',
    '/bower_components/chainpad-json-validator/json-ot.js',
    '/common/cryptpad-common.js',
    '/bower_components/secure-fabric.js/dist/fabric.min.js',
    '/bower_components/jquery/dist/jquery.min.js',
    '/bower_components/file-saver/FileSaver.min.js',
    '/bower_components/diff-dom/diffDOM.js',
], function (Config, Realtime, Hyperjson, Crypto, Toolbar, TextPatcher, JSONSortify, JsonOT, Cryptpad) {
    var saveAs = window.saveAs;
    var Messages = Cryptpad.Messages;

    var module = window.APP = { };
    var $ = module.$ = window.jQuery;
    var Fabric = module.Fabric = window.fabric;
    window.Hyperjson = Hyperjson;

    $(function () {
    var DiffDom = window.diffDOM;
    Cryptpad.addLoadingScreen();
    var onConnectError = function (info) {
        Cryptpad.errorLoadingScreen(Messages.websocketError);
    };

    var emitResize = module.emitResize = function () {
        var cw = $('#svgeditorframe')[0].contentWindow;

        var evt = cw.document.createEvent('UIEvents');
        evt.initUIEvent('resize', true, false, cw, 0);
        cw.dispatchEvent(evt);
    };

    var toolbar;

    var secret = Cryptpad.getSecrets();
    var readOnly = secret.keys && !secret.keys.editKeyStr;
    if (!secret.keys) {
        secret.keys = secret.key;
    }

    var andThen = function () {

        var saveImage = module.saveImage = function () {
            var defaultName = "pretty-picture.png";
            Cryptpad.prompt(Messages.exportPrompt, defaultName, function (filename) {
                if (!(typeof(filename) === 'string' && filename)) { return; }
                $canvas[0].toBlob(function (blob) {
                    saveAs(blob, filename);
                });
            });
        };

        var initializing = true;

        var $bar = $('#toolbar');
        var parsedHash = Cryptpad.parsePadUrl(window.location.href);
        var defaultName = Cryptpad.getDefaultName(parsedHash);
        var isHistoryMode = false;
        var userData = module.userData = {}; // List of pretty name of all users (mapped with their server ID)
        var userList; // List of users still connected to the channel (server IDs)
        var addToUserData = function(data) {
            var users = module.users;
            for (var attrname in data) { userData[attrname] = data[attrname]; }

            if (users && users.length) {
                for (var userKey in userData) {
                    if (users.indexOf(userKey) === -1) {
                        delete userData[userKey];
                    }
                }
            }

            if(userList && typeof userList.onChange === "function") {
                userList.onChange(userData);
            }
        };

        var myData = {};
        var myUserName = ''; // My "pretty name"
        var myID; // My server ID

        var setMyID = function(info) {
          myID = info.myID || null;
          myUserName = myID;
        };

        var config = module.config = {
            initialState: '{}',
            websocketURL: Cryptpad.getWebsocketURL(),
            validateKey: secret.keys.validateKey,
            readOnly: readOnly,
            channel: secret.channel,
            crypto: Crypto.createEncryptor(secret.keys),
            setMyID: setMyID,
            transformFunction: JsonOT.transform,
        };

        var suggestName = function (fallback) {
            if (document.title === defaultName) {
                return fallback || "";
            } else {
                return document.title || defaultName;
            }
        };

        var renameCb = function (err, title) {
            if (err) { return; }
            document.title = title;
            config.onLocal();
        };

        var editHash;
        var onInit = config.onInit = function (info) {
            userList = info.userList;
            var config = {
                displayed: ['useradmin', 'spinner', 'lag', 'state', 'share', 'userlist', 'newpad'],
                userData: userData,
                readOnly: readOnly,
                share: {
                    secret: secret,
                    channel: info.channel
                },
                ifrw: window,
                title: {
                    onRename: renameCb,
                    defaultName: defaultName,
                    suggestName: suggestName
                },
                common: Cryptpad
            };
            if (readOnly) {delete config.changeNameID; }
            toolbar = module.toolbar = Toolbar.create($bar, info.myID, info.realtime, info.getLag, userList, config);

            var $rightside = $bar.find('.' + Toolbar.constants.rightside);

            /* add a history button */
            var histConfig = {};
            histConfig.onRender = function (val) {
                if (typeof val === "undefined") { return; }
                try {
                    console.log("History render: " + val);
                    var svgCanvas = frames[0].window.svgCanvas;
                    var svgEditor = frames[0].window.svgEditor;
                    var newSVG = hjson2domstring(val);
                    svgCanvas.clearSelection();
                    svgCanvas.clear();
                    svgCanvas.setSvgString(newSVG);
                    svgEditor.updateCanvas();
                } catch (e) {
                    // Probably a parse error
                    console.error(e);
                }
            };
            histConfig.onClose = function () {
                // Close button clicked
                setHistory(false, true);
                jQuery("#editor")[0].style="margin-top: 70px;";

            };
            histConfig.onRevert = function () {
                // Revert button clicked
                setHistory(false, false);
                onLocal();
                onRemote();
            };
            histConfig.onReady = function () {
                // Called when the history is loaded and the UI displayed
                setHistory(true);
                jQuery("#editor")[0].style="margin-top: 100px;";
            };
            histConfig.$toolbar = $bar;
            var $hist = Cryptpad.createButton('history', true, {histConfig: histConfig});
            $rightside.append($hist);

            var $export = Cryptpad.createButton('export', true, {}, saveImage);
            $rightside.append($export);

            var editHash;
            var viewHash = Cryptpad.getViewHashFromKeys(info.channel, secret.keys);

            if (!readOnly) {
                editHash = Cryptpad.getEditHashFromKeys(info.channel, secret.keys);
            }
            if (!readOnly) { Cryptpad.replaceHash(editHash); }
        };

        // used for debugging, feel free to remove
        var Catch = function (f) {
            return function () {
                try {
                    f();
                } catch (e) {
                    console.error(e);
                }
            };
        };

        var setHistory = function (bool, update) {
            isHistoryMode = bool;
            // setEditable(!bool);
            if (!bool && update) {
                  config.onRemote();
            }
        };

        var updateTitle = function (newTitle) {
            if (newTitle === document.title) { return; }
            // Change the title now, and set it back to the old value if there is an error
            var oldTitle = document.title;
            document.title = newTitle;
            Cryptpad.renamePad(newTitle, function (err, data) {
                if (err) {
                    console.log("Couldn't set pad title");
                    console.error(err);
                    document.title = oldTitle;
                    return;
                }
                document.title = data;
                $bar.find('.' + Toolbar.constants.title).find('span.title').text(data);
                $bar.find('.' + Toolbar.constants.title).find('input').val(data);
            });
        };

        var updateDefaultTitle = function (defaultTitle) {
            defaultName = defaultTitle;
            $bar.find('.' + Toolbar.constants.title).find('input').attr("placeholder", defaultName);
        };

/*
        var updateMetadata = function(shjson) {
            // Extract the user list (metadata) from the hyperjson
            var json = (shjson === "") ? "" : JSON.parse(shjson);
            var titleUpdated = false;
            var peerMetadata = json[3];
            if (peerMetadata && json.peerMetadata) {
                if (peerMetadata.users) {
                    var userData = peerMetadata.users;
                    // Update the local user data
                    addToUserData(userData);
                }
                if (peerMetadata.defaultTitle) {
                    updateDefaultTitle(peerMetadata.defaultTitle);
                }
                if (typeof peerMetadata.title !== "undefined") {
                    updateTitle(peeMetadata.title || defaultName);
                    titleUpdated = true;
                }
            }
            if (!titleUpdated) {
                updateTitle(defaultName);
            }
        };
*/

   var updateMetadata = function(shjson) {
                // Extract the user list (metadata) from the hyperjson
                if (!shjson || typeof (shjson) !== "string") { updateTitle(defaultName); return; }
                var hjson = JSON.parse(shjson);
                var peerMetadata = hjson[3];
                var titleUpdated = false;
                if (peerMetadata && peerMetadata.metadata) {
                    if (peerMetadata.metadata.users) {
                        var userData = peerMetadata.metadata.users;
                        // Update the local user data
                        addToUserData(userData);
                    }
                    if (peerMetadata.metadata.defaultTitle) {
                        updateDefaultTitle(peerMetadata.metadata.defaultTitle);
                    }
                    if (typeof peerMetadata.metadata.title !== "undefined") {
                        updateTitle(peerMetadata.metadata.title || defaultName);
                        titleUpdated = true;
                    }
                }
                if (!titleUpdated) {
                    updateTitle(defaultName);
                }
            };

        var hjson2domstring = function(hjson) {
            var userDocStateDom = hjsonToDom(JSON.parse(hjson));
            var tmp = document.createElement("div");
            tmp.appendChild(userDocStateDom);
            return tmp.innerHTML;
        };

        var domstring2hjson = function(domstring) {
            var tmp = document.createElement("div");
            tmp.innerHTML = domstring;
            return stringifyDOM(tmp.firstChild);
};

        var onRemote = config.onRemote = Catch(function () {
            if (initializing) { return; }
            if (isHistoryMode) { return; }
            var svgCanvas = frames[0].window.svgCanvas;
            var svgEditor = frames[0].window.svgEditor;
            /* var userDoc = module.realtime.getUserDoc();
            updateMetadata(userDoc);
            var json = JSON.parse(userDoc);
            var remoteDoc = json.content;
            */
            var selectedElements = storeSelection(svgCanvas);
            svgCanvas.clearSelection();
            var currentSVG = svgCanvas.getSvgString();
            var oldShjson = domstring2hjson(currentSVG);            
            var shjson = module.realtime.getUserDoc();

            // Update the user list (metadata) from the hyperjson
            updateMetadata(shjson);

            console.log("Remote content hjson: " + shjson);

            var newSVG = hjson2domstring(shjson);            
            if (newSVG==currentSVG) {
                restoreSelection(svgCanvas, selectedElements);
                return;
            }
            console.log("Remote content svg: " + newSVG);
            svgCanvas.clear();
            svgCanvas.setSvgString(newSVG);
            svgCanvas.clearSelection();
            svgEditor.updateCanvas();
            restoreSelection(svgCanvas, selectedElements);
        });

        var diffOptions = {
                preDiffApply: function (info) {
                },
                postDiffApply : function(info) {
                }
        };

        var DD = new DiffDom(diffOptions);

        // apply patches, and try not to lose the cursor in the process!
        var applyHjson = function (shjson, domElement) {
                var userDocStateDom = hjsonToDom(JSON.parse(shjson));

                if (!readOnly && !initializing) {
                    userDocStateDom.setAttribute("contenteditable", "true"); // lol wtf
                }
                var patch = (DD).diff(domElement, userDocStateDom);
                (DD).apply(domElement, patch);
        };

        var stringify = function (obj) {
            return JSONSortify(obj);
        };

        var hjsonToDom = function (H) {
            var dom = Hyperjson.toDOM(H);
            return dom;
        };

        var isNotMagicLine = function (el) {
            return !(el && typeof(el.getAttribute) === 'function' &&
             el.getAttribute('class') &&
             el.getAttribute('class').split(' ').indexOf('non-realtime') !== -1);
        };

        /* catch `type="_moz"` before it goes over the wire */
        var brFilter = function (hj) {
            if (hj[1].type === '_moz') { hj[1].type = undefined; }
            return hj;
        };

        var stringifyDOM = module.stringifyDOM = function (dom) {
                var hjson = Hyperjson.fromDOM(dom, isNotMagicLine, brFilter);
                hjson[3] = {
                    metadata: {
                        users: userData,
                        defaultTitle: defaultName
                    }
                };
                if (!initializing) {
                    hjson[3].metadata.title = document.title;
                } else if (Cryptpad.initialName && !hjson[3].metadata.title) {
                    hjson[3].metadata.title = Cryptpad.initialName;
                }
                return stringify(hjson);
        };

        var getDocElement = function() {
            return jQuery('#svgcontent', window.parent.frames[0].document)[0];
        }

        var storeSelection = function(svgCanvas) {
            var elementIds = []
            var elements = svgCanvas.getSelectedElems();
            elements.forEach(function(element) {
              if (element!=null)
                elementIds.push(element.id);
            });                
            return elementIds;
        }

        var restoreSelection = function(svgCanvas, elements) {
            elements.forEach(function(element) {
             if (element!=null) {
              var el = svgCanvas.getElem(element);
              if (el!=null)
                svgCanvas.addToSelection([el]);
             }
            });                 
        }

        var onLocal = config.onLocal = Catch(function () {
            if (initializing) { return; }
            if (isHistoryMode) { return; }
            if (readOnly) { return; }
            
            var svgCanvas = frames[0].window.svgCanvas;
            var svgEditor = frames[0].window.svgEditor;

            console.log("in onLocal");
            var selectedElements = storeSelection(svgCanvas);
            console.log(selectedElements);
            svgCanvas.clearSelection();
            var hjson = domstring2hjson(svgCanvas.getSvgString());
            console.log("Content: " + hjson);
            module.patchText(hjson);
            console.log(selectedElements);
            restoreSelection(svgCanvas, selectedElements);
        });

        var setName = module.setName = function (newName) {
            if (typeof(newName) !== 'string') { return; }
            var myUserNameTemp = newName.trim();
            if(newName.trim().length > 32) {
              myUserNameTemp = myUserNameTemp.substr(0, 32);
            }
            myUserName = myUserNameTemp;
            myData[myID] = {
               name: myUserName,
               uid: Cryptpad.getUid(),
            };
            addToUserData(myData);
            Cryptpad.setAttribute('username', myUserName, function (err, data) {
                if (err) {
                    console.log("Couldn't set username");
                    console.error(err);
                    return;
                }
                onLocal();
            });
        };

        var onReady = config.onReady = function (info) {
            var realtime = module.realtime = info.realtime;
            module.patchText = TextPatcher.create({
                realtime: realtime
            });

            Cryptpad.removeLoadingScreen();
            // setEditable(true);
            initializing = false;
            onRemote();
            Cryptpad.getLastName(function (err, lastName) {
                if (err) {
                    console.log("Could not get previous name");
                    console.error(err);
                    return;
                }
                // Update the toolbar list:
                // Add the current user in the metadata if he has edit rights
                if (readOnly) { return; }
                if (typeof(lastName) === 'string') {
                    setName(lastName);
                } else {
                    myData[myID] = {
                        name: "",
                        uid: Cryptpad.getUid(),
                    };
                    addToUserData(myData);
                    onLocal();
                    module.$userNameButton.click();
                }
            });
        };

        var onAbort = config.onAbort = function (info) {
            // setEditable(false);
            window.alert("Server Connection Lost");

            if (window.confirm("Would you like to save your image?")) {
                saveImage();
            }
        };

        var rt = Realtime.start(config);

        $('#clear').on('click', function () {
            canvas.clear();
        });

        $('#save').on('click', function () {
            saveImage();
        });
    };

    Cryptpad.ready(function (err, env) {
        andThen();
    });
    Cryptpad.onError(function (info) {
        if (info) {
            onConnectError();
        }
    });

    });
});
