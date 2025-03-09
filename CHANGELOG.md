- 2.4.0:

  - Drop support for versions of Thunderbird older than 128 and fix compatibility with Thunderbird 136.
    Those versions can continue using 2.3.0.

- 2.3.0:

  - Drop support for versions of Thunderbird older than 115.
    Those versions can continue using 2.2.5.
    This change is mainly a precaution to acknowledge that those older versions are not tested as part of development and could be broken by future updates (it also fulfills a request from addons.thunderbird.net).

- 2.2.5:

  - Do not capture keys in the quick search box in Thunderbird 128+

- 2.2.4:

  - Do not capture keys in the quick search box on Thunderbird 115+

- 2.2.3:

  - Mark tbkeys-list as supporting Thunderbird 115
  - Update references to Services API to be compatible with Thunderbird 117
  - Do not capture keys in the search box of Thunderbird 113+

- 2.2.2:

  - Mark tbkeys-lite as supporting Thunderbird 102.\* instead of 103.0.
    This specification is preferred by addons.thunderbird.net.
    It does not correspond to the actual maximum verison for which tbkeys works.

- 2.2.1:

  - Mark tbkeys-lite as supporting Thunderbird 103

- 2.2.0:

  - Support for sending messages to other extensions

- 2.1.4:

  - Do not capture keys in the text fields of the New Event tab

- 2.1.3:

  - Do not capture keys in Thunderbird's builtin web browser

- 2.1.2:

  - Code changes to avoid tbkeys failing to load on startup

- 2.1.1:

  - Fix keys being captured in some textboxes like the signature box in settings.

- 2.1.0:
  - Support for key bindings in the compose window
  - New lite packaging of the xpi without `eval()` support
  - Command types `cmd`, `func`, `tbkeys`, and `unset` for simpler settings syntax
  - Button to unset single key shortcuts
  - Button to reset to default settings
  - Fix keys being captured in chat input on Thunderbird 68
  - More documentation, including listing recipes for some requested functions
