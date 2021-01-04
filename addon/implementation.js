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

var windowTypes = {
  main: "mail:3pane",
  compose: "msgcompose",
};
var tbWindowTypes = Object.values(windowTypes);

var TBKeys = {
  keys: {},
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
    win.Mousetrap.prototype.stopCallback = function (
      e,
      element,
      combo,
      seq
    ) {
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
    };
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
      win.Mousetrap.bind(key, function () {
        let command = TBKeys.keys[type][key];
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
      });
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
      let win = windows.getNext();
      let type = win.document.documentElement.getAttribute("windowtype");
      if (!tbWindowTypes.includes(type)) {
        continue;
      }
      TBKeys.unloadWindowChrome(win);
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
