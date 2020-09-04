# tbkeys

`tbkeys` is a bootstrapped extension for Thunderbird that uses
[Mousetrap](https://craig.is/killing/mice) to bind key sequences to custom
commands.

## Install

* Download the tbkeys.xpi file from one of the releases listed on the [GitHub releases page](https://github.com/willsALMANJ/tbkeys/releases).
* Open the Add-ons Manager in Thunderbird (Tools->Add-ons).
* Click on the gear icon in the upper right and choose "Install Add-on From File..." and then select the downloaded tbkeys.xpi file.
* The add-on will self-update from the GitHub releases page when future updates are released.

## Default keybindings

The default keybindings are modeled on GMail's keybindings.

| Key | Function |
| --- | -------- |
|  c  | Compose new message  |
|  r  | Reply |
|  a  | Reply all |
|  f  | Forward |
|  #  | Delete |
|  u  | Refresh mail. If a message tab is open, close it. |
|  j  | Next message |
|  k  | Previous message |
|  o  | Open message |
|  x  | Archive message |

## Customizing keybindings

To customize keybindings, modify the "Key bindings" entry in the add-on's preferences pane which can be accessed from the add-on's entry in the Add-ons Manager ("Add-ons" in the Thunderbird menu).
The "Key bindings" entry should be a JSON object mapping keybindings (with Mousetrap syntax) to javascript code to execute (see [here](https://hg.mozilla.org/comm-central/file/tip/mail/base/content/mainCommandSet.inc.xhtml) for cmd name references).
The preferences page will not allow invalid JSON to be submitted, but it does not sanity check the keybindings otherwise.
