# Dialog automation verification

In the Browser Example command palette, first run:

`Dialog Automation: Open Complex Test Dialog`

The application opens and keeps a composite dialog visible. Click its
`Run Plugin Automation` button to activate the plugin. Only then does the
plugin obtain the already-open top-most dialog, read its normalized snapshot
and structured state, invoke Reset, write a complete state, confirm the dialog,
and ask the application for the state it actually accepted. Detailed results
are written to the
`Dialog Automation Verification` output channel.
