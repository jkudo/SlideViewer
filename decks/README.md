# decks/

Place your PowerPoint source files directly under `decks/`.

Supported files:
- `.ppt`
- `.pptx`

On GitHub Actions deployment, each source file is converted into:
- `decks/pdfs/<deck>.pdf`
- `decks/images/<deck>/<deck>-N.jpg`

These generated files are published in the Pages artifact, not committed to this repository.
