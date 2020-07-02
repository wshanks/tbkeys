'use strict'
/* global browser */
var defaults = {
    "keys": `{
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
}
var optionNames = Object.getOwnPropertyNames(defaults)

async function getSettings() {
    let settings = await browser.storage.local.get(optionNames)
    for (let setting of optionNames) {
        if (!settings.hasOwnProperty(setting)) {
            settings[setting] = defaults[setting]
        }
    }

    return settings
}

async function applyKeys() {
    let settings = await getSettings()

    browser.tbkeys.bindkeys(JSON.parse(settings.keys))
}

applyKeys()

browser.runtime.onInstalled.addListener(async (details) => {
    switch (details.reason) {
        case "update": {
            if (details.previousVersion.split(".")[0] < 2) {
                const url = browser.runtime.getURL("update_v2.0.html")
                await browser.tabs.create({ url })
            }
        }
    }
})
