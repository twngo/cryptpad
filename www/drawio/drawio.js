// mxGraph Client Configuration
var mxBasePath = "mxgraph-client/3.7.2/";
var mxLanguage = 'ed';

var mxGraphEditorBasePath = "mxgraph-editor/3.7.2/";

// Diagram Editor Configuration
var diagramEditorBasePath = "draw.io/6.5.7/";
var RESOURCES_PATH = diagramEditorBasePath + 'resources';
// Comment out the following line when using the basic mxGraph Editor.
var RESOURCE_BASE = RESOURCES_PATH + '/dia';
var STENCIL_PATH = diagramEditorBasePath + 'stencils';
var IMAGE_PATH = diagramEditorBasePath + 'images';
var STYLE_PATH = CSS_PATH = diagramEditorBasePath + 'styles';

var SHAPES_PATH = diagramEditorBasePath + 'shapes';
var GRAPH_IMAGE_PATH = diagramEditorBasePath + 'img';
var TEMPLATE_PATH = diagramEditorBasePath + 'templates';

var isLocalStorage = true;

var urlParams = (function(params) {
  var pairs = window.location.search.substr(1).split('&');
  pairs.forEach(function(pair) {
    var parts = pair.split('=', 2);
    if (parts.length === 2) {
      params[parts[0]] = decodeURIComponent(parts[1].replace(/\+/g, " "));
    }
  });
  return params;
})({
  // Don't show the splash screen.
  'splash': '0',
  // Disable the tabbed UI.
  'pages': '0',
  // Disable the GitHub integration.
  'gh': '0',
  // Disable the Dropbox integration.
  'db': '0',
  // Disable the Google Drive integration.
  'gapi': '0',
  // Disable Google Analytics.
  'analytics': '0',
  // Disable the One Drive integration.
  'od': '0'
});

// Disabling the integration with these external services is not enough because the draw.io code has hard-coded references.
var DriveFile = DropboxFile = GitHubFile = OneDriveFile = false;

require.config({
  paths: {
    'mxgraph-init': diagramEditorBasePath + 'js/draw.io.init.min',
    'mxgraph-client': mxBasePath + 'mxClient.min',
    'jscolor': mxGraphEditorBasePath + 'jscolor/jscolor.min',
    'sanitizer': mxGraphEditorBasePath + 'sanitizer/sanitizer.min',
    'mxgraph-editor': mxGraphEditorBasePath + 'mxGraphEditor.min',
    'base64': diagramEditorBasePath + 'js/deflate/base64.min',
    'pako': diagramEditorBasePath + 'js/deflate/pako.min',
    'spin': diagramEditorBasePath + 'js/spin/spin.min',
    'draw.io': diagramEditorBasePath + 'js/draw.io.min',
  },
  shim: {
    'mxgraph-client': {
      deps: ['mxgraph-init']
    },
    'mxgraph-editor': {
      deps: ['mxgraph-client', 'jscolor', 'sanitizer']
    },
    'draw.io': {
      deps: ['mxgraph-editor', 'base64', 'pako', 'spinner']
    }
  }
})

define('spinner', ['spin'], function(spin) {
  // draw.io expects a global variable.
  window.Spinner = spin;
});

define('diagramEditor', ['jquery', 'draw.io'], function($) {
  //
  // Diagram Editor Constructor.
  //
  var createDiagramEditor = function(options) {
    options = options || {};
    window.editorUI = editorUI = new App(new Editor(false, options.themes), options.container);
    return editorUI;
  };

  //
  // Disable the tabbed UI (setting urlParams['pages'] to '0' is not enough..)
  //
  EditorUi.prototype.initPages = function() {
    // Do nothing.
  };
  // Don't change the document title.
  App.prototype.updateDocumentTitle = function() {};

  //
  // Add support for disabling an entire sub-menu.
  //
  var originalAddSubmenu = Menus.prototype.addSubmenu;
  Menus.prototype.addSubmenu = function(name, menu, parent) {
    var subMenu = this.get(name);
    if (subMenu && subMenu.visible !== false) {
      originalAddSubmenu.apply(this, arguments);
    }
  };

  //
  // Clean the editor menu by removing the features that are not needed.
  //
  var cleanMenu = function(editorUI) {
    // Disable and hide some of the menu entries.
    [
      // File menu
      'new', 'open', 'save', 'saveAs', 'rename', 'makeCopy', 'close',
      // Extras menu
      'autosave', 'showStartScreen', 'plugins', 'offline', 'chromeApp',
       // Help menu (Graph Editor)
      'help'
    ].forEach(function(actionName) {
      var action = editorUI.actions.actions[actionName];
      if (action) {
        action.enabled = action.visible = false;
      }
    });

    // Disable and hide some of the sub-menus.
    [
      // File menu
      'openFrom', 'openRecent', 'publish', 'embed',
      // Extras menu
      'theme'
    ].forEach(function(name) {
      var subMenu = editorUI.menus.get(name);
      if (subMenu) {
        subMenu.enabled = subMenu.visible = false;
      }
    });
  };

  //
  // Fix the side bar tool tip: the tool tip position is computed as if the editor takes the full screen.
  //
  var oldShowTooltip = Sidebar.prototype.showTooltip;
  Sidebar.prototype.showTooltip = function(elt) {
    if (this.enableTooltips && this.showTooltips && this.currentElt != elt) {
      // The next usage of mxUtils.bind() is to bind the (private) show function to the side bar object.
      // We need to overwrite the show function.
      var oldBind = mxUtils.bind;
      mxUtils.bind = function(object, method) {
        // Restore the original function.
        mxUtils.bind = oldBind;
        return oldBind(object, function() {
          var result = method.apply(this, arguments);
          // Adjust the tool tip coordinates because they are computed as if the editor takes the full screen.
          // Thus we need to add the editor offset.
          var offset = $(this.container).parent().offsetParent().offset();
          $(this.tooltip).css({
            left: (offset.left + parseInt(this.tooltip.style.left)) + 'px',
            top: (offset.top + parseInt(this.tooltip.style.top)) + 'px'
          });
          $(this.tooltipImage).css({
            left: (offset.left + parseInt(this.tooltipImage.style.left)) + 'px',
            top: (offset.top + parseInt(this.tooltipImage.style.top)) + 'px'
          });
          return result;
        });
      };
    }
    oldShowTooltip.apply(this, arguments);
  };

  //
  // Overwrite the Keyboard Shortcuts action because it uses the wrong URL.
  //
  var fixKeyboardShortcutsAction = function(editorUI) {
    var keyboardShortcutsAction = editorUI.actions.get('keyboardShortcuts');
    if (keyboardShortcutsAction) {
      var oldFunct = keyboardShortcutsAction.funct;
      keyboardShortcutsAction.funct = function() {
        if (mxClient.IS_SVG) {
          window.open(diagramEditorBasePath + 'shortcuts.svg');
        } else {
          oldFunct.apply(this, arguments);
        }
      };
    }
  };

  //
  // Remove the compact mode toggle and update the position of the remaining buttons.
  //
  var removeCompactModeToggle = function(editorUI) {
    if (typeof editorUI.toggleCompactMode === 'function') {
      editorUI.toggleCompactMode(true);
      var buttons = $(editorUI.container).find('.geToolbarContainer > a.geButton');
      buttons.last().remove();
      buttons.css('right', function(index, value) {
        return (parseInt(value) - 16) + 'px';
      });
    }
  };

  // replace change display function
  DrawioFile.prototype.addUnsavedStatus = function() {
    window.top.APP.config.onLocal();
  }

  //
  // jQuery plugin
  //
  var themes = {};
  $.fn.editDiagram = function(options) {
    return this.on('click', 'button', function(event) {
      // Make sure the buttons from the editor UI don't submit the edit form.
      event.preventDefault();
    }).each(function() {
      window.editorUI = editorUI = createDiagramEditor($.extend({
        container: this,
        themes: themes,
        fileName: $('#document-title').text(),
        input: $(this).children('input.diagram-content')
      }, options));
      $(this).removeClass('loading');
      cleanMenu(editorUI);
      fixKeyboardShortcutsAction(editorUI);
      removeCompactModeToggle(editorUI);
    });
  };

  //
  // Load the translation files.
  //
  var diagramEditorDeferred = $.Deferred();
  mxResources.loadDefaultBundle = false;
  var bundle = mxResources.getDefaultBundle(RESOURCE_BASE, mxLanguage) ||
    mxResources.getSpecialBundle(RESOURCE_BASE, mxLanguage);
  mxUtils.getAll([bundle, STYLE_PATH + '/default.xml'], function(response) {
    // Adds bundle text to resources.
    mxResources.parse(response[0].getText());

    // Configures the default editor theme.
    themes[Graph.prototype.defaultThemeName] = response[1].getDocumentElement();

    diagramEditorDeferred.resolve();
  }, function() {
    // Failed to load resources.
    diagramEditorDeferred.reject();
  });

  return diagramEditorDeferred.promise();
});

require(['jquery', 'diagramEditor'], function($, diagramEditorPromise) {
  diagramEditorPromise.done(function() {
    $('.diagram-editor').editDiagram();
  });
});
