# NASH OS HF29 — Performance & Responsive Runtime

Built directly on HF28.

## Implemented
- Batched the visible-button mutation audit to one animation frame, preventing repeated full-page scans during rapid DOM updates.
- Added render-duration telemetry without exposing technical panels to normal users.
- Applied lazy loading and asynchronous decoding to images.
- Added viewport-aware CSS rendering through `content-visibility` and intrinsic sizing.
- Added reusable input/resize debounce support.
- Improved tablet and mobile workspace density and action sizing.
- Preserved MySQL source-of-truth and made no schema, migration, seed, or reset change.
