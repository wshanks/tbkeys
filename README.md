[![Contributor Covenant](https://img.shields.io/badge/Contributor%20Covenant-v2.0%20adopted-ff69b4.svg)](code_of_conduct.md)

# <a name="intro"></a>tbkeys

`tbkeys` is an add-on for Thunderbird that uses [Mousetrap](https://craig.is/killing/mice) to bind key sequences to custom commands.

## Install

- Download the tbkeys.xpi file from one of the releases listed on the [GitHub releases page](https://github.com/willsALMANJ/tbkeys/releases).
- Open the Add-ons Manager in Thunderbird (Tools->Add-ons).
- Click on the gear icon in the upper right and choose "Install Add-on From File..." and then select the downloaded tbkeys.xpi file.
- The add-on will self-update from the GitHub releases page when future updates are released.

The [tbkeys-lite](#tbkeys-lite) version of the addon can also be installed from addons.thunderbird.net by searching for "tbkeys-lite" in the Thunderbird addons manager or by downloading the xpi file from [this page](https://addons.thunderbird.net/en-US/thunderbird/addon/tbkeys-lite/) and following the steps above.

## Default key bindings

The default key bindings for the main window are modeled on GMail's key bindings.

| Key | Function                                          |
| --- | ------------------------------------------------- |
| c   | Compose new message                               |
| r   | Reply                                             |
| a   | Reply all                                         |
| f   | Forward                                           |
| #   | Delete                                            |
| u   | Refresh mail. If a message tab is open, close it. |
| j   | Next message                                      |
| k   | Previous message                                  |
| o   | Open message                                      |
| x   | Archive message                                   |

## Customizing key bindings

To customize key bindings, modify the "key bindings" entries in the add-on's preferences pane which can be accessed from the add-on's entry in the Add-ons Manager ("Add-ons" in the Thunderbird menu).
Here are some things to consider when setting key bindings:

- The "key bindings" entry should be a JSON object mapping key bindings (with Mousetrap syntax as described [here](https://craig.is/killing/mice)) to a valid command (see the [Command syntax](#command-syntax)) section.
- There are separate fields in the preferences page for setting key bindings for the main Thunderbird window and the compose window.
  Key bindings do not fire in other windows.
- Key bindings do not fire in text input fields unless the first key combo includes a modifier other than `shift`.
- The preferences page will not allow invalid JSON to be submitted, but it does not sanity check the key bindings otherwise.
- This [old wiki page about Keyconfig](http://kb.mozillazine.org/Keyconfig_extension:_Thunderbird) also has some commands that are still valid.
- The Developer Toolbox (Tools->Developer Tools->Developer Toolbox in the menu) can be useful for poking around at the UI to find the name of an element to call a function on.
- Defining a key sequence (meaning multiple keys in succession) where the first key combination in the sequence is the same as a built-in shortcut (like `ctrl+j ctrl+k`) is not supported.
  Single keys with modifiers may be mapped to override the built-in shortcuts but not sequences.

### Command syntax

A few different styles of commands can be specified for key bindings.
They are:

- **Simple commands**: These commands follow the format `cmd:<command_name>` where `<command_name>` is a command that Thunderbird can execute with `goDoCommand()`.
  Most command names can be found in [the main command set file](https://hg.mozilla.org/comm-central/file/tip/mail/base/content/mainCommandSet.inc.xhtml) of the Thunderbird source code.
- **Simple function calls**: These commands follow the format `func:<func_name>` where `<func_name>` is a function defined on the Thunderbird window object.
  That function is called without any arguments.
- **Custom function calls**: These commands follow the format `tbkeys:<func_name>` where `<func_name>` is the name of a custom function written in tbkeys.
  Currently, the only available custom function is `closeMessageAndRefresh` which closes the open tab if it is not the first tab and then refreshes all accounts.
  This behavior mimics the behavior of the GMail keybinding `u`.
- **Unset binding**: These entries simply contain the text `unset`.
  When an `unset` keybinding is triggered, nothing happens.
  This can be useful unbinding built-in Thunderbird key bindings which you do not wish to trigger by accident.
- **MailExtension messages**: These commands follow the format `memsg:<extensionID>:<message>` where `<extensionID>` is the ID of the Thunderbird extension to which to send a message and `<message>` is a string message to send to the extension using the `browser.runtime.sendMessage()` MailExtension API.
  Currently, only string messages are supported because `tbkeys` stores its commands as strings, though that restriction could possibly be relaxed in the future.
- <a name="eval"></a>**Eval commands**: These entries may contain arbitrary javascript code on which tbkeys will call `eval()` when the key binding is triggered.
  Any entry not matching the prefixes of the other command types is treated as an eval command.
  **NOTE:** eval commands are not available in tbkeys-lite and will function the same as unset commands instead.

## Common key bindings

Here are some examples of eval commands for commonly desired key bindings:

- **Next tab**: `window.document.getElementById('tabmail-tabs').advanceSelectedTab(1, true)`
- **Previous tab**: `window.document.getElementById('tabmail-tabs').advanceSelectedTab(-1, true)`
- **Close tab**: `func:CloseTabOrWindow`
- **Scroll message list down**: `window.document.getElementById('threadTree').scrollByLines(1)`
- **Scroll message list up**: `window.document.getElementById('threadTree').scrollByLines(-1)`
- **Scroll message body down**:
  - v115+: `window.gTabmail.currentAboutMessage.getMessagePaneBrowser().contentWindow.scrollBy(0, 100)`
  - v102: `window.document.getElementById('messagepane').contentDocument.documentElement.getElementsByTagName('body')[0].scrollBy(0, 100)`
- **Scroll message body up**:
  - v115+: `window.gTabmail.currentAboutMessage.getMessagePaneBrowser().contentWindow.scrollBy(0, -100)`
  - v102: `window.document.getElementById('messagepane').contentDocument.documentElement.getElementsByTagName('body')[0].scrollBy(0, -100)`
- **Create new folder**: `window.goDoCommand('cmd_newFolder')`
- **Subscribe to feed**: `window.openSubscriptionsDialog(window.GetSelectedMsgFolders()[0])`

## Unsetting default key bindings

The "Unset singles" button in the preferences pane can be used to unset Thunderbird's default single key bindings in the main window.
This function set all of Thunderbird's default single key shortcuts to `unset` unless they are currently set in tbkey's preferences (that is, it won't overwrite tbkeys' existing settings for single key shortcuts).

## <a name="tbkeys-lite"></a>tbkeys and tbkeys-lite

tbkeys-lite is a version of tbkeys with the ability to execute arbitrary javascript removed.

## Security, privacy, and implementation

Before installation, Thunderbird will prompt about the extension requiring permission to "Have full, unrestricted access to Thunderbird, and your computer."
The reason for this permission request is that tbkeys must inject a key listener into the Thunderbird user interface in order to listen for key bindings.
To do this, tbkeys uses the older Thunderbird extension interface that predates MailExtensions.
This interface is what all extensions used prior to Thunderbird 68.
The new MailExtensions APIs which provide tighter control on what extensions can do do not have a keyboard shortcut API.
If you are interested in seeing a keyboard shortcut API added to Thunderbird, please consider contributing code to the project.
Perhaps [this ticket](https://bugzilla.mozilla.org/show_bug.cgi?id=1591730) in the Thunderbird issue tracker could be a starting point.

To discuss the security considerations related to tbkeys further, it is necessary to review its implementation.
As mentioned in the [intro](#intro), tbkeys relies on the Mousetrap library for managing the keybindings.
The bulk of the logic of tbkeys is in [implementation.js](addon/implementation.js) which is a [MailExtension experiment](https://developer.thunderbird.net/add-ons/mailextensions/experiments).
`implementation.js` sets up the experiment API which can be called by tbkey's standard (restricted in scope) MailExtension to bind keyboard shortcuts to functions (including a null function for unbinding) and to messages to send to other extensions.
`implementation.js` also loads Mousetrap into each Thunderbird window, tweaks the conditions upon which Mousetrap captures a key even to account for Thunderbird specific UI elements, and defines the function that executes what the user specifies for each key binding.
That is all that `implementation.js` does.
It does not access the local file system or any message data and does not access the network.

One of the command modes tbkeys supports is [eval](#eval).
This mode uses `eval()` to execute arbitrary code provided by the user in `implementation.js` with full access to Thunderbird's internals.
If one does not need to bind to arbitrary code, perhaps there is some security gained by using [tbkeys-lite](#tbkeys-lite) which does not support eval commands.
tbkeys-lite is the version published on [Thunderbird's Add-ons page](https://addons.thunderbird.net/en-US/thunderbird/addon/tbkeys-lite/).
Add-ons published there undergo an independent manual review.
Having that barrier of review between yourself and the developer provides an added layer of security.
