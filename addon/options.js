'use strict'
/* global browser, document */
var background = browser.extension.getBackgroundPage()

async function saveOptions(e) {
    e.preventDefault()
    let originalSettings = await browser.storage.local.get(background.optionNames)
    let settings = {}

    if (!validateKeys()) {
        return
    }

    let element
    let value
    for (let setting of background.optionNames) {
        element = document.querySelector('#'+setting)
        if (element.type == 'checkbox') {
            value = element.checked
        } else {
            value = element.value
        }
        // Only save values set to a new, non-empty value
        if (value != background.defaults[setting] && value != "") {
            settings[setting] = value
        }
    }
    await browser.storage.local.set(settings)
    if (!settings.hasOwnProperty("keys") && originalSettings.hasOwnProperty("keys")) {
        await browser.storage.local.remove("keys")
    }
    if (settings.keys != originalSettings.keys) {
        await background.applyKeys()
    }
    await restoreOptions()
}


async function restoreOptions() {
    let settings = await background.getSettings()
    let element
    for (let setting in settings) {
        element = document.querySelector('#'+setting)
        if (element.type == 'checkbox') {
            element.checked = settings[setting]
        } else {
            element.value = settings[setting]
        }
    }
}


async function restoreDefaults(e) {
    e.preventDefault()
    await browser.storage.local.remove(background.optionNames)
    await restoreOptions()
}


function validateKeys() {
    let keysField = document.querySelector('#keys')
    try {
        if (keysField.value != "") {
            JSON.parse(keysField.value)
        }
        keysField.setCustomValidity("")
        return true
    } catch (err) {
        keysField.setCustomValidity("Invalid JSON")
        return false
    }
}


document.addEventListener('DOMContentLoaded', restoreOptions)
document.querySelector('#save').addEventListener('submit', saveOptions)
document.querySelector('#restore').addEventListener('submit', restoreDefaults)
