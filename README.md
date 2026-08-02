# Quiz Deck

A simple static trivia host deck for friends. Open rounds, reveal hints/answers, and score manually.

**Live play:** https://mrinal1702.github.io/quiz-deck/

**Local play:**

```bash
# from this folder
python -m http.server 8765
```

Then visit `http://127.0.0.1:8765/`

> Do not double-click `index.html` — the browser will block loading `quiz-data.json`. Use a local server or GitHub Pages.

## Customize your own trivia

All questions, hints, answers, options, and clues live in one file:

- **[`quiz-data.json`](quiz-data.json)** — edit this to change the quiz

Images go in:

- **`Images for Deck/`** (and subfolders)

Step-by-step guide:

- **[`HOW_TO_CUSTOMIZE.md`](HOW_TO_CUSTOMIZE.md)**

## Project files

| File / folder | Purpose |
|---|---|
| `index.html` | Page shell |
| `styles.css` | Look and layout |
| `app.js` | Navigation, reveal buttons, opened state |
| `quiz-data.json` | **Your questions** (edit this) |
| `Images for Deck/` | Images used by questions |
| `HOW_TO_CUSTOMIZE.md` | How to add/edit rounds and questions |

## Hosting on GitHub Pages

1. Push this repo to GitHub.
2. Repo **Settings → Pages → Source**: deploy from branch `main`, folder `/` (root).
3. Wait a minute, then open `https://<your-username>.github.io/<repo-name>/`

Anyone with the link can play. Edits to `quiz-data.json` go live after you push.
