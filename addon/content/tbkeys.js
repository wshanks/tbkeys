/* Copyright 2019 Will Shanks.
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
'use strict'
/* global ChromeUtils, Components */

// eslint-disable-next-line no-unused-vars
var EXPORTED_SYMBOLS = ['TBKeys']

var { Services } = ChromeUtils.import('resource://gre/modules/Services.jsm')
var { OS }  = ChromeUtils.import("resource://gre/modules/osfile.jsm")

var defaultKeys = `{
"j": "window.goDoCommand('cmd_nextMsg')",
"k": "window.goDoCommand('cmd_previousMsg')",
"o": "window.goDoCommand('cmd_openMessage')",
"f": "window.goDoCommand('cmd_forward')",
"#": "window.goDoCommand('cmd_delete')",
"r": "window.goDoCommand('cmd_reply')",
"a": "window.goDoCommand('cmd_replyall')",
"x": "window.goDoCommand('cmd_archive')",
"c": "window.MsgNewMessage()",
"u": "if (((window.document.activeElement.id == 'messagepane') || (window.document.activeElement == 'threadTree' )) && (window.document.getElementById('tabmail').tabContainer.selectedIndex!=0)){ window.CloseTabOrWindow()}; window.goDoCommand('cmd_getMsgsForAuthAccounts'); window.goDoCommand('cmd_expandAllThreads')"
}`


/**
 * TBKeys namespace.
 */
var TBKeys = {
    /********************************************/
    // Basic information
    /********************************************/
    id: 'tbkeys@addons.thunderbird.net',
    keys: {},

    /********************************************/
    // TBKeys setup functions
    /********************************************/
    init: async function() {
        await this.loadKeys()
        this.prepareWindows()
    },

    loadKeys: async function() {
        let defaults = Services.prefs.getDefaultBranch('extensions.tbkeys.');
        defaults.setCharPref("key_file", "")

        let prefBranch = Services.prefs.getBranch('extensions.tbkeys.')
        let key_file = prefBranch.getCharPref("key_file")

        if (key_file == "") {
            if (Services.appinfo.OS == "WINNT") {
                key_file = OS.Path.join(OS.Constants.Path.homeDir, "_tbkeys.json")
            } else {
                key_file = OS.Path.join(OS.Constants.Path.homeDir, ".tbkeys.json")
            }
        }

        let text = defaultKeys
        try {
            text = await OS.File.read(key_file, {encoding: "utf-8"})
        } catch (error) {
            Services.console.logStringMessage("tbkeys: falling back to default keybindings.")
        }

        try {
            this.keys = JSON.parse(text)
        } catch (error) {
            Services.console.logStringMessage(`tbkeys: Error parsing keys: ${error}: ${error.stack}`)
            Services.console.logStringMessage(`${text}`)
        }
    },

    cleanup: function() {
        var windows = Services.wm.getEnumerator('mail:3pane');
        while (windows.hasMoreElements()) {
            var tmpWin=windows.getNext()

            if (typeof tmpWin.Mousetrap != 'undefined') {
                tmpWin.Mousetrap.reset()
            }
            delete tmpWin.TBKeys
            delete tmpWin.Mousetrap
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

    loadWindowChrome: async function(scope) {
        if (scope.document.readyState != "complete") {
            await new Promise((resolve) => {
                scope.addEventListener("load", resolve, {once: true})
            })
        }

        this.loadWindowChromeWhenReady(scope)
    },

    loadWindowChromeWhenReady: function(scope) {
        Services.scriptloader.loadSubScript(
                'chrome://tbkeys/content/mousetrap.js', scope)
        this.bindKeys(scope)
    },

    bindKey: function(window, key, cmd) {
        window.Mousetrap.bind(key, function(){
            eval(cmd)  // eslint-disable-line no-eval
            return false
        })
    },

    bindKeys: function(window) {
        window.Mousetrap.prototype.stopCallback = function(e, element, _combo) {
            let tagName = element.tagName.toLowerCase()
            return (
                tagName == 'textbox' || tagName == 'input' ||
                tagName == 'select' || tagName == 'textarea' ||
                (element.contentEditable && element.contentEditable == 'true')
            )
        }
        window.Mousetrap.reset()
        for ( const [key, value] of Object.entries(this.keys)) {
            this.bindKey(window, key, value)
        }
    }
}
