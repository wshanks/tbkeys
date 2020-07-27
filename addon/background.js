'use strict'
/* global browser */
var defaults = {
    "keys": `{
    "j": "cmd:cmd_nextMsg",
    "k": "cmd:cmd_previousMsg",
    "o": "cmd:cmd_openMessage",
    "f": "cmd:cmd_forward",
    "#": "cmd:cmd_delete",
    "r": "cmd:cmd_reply",
    "a": "cmd:cmd_replyall",
    "x": "cmd:cmd_archive",
    "c": "func:MsgNewMessage",
    "u": "tbkeys:closeMessageAndRefresh"
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
