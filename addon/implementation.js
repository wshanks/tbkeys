"use strict";
/* global ChromeUtils */

var { ExtensionCommon } = ChromeUtils.import(
  "resource://gre/modules/ExtensionCommon.jsm"
);
var { ExtensionParent } = ChromeUtils.import(
  "resource://gre/modules/ExtensionParent.jsm"
);
var { ExtensionSupport } = ChromeUtils.import(
  "resource:///modules/ExtensionSupport.jsm"
);
var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");

const EXTENSION_NAME = "tbkeys@addons.thunderbird.net";
var extension = ExtensionParent.GlobalManager.getExtension(EXTENSION_NAME);

// Extra functions available for binding with tbkeys
var builtins = {
  closeMessageAndRefresh: function (win) {
    if (
      win.document.getElementById("tabmail").tabContainer.selectedIndex != 0
    ) {
      win.CloseTabOrWindow();
    }
    win.goDoCommand("cmd_getMsgsForAuthAccounts");
    win.goDoCommand("cmd_expandAllThreads");
  },
};

// Table to translate internal Thunderbird window names to shorter forms
// exposed in tbkeys' preferences.
var windowTypes = {
  main: "mail:3pane",
  compose: "msgcompose",
};

// Function called by Mousetrap to test if it should stop processing a key event
//
// This function is based on the default callback in Mousetrap but is extended
// to include more text input fields that are specific to Thunderbird.
// Additionally, it does not ignore text fields if the first key includes
// modifiers other than shift.
function stopCallback(e, element, combo, seq) {
  let tagName = element.tagName.toLowerCase();
  let isText =
    tagName == "imconversation" ||
    tagName == "textbox" ||
    tagName == "input" ||
    tagName == "select" ||
    tagName == "textarea" ||
    tagName == "html:input" ||
    tagName == "search-textbox" ||
    tagName == "html:textarea" ||
    (element.contentEditable && element.contentEditable == "true");

  let firstCombo = combo;
  if (seq !== undefined) {
    firstCombo = seq.trim().split(" ")[0];
  }
  let modifiers = ["ctrl", "alt", "meta", "option", "command"];
  let hasModifier = false;
  for (let mod of modifiers) {
    if (firstCombo.includes(mod)) {
      hasModifier = true;
      break;
    }
  }

  return isText && !hasModifier;
}


// Build a callback function to execute a tbkeys command
//
// win is the window in which the command should be executed
//
// command should be a string formatted as type:body where type is cmd, func,
// tbkeys, unset, or eval and body is the type-specific content of the command
function buildKeyCommand(win, command) {
  let callback = function () {
      // window is defined here so that it is available for use with eval() in
      // the non-lite version of tbkeys
      // eslint-disable-next-line no-unused-vars
      let window = win;

      let cmdType = command.split(":", 1)[0];
      let cmdBody = command.slice(cmdType.length + 1);
      switch (cmdType) {
        case "cmd":
          win.goDoCommand(cmdBody);
          break;
        case "func":
          win[cmdBody]();
          break;
        case "tbkeys":
          builtins[cmdBody](win);
          break;
        case "unset":
          break;
        default:
          eval(command); // eslint-disable-line no-eval
          break;
      }
      return false;
    }

  return callback
}


var TBKeys = {
  // Store keybindings so they can be applied to new windows that are opened
  // after the bindings have been set
  keys: {},

  // The init() function uses the `initialized` flag so that its initialization
  // code can be run only once but it can be called at the latest possible
  // moment (at the first usage of the experiment API).
  initialized: false,
  init: function () {
    if (this.initialized) {
      return;
    }
    ExtensionSupport.registerWindowListener(EXTENSION_NAME, {
      chromeURLs: [
        "chrome://messenger/content/messengercompose/messengercompose.xul",
        "chrome://messenger/content/messengercompose/messengercompose.xhtml",
        "chrome://messenger/content/messenger.xul",
        "chrome://messenger/content/messenger.xhtml",
      ],
      onLoadWindow: TBKeys.loadWindowChrome.bind(TBKeys),
      onUnloadWindow: TBKeys.unloadWindowChrome,
    });
    this.initialized = true;
  },

  loadWindowChrome: function (win) {
    Services.scriptloader.loadSubScript(
      extension.rootURI.resolve("modules/mousetrap.js"),
      win
    );
    win.Mousetrap.prototype.stopCallback = stopCallback;
    this.bindKeys(win);
  },

  unloadWindowChrome: function (win) {
    if (typeof win.Mousetrap != "undefined") {
      win.Mousetrap.reset();
    }
    delete win.Mousetrap;
  },

  bindKeys: function (win) {
    win.Mousetrap.reset();
    let type = win.document.documentElement.getAttribute("windowtype");
    if (!Object.prototype.hasOwnProperty.call(this.keys, type)) {
      return;
    }
    for (let key of Object.keys(this.keys[type])) {
      win.Mousetrap.bind(key, buildKeyCommand(win, TBKeys.keys[type][key]));
    }
  },

  updateKeys: function (keys, windowType) {
    this.init();
    if (!Object.prototype.hasOwnProperty.call(windowTypes, windowType)) {
      return;
    }
    this.keys[windowTypes[windowType]] = keys;
    var windows = Services.wm.getEnumerator(windowTypes[windowType]);
    while (windows.hasMoreElements()) {
      let win = windows.getNext();

      if (typeof win.Mousetrap != "undefined") {
        this.bindKeys(win);
      }
    }
  },
};

// eslint-disable-next-line no-unused-vars
var tbkeys = class extends ExtensionCommon.ExtensionAPI {
  onShutdown(isAppShutdown) {
    ExtensionSupport.unregisterWindowListener(EXTENSION_NAME);
    let windows = Services.wm.getEnumerator(null);
    while (windows.hasMoreElements()) {
      TBKeys.unloadWindowChrome(windows.getNext());
    }

    if (isAppShutdown) return;

    // Thunderbird might still cache some of your JavaScript files and even
    // if JSMs have been unloaded, the last used version could be reused on
    // next load, ignoring any changes. Get around this issue by
    // invalidating the caches (this is identical to restarting TB with the
    // -purgecaches parameter):
    Services.obs.notifyObservers(null, "startupcache-invalidate", null);
  }

  // eslint-disable-next-line no-unused-vars
  getAPI(context) {
    return {
      tbkeys: {
        // eslint-disable-next-line require-await
        bindkeys: async function (keys, windowType) {
          TBKeys.updateKeys(keys, windowType);
        },
      },
    };
  }
};
