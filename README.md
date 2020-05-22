# tbkeys

`tbkeys` is a bootstrapped extension for Thunderbird that uses
[Mousetrap](https://craig.is/killing/mice) to bind key sequences to custom
commands.

## Install

*  Download the tbkeys.xpi file from one of the releases listed on the [GitHub releases page](https://github.com/willsALMANJ/tbkeys/releases).
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

To customize keybindings, create a file named `~/.tbkeys.json` (`_tbkeys.json`
in the home directory on Windows) containing a JSON object mapping keybindings
(with Mousetrap syntax) to javascript code to execute. A custom path to the
keybindings file can be specified by setting the `extensions.tbkeys.key_file`
preference in `about:config`.

Note that if the `.tbkeys.json` file exists it overrides all of the default
keybindings. The content of the default keybindings can be found in
[addon/content/tbkeys.json](addon/content/tbkeys.json) and can be used as a
starting point for creating a custom `.tbkeys.json` file.
