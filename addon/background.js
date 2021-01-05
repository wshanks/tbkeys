'use strict'
/* global browser */
var defaults = {
    "mainkeys": `{
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
}`,
    "composekeys": "{}"
}
var optionNames = Object.getOwnPropertyNames(defaults)

// Taken from https://thunderbird.topicbox.com/groups/addons/T46e96308f41c0de1
const promiseWithTimeout = function(ms, promise){
  // Create a promise that rejects in <ms> milliseconds
  let timeout = new Promise((resolve, reject) => {
    let id = setTimeout(() => {
      clearTimeout(id);
      reject(new Error("Timed out in " + ms + "ms."))
    }, ms)
  })

  // Returns a race between our timeout and the passed in promise
  return Promise.race([
    promise,
    timeout
  ])
}


async function getSettings() {
    let settings
    const retries = 7;
    const baseTimeout = 700;
    // Storage retrieval does not always work, so retry in a loop.
    // See https://thunderbird.topicbox.com/groups/addons/T46e96308f41c0de1
    for (let tryNum = 0;; tryNum++) {
        try {
            settings = await promiseWithTimeout(baseTimeout * (tryNum + 1), browser.storage.local.get())
            break
        } catch (error) {
            if (tryNum >= retries) {
                error.message = "TBKeys: could not load settings -- " + error.message;
                throw error
            }
        }
    }

    // Migrate old "keys" setting to "mainkeys"
    if (settings.hasOwnProperty("keys")) {
        settings.mainkeys = settings.keys
        await browser.storage.local.remove("keys")
        await browser.storage.local.set({"mainkeys": settings.mainkeys})
    }

    for (let setting of optionNames) {
        if (!settings.hasOwnProperty(setting)) {
            settings[setting] = defaults[setting]
        }
    }

    return settings
}

async function applyKeys() {
    let settings = await getSettings()

    await browser.tbkeys.bindkeys(JSON.parse(settings.mainkeys), "main")
    await browser.tbkeys.bindkeys(JSON.parse(settings.composekeys), "compose")
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
