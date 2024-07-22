"use strict";
/* global browser */
var background = browser.extension.getBackgroundPage();

// Save options currently in input fields if they pass validation
async function saveOptions(e) {
  e.preventDefault();
  let settings = {};

  if (!validateKeys()) {
    return;
  }

  let element;
  let value;
  for (let setting of background.optionNames) {
    element = document.querySelector("#" + setting);
    if (element.type == "checkbox") {
      value = element.checked;
    } else {
      value = element.value;
    }
    // Only save values set to a new, non-empty value
    if (value != background.defaults[setting] && value != "") {
      settings[setting] = value;
    }
  }
  await browser.storage.local.set(settings);
  for (let setting of background.optionNames) {
    if (!Object.prototype.hasOwnProperty.call(settings, setting)) {
      await browser.storage.local.remove(setting);
    }
  }
  await background.applyKeys();
  await restoreOptions();
}

// Restore currently stored settings to the input fields
async function restoreOptions() {
  let settings = await background.getSettings();
  let element;
  for (let setting in settings) {
    element = document.querySelector("#" + setting);
    if (element.type == "checkbox") {
      element.checked = settings[setting];
    } else {
      element.value = settings[setting];
    }
  }
}

// Restore the default settings to the input fields and storage
async function restoreDefaults(e) {
  e.preventDefault();
  await browser.storage.local.remove(background.optionNames);
  await restoreOptions();
}

// Apply "unset" to all single keys not currently set to something else
async function unsetSingleKeys(e) {
  e.preventDefault();
  let settings = await browser.storage.local.get("mainkeys");
  if (!Object.prototype.hasOwnProperty.call(settings, "mainkeys")) {
    settings.mainkeys = background.defaults.mainkeys;
  }
  let keys = JSON.parse(settings.mainkeys);
  let singles = [
    "0",
    "1",
    "2",
    "3",
    "4",
    "5",
    "6",
    "7",
    "8",
    "9",
    "a",
    "b",
    "c",
    "f",
    "j",
    "k",
    "m",
    "o",
    "p",
    "r",
    "s",
    "t",
    "u",
    "w",
    "x",
    "#",
    "]",
    "[",
  ];
  for (let key of singles) {
    if (!Object.prototype.hasOwnProperty.call(keys, key)) {
      keys[key] = "unset";
    }
  }
  await browser.storage.local.set({ mainkeys: JSON.stringify(keys, null, 4) });
  await background.applyKeys();
  await restoreOptions();
}

function validateKeys() {
  let keysFields = document.querySelectorAll(".json");
  let valid = true;
  for (let keysField of keysFields) {
    try {
      if (keysField.value != "") {
        JSON.parse(keysField.value);
      }
      keysField.setCustomValidity("");
    } catch {
      keysField.setCustomValidity("Invalid JSON");
      valid = false;
    }
  }
  return valid;
}

document.addEventListener("DOMContentLoaded", restoreOptions);
document.querySelector("#save").addEventListener("submit", saveOptions);
document.querySelector("#restore").addEventListener("submit", restoreDefaults);
document.querySelector("#unset").addEventListener("submit", unsetSingleKeys);
