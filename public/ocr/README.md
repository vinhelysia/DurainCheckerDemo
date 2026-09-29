# OCR runtime assets

These raw same-origin assets are copied unchanged from the pinned npm packages.
Tesseract uses a classic worker and `importScripts`, so Vite must serve them without
module transforms. The portable LSTM core includes WebAssembly; no trained model
weights are stored here.

| File | Package source | License |
| --- | --- | --- |
| `tesseract-7.0.0-worker.min.js` | `tesseract.js@7.0.0/dist/worker.min.js` | `TESSERACT-LICENSE.md`, `worker.min.js.LICENSE.txt` |
| `tesseract-7.0.0-core-lstm.wasm.js` | `tesseract.js-core@7.0.0/tesseract-core-lstm.wasm.js` | `TESSERACT-CORE-LICENSE.txt` |

Upstream: <https://github.com/naptha/tesseract.js> and
<https://github.com/naptha/tesseract.js-core>.

On package upgrades, copy these two assets from the matching installed package,
update their versioned names and the URLs in `src/lib/documentReader.js`, and
verify an actual browser OCR run. Vietnamese and English model weights are
downloaded by Tesseract from the shared `4.0.0_best_int` folder of the official
<https://github.com/naptha/tessdata> repository, pinned at commit
`806cd9adc8c6e8abc11c782db1818c990576bebc` through jsDelivr. This permits the
documented string language API without the runtime's broken object language
initialization. Document bytes are processed locally.
