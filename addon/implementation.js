"use strict";
/* global ChromeUtils, Services */

var { ExtensionCommon } = ChromeUtils.importESModule(
  "resource://gre/modules/ExtensionCommon.sys.mjs"
);
var { ExtensionParent } = ChromeUtils.importESModule(
  "resource://gre/modules/ExtensionParent.sys.mjs"
);
var { ExtensionSupport } = ChromeUtils.importESModule(
  "resource:///modules/ExtensionSupport.sys.mjs"
);

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
const WINDOW_TYPES = {
  "mail:3pane": "main",
  msgcompose: "compose",
};

// Element names that always count as text-entry targets, no matter where in
// the event path they appear (see isTextTargetInPath below).
const TEXT_TARGET_TAGS = [
  "imconversation",
  "textbox",
  "input",
  "select",
  "textarea",
  "html:input",
  "search-textbox",
  "xul:search-textbox",
  "html:textarea",
  "global-search-bar",
  "search-bar",
  "moz-input-search",
  "account-hub-container",
  // Thunderbird Conversations (gconversation@xulforum.org) renders its
  // quick-reply editor inside nested open shadow roots:
  //   <compose-widget> -> <text-area class="body"> -> <textarea>
  // Key events from the editor retarget to a host element by the time they
  // reach the chrome window, so a single-tagName check never sees the
  // underlying textarea/input.
  "compose-widget",
  "text-area",
  "text-box",
];

// NOTE: "browser" is deliberately NOT in the path-scan list. A message-list
// keypress carries the sibling message-pane <browser> in its composed path,
// so scanning for "browser" suppresses every thread-pane key as text-entry
// (all bindings silently dead, zero console errors). "browser" remains a
// direct-target check below (upstream parity: focus sitting directly on a
// browser element), where it is exact, not ancestral.
const DIRECT_TARGET_ONLY_TAGS = ["browser"];

function isTextTargetInPath(path) {
  for (let node of path) {
    if (!node || typeof node.tagName != "string") {
      continue;
    }
    if (TEXT_TARGET_TAGS.includes(node.tagName.toLowerCase())) {
      return true;
    }
    // Content-editable regions anywhere in the path (covers designMode
    // editors whose target reports contentEditable "inherit").
    if (node.isContentEditable === true) {
      return true;
    }
  }
  return false;
}

// Function called by Mousetrap to test if it should stop processing a key event
//
// This function is based on the default callback in Mousetrap but is extended
// to include more text input fields that are specific to Thunderbird.
// Additionally, it does not ignore text fields if the first key includes
// modifiers other than shift.
function stopCallback(e, element, combo, seq) {
  let tagName = element.tagName.toLowerCase();
  // Uncomment the following line to debug why tbkeys is triggering in an input
  // field where it should not trigger:
  // Services.console.logStringMessage(`tbkeys triggered by tag ${tagName}`)
  let isText =
    TEXT_TARGET_TAGS.includes(tagName) ||
    DIRECT_TARGET_ONLY_TAGS.includes(tagName) ||
    (element.contentEditable && element.contentEditable == "true");

  if (!isText && element.contentEditable == "inherit") {
    let ancestor = element;
    while (ancestor.contentEditable == "inherit") {
      ancestor = ancestor.parentElement;
      if (ancestor === null) {
        if (element.ownerDocument.designMode == "on") {
          isText = true;
        }
        break;
      }
      if (ancestor.contentEditable == "true") {
        isText = true;
        break;
      }
    }
  }

  // Shadow-DOM editors (e.g. Conversations' <compose-widget> quick reply):
  // the target seen in the chrome document is a retargeted host, so scan the
  // full composed path for any text-entry context instead of trusting the
  // single target tagName.
  if (!isText && typeof e.composedPath == "function") {
    let path = [];
    try {
      path = e.composedPath();
    } catch (ex) {
      path = [];
    }
    isText = isTextTargetInPath(path);
  }

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
      case "memsg":
        Services.obs.notifyObservers(null, "tbkeys-memsg", cmdBody);
        break;
      case "unset":
        break;
      default:
        eval(command);
        break;
    }
    return false;
  };

  return callback;
}

var TBKeys = {
  // keys stores keybindings so they can be applied to new windows that are
  // opened after the bindings have been set
  //
  // Initialized to empty key bindings for each window type
  keys: Object.fromEntries(Object.values(WINDOW_TYPES).map((t) => [t, {}])),

  // The init() function uses the `initialized` flag so that its initialization
  // code can be run only once but it can be called at the latest possible
  // moment (at the first usage of the experiment API).
  initialized: false,
  meMsgCallback: null,
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
    Services.scriptloader.loadSubScriptWithOptions(
      extension.rootURI.resolve("modules/mousetrap.js"),
      { target: win, allowUnsafeURL: true }
    );
    win.Mousetrap.prototype.stopCallback = stopCallback;
    let type = win.document.documentElement.getAttribute("windowtype");
    let keys = this.keys[WINDOW_TYPES[type]];
    this.bindKeysInWindow(win, keys);
  },

  unloadWindowChrome: function (win) {
    if (typeof win.Mousetrap != "undefined") {
      win.Mousetrap.reset();
    }
    delete win.Mousetrap;
  },

  bindKeysInWindow: function (win, keys) {
    win.Mousetrap.reset();
    for (let [key, command] of Object.entries(keys)) {
      win.Mousetrap.bind(key, buildKeyCommand(win, command));
    }
  },

  // Set all keybindings for all windows
  //
  // keyBindings has the structure:
  //   {windowType: {keySequence: keyCommand}}
  // keyBindings should have all WINDOW_TYPES values
  bindKeys: function (keyBindings) {
    this.init();
    this.keys = keyBindings;
    for (const [tbWinName, shortWinName] of Object.entries(WINDOW_TYPES)) {
      let windows = Services.wm.getEnumerator(tbWinName);
      while (windows.hasMoreElements()) {
        let win = windows.getNext();

        if (typeof win.Mousetrap != "undefined") {
          this.bindKeysInWindow(win, this.keys[shortWinName]);
        }
      }
    }
  },

  MEMsgObserver: {
    observe: function (subject, topic, data) {
      switch (topic) {
        case "tbkeys-memsg":
          if (TBKeys.meMsgCallback !== null) {
            let extensionID = data.split(":", 1)[0];
            let message = data.slice(extensionID.length + 1);
            TBKeys.meMsgCallback(extensionID, message);
          }
          break;
        default:
      }
    },
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

  getAPI(context) {
    return {
      tbkeys: {
        bindKeys: async function (keyBindings) {
          TBKeys.bindKeys(keyBindings);
        },
        onSendMessage: new ExtensionCommon.EventManager({
          context,
          name: "tbkeys.onSendMessage",
          register: (fire) => {
            TBKeys.meMsgCallback = (extensionID, message) => {
              fire.async(extensionID, message);
            };
            Services.obs.addObserver(
              TBKeys.MEMsgObserver,
              "tbkeys-memsg",
              false
            );
            return () => {
              Services.obs.removeObserver(TBKeys.MEMsgObserver, "tbkeys-memsg");
              TBKeys.meMsgCallback = null;
            };
          },
        }).api(),
      },
    };
  }
};
