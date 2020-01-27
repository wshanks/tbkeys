# tbkeys

`tbkeys` is a bootstrapped extension for Thunderbird that uses
[Mousetrap](https://craig.is/killing/mice) to bind key sequences to custom
commands.

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
keybindings. The content of the default keybindings is provided below and can
be used a starting point for creating a custom `.tbkeys.json` file:

```
{
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
}
```
