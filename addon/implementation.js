'use strict'
/* global ChromeUtils, Components */

var { ExtensionCommon } = ChromeUtils.import(
    "resource://gre/modules/ExtensionCommon.jsm"
)

var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");

var { ExtensionParent } = ChromeUtils.import(
    "resource://gre/modules/ExtensionParent.jsm"
)
var extension = ExtensionParent.GlobalManager.getExtension(
    "tbkeys@addons.thunderbird.net"
)

var builtins = {
    closeMessageAndRefresh: function(window) {
        if (window.document.getElementById('tabmail').tabContainer.selectedIndex != 0) {
            window.CloseTabOrWindow()
        }
        window.goDoCommand('cmd_getMsgsForAuthAccounts')
        window.goDoCommand('cmd_expandAllThreads')
    }
}

var windowTypes = {
    "main": "mail:3pane",
    "compose": "msgcompose"
}
var tbWindowTypes = Object.values(windowTypes)

var TBKeys = {
    keys: {},

    cleanup: function() {
        let windows = Services.wm.getEnumerator(null)
        while (windows.hasMoreElements()) {
            let window = windows.getNext()
            let type = window.document.documentElement.getAttribute('windowtype')
            if (!tbWindowTypes.includes(type)) {
                continue
            }

            if (typeof window.Mousetrap != 'undefined') {
                window.Mousetrap.reset()
            }
            delete window.Mousetrap
        }

        Services.wm.removeListener(TBKeys.windowListener)
    },

    prepareWindows: function() {
        // Load scripts for previously opened windows
        var windows = Services.wm.getEnumerator(null)
        while (windows.hasMoreElements()) {
            let window = windows.getNext()
            let type = window.document.documentElement.getAttribute('windowtype')
            if (!tbWindowTypes.includes(type)) {
                continue
            }
            this.loadWindowChrome(window)
        }

        // Add listener to load scripts in windows opened in the future
        Services.wm.addListener(this.windowListener)
    },

    windowListener: {
        onOpenWindow: function(xulWindow) {
            var domWindow = xulWindow
                .QueryInterface(Components.interfaces.nsIInterfaceRequestor)
                .getInterface(Components.interfaces.nsIDOMWindow)

            domWindow.addEventListener('load', function listener() {
                TBKeys.loadWindowChrome(domWindow)
            }, {once: true})
        },

        onCloseWindow: function(_xulWindow) {},

        onWindowTitleChange: function(_xulWindow, _newTitle) {}
    },

    loadWindowChrome: async function(window) {
        if (window.document.readyState != "complete") {
            await new Promise((resolve) => {
                window.addEventListener("load", resolve, {once: true})
            })
        }

        this.loadWindowChromeWhenReady(window)
    },

    loadWindowChromeWhenReady: function(window) {
        let type = window.document.documentElement.getAttribute('windowtype')
        if (!tbWindowTypes.includes(type)) {
            return
        }
        Services.scriptloader.loadSubScript(
            extension.rootURI.resolve("modules/mousetrap.js"),
            window
        )
        window.Mousetrap.prototype.stopCallback = function(e, element, combo, seq) {
            let tagName = element.tagName.toLowerCase()
            let isText = (
                tagName == 'imconversation' ||
                tagName == 'textbox' || tagName == 'input' ||
                tagName == 'select' || tagName == 'textarea' ||
                tagName == 'html:input' || tagName == 'search-textbox' ||
                tagName == 'hmtl:textarea' ||
                (element.contentEditable && element.contentEditable == 'true')
            )

            let firstCombo = combo
            if (seq !== undefined) {
                firstCombo = seq.trim().split(" ")[0]
            }
            let modifiers = ["ctrl", "alt", "meta", "option", "command"]
            let hasModifier = false
            for (let mod of modifiers) {
                if (firstCombo.includes(mod)) {
                    hasModifier = true
                    break
                }
            }

            return isText && !hasModifier
        }
        this.bindKeys(window)
    },

    bindKeys: function(window) {
        window.Mousetrap.reset()
        let type = window.document.documentElement.getAttribute('windowtype')
        if (!this.keys.hasOwnProperty(type)) {
            return
        }
        for (let key of Object.keys(this.keys[type])) {
            window.Mousetrap.bind(key, function() {
                let command = TBKeys.keys[type][key]
                let cmdType = command.split(":", 1)[0]
                let cmdBody = command.slice(cmdType.length + 1)
                switch (cmdType) {
                    case "cmd":
                        window.goDoCommand(cmdBody)
                        break
                    case "func":
                        window[cmdBody]()
                        break
                    case "tbkeys":
                        builtins[cmdBody](window)
                        break
                    case "unset":
                        break
                    default:
                        eval(command)  // eslint-disable-line no-eval
                        break
                }
                return false
            })
        }
    },

    updateKeys: function(keys, windowType) {
        if (!windowTypes.hasOwnProperty(windowType)) {
            return
        }
        this.keys[windowTypes[windowType]] = keys
        var windows = Services.wm.getEnumerator(windowTypes[windowType]);
        while (windows.hasMoreElements()) {
            let window = windows.getNext()

            if (typeof window.Mousetrap != 'undefined') {
                this.bindKeys(window)
            }
        }
    }
}

TBKeys.prepareWindows()

var tbkeys = class extends ExtensionCommon.ExtensionAPI {  // eslint-disable-line no-unused-vars
    getAPI(context) {
        context.callOnClose(this)

        return {
            tbkeys: {
                bindkeys: async function(keys, windowType) {  // eslint-disable-line require-await
                    TBKeys.updateKeys(keys, windowType)
                }
            }
        }
    }

    close() {
        TBKeys.cleanup()

        // Thunderbird might still cache some of your JavaScript files and even
        // if JSMs have been unloaded, the last used version could be reused on
        // next load, ignoring any changes. Get around this issue by
        // invalidating the caches (this is identical to restarting TB with the
        // -purgecaches parameter):
        Services.obs.notifyObservers(null, "startupcache-invalidate", null)
    }
}
