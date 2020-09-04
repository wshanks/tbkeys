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

var TBKeys = {
    keys: {},

    cleanup: function() {
        let windows = Services.wm.getEnumerator('mail:3pane');
        while (windows.hasMoreElements()) {
            let window = windows.getNext()

            if (typeof window.Mousetrap != 'undefined') {
                window.Mousetrap.reset()
            }
            delete window.Mousetrap
        }

        Services.wm.removeListener(TBKeys.windowListener)
    },

    prepareWindows: function() {
        // Load scripts for previously opened windows
        var windows = Services.wm.getEnumerator('mail:3pane');
        while (windows.hasMoreElements()) {
            this.loadWindowChrome(windows.getNext())
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
                if (domWindow.document.documentElement.
                        getAttribute('windowtype') == 'mail:3pane') {
                    TBKeys.loadWindowChrome(domWindow)
                }
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
        Services.scriptloader.loadSubScript(
            extension.rootURI.resolve("modules/mousetrap.js"),
            window
        )
        window.Mousetrap.prototype.stopCallback = function(e, element, _combo) {
            let tagName = element.tagName.toLowerCase()
            return (
                tagName == 'imconversation' ||
                tagName == 'textbox' || tagName == 'input' ||
                tagName == 'select' || tagName == 'textarea' ||
                tagName == 'html:input' || tagName == 'search-textbox' ||
                (element.contentEditable && element.contentEditable == 'true')
            )
        }
        this.bindKeys(window)
    },

    bindKeys: function(window) {
        window.Mousetrap.reset()
        for (let key of Object.keys(this.keys)) {
            window.Mousetrap.bind(key, function() {
                let command = TBKeys.keys[key]
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

    updateKeys: function(keys) {
        this.keys = keys
        var windows = Services.wm.getEnumerator('mail:3pane');
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
                bindkeys: async function(keys) {  // eslint-disable-line require-await
                    TBKeys.updateKeys(keys)
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
