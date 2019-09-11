/* Copyright 2019 Will Shanks.
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";
/* global Components, ChromeUtils */
/* global TBKeys, APP_SHUTDOWN */
const {utils: Cu} = Components;

// eslint-disable-next-line no-unused-vars
function install(data, reason) {

}

// eslint-disable-next-line no-unused-vars
function startup(data, reason) {
    var { TBKeys } = ChromeUtils.import("chrome://tbkeys/content/tbkeys.js");
    TBKeys.init();
}

// eslint-disable-next-line no-unused-vars
function shutdown(data, reason) {
    if (reason == APP_SHUTDOWN) {
        return;
    }

    TBKeys.cleanup();
    Cu.unload("chrome://tbkeys/content/tbkeys.js");
}

// eslint-disable-next-line no-unused-vars
function uninstall(data, reason) {

}
