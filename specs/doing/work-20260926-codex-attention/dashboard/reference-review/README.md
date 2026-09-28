# Terminal Reference Screen artwork

This is a proposed static image set for the approved agent attention flow. example-data.json is synthetic; design-system.json supplies shared colors, dimensions and font choices; terminal-scenes.json supplies the drawing primitives; screen-inventory.json records each image, digest, viewport and privacy mask.

Regenerate from this directory:

```sh
python3 source/prepare-terminal-scenes.py
swift -module-cache-path "$TASK_SWIFT_CACHE" source/render-terminal-reference.swift terminal-scenes.json screens
```

Refresh image digests after regeneration before presenting a changed set. spec.md indexes all eight PNGs and states the approval scope and evidence limits. The artwork illustrates opening cached rows, choosing a row, viewing its pending details and recovering from a failed pane verification. It does not implement these transitions. No runtime behavior or user approval is claimed.
