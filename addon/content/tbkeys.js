/* Copyright 2019 Will Shanks.
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
'use strict'
/* global ChromeUtils, Components */

// eslint-disable-next-line no-unused-vars
var EXPORTED_SYMBOLS = ['TBKeys']

var { Services } = ChromeUtils.import('resource://gre/modules/Services.jsm')

/**
 * TBKeys namespace.
 */
var TBKeys = {
    /********************************************/
    // Basic information
    /********************************************/
    id: 'tbkeys@addons.thunderbird.net',

    /********************************************/
    // TBKeys setup functions
    /********************************************/
    init: function() {
        this.prepareWindows()
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
        window.Mousetrap.reset()
        this.bindKey(window, "j", "window.goDoCommand('cmd_nextMsg')")
        this.bindKey(window, "k", "window.goDoCommand('cmd_previousMsg')")
        this.bindKey(window, "o", "window.goDoCommand('cmd_openMessage')")
        this.bindKey(window, "f", "window.goDoCommand('cmd_forward')")
        this.bindKey(window, "#", "window.goDoCommand('cmd_delete')")
        this.bindKey(window, "r", "window.goDoCommand('cmd_reply')")
        this.bindKey(window, "a", "window.goDoCommand('cmd_replyall')")
        this.bindKey(window, "x", "window.goDoCommand('cmd_archive')")
        this.bindKey(window, "c", "window.MsgNewMessage()")
        this.bindKey(window, "u", `
            if (((window.document.activeElement.id == 'messagepane') || (window.document.activeElement == 'threadTree' )) && (window.document.getElementById('tabmail').tabContainer.selectedIndex!=0)){
            window.CloseTabOrWindow()
        }

        window.goDoCommand('cmd_getMsgsForAuthAccounts')
        window.goDoCommand('cmd_expandAllThreads')
        `)
    }
}
