# How to customize Quiz Deck

This guide is for anyone who wants to host their own trivia night with friends using this deck.

You only need to edit **`quiz-data.json`** (and optionally add images). You do **not** need to change `app.js` for normal question edits.

---

## 1. Before you start

1. Open the project folder in any text editor (VS Code / Cursor / Notepad++).
2. Open **`quiz-data.json`**.
3. Prefer a JSON-aware editor so missing commas show as errors.
4. After saving, refresh the site (GitHub Pages or your local server).

### Validate your JSON

Paste `quiz-data.json` into https://jsonlint.com if the quiz fails to load.

Common mistakes:

- Trailing comma after the last item in a list
- Unescaped quotes inside strings → use `\"`
- Smart quotes (`“ ”`) instead of straight quotes (`"`)

---

## 2. Markup rules used in text

| In JSON text | On screen |
|---|---|
| `*this phrase*` | **bold + underlined** |
| Standalone `X` or `Xs` (Find My Ex round) | Highlighted in cyan |

Example:

```json
"prompt": "Originating in boxing, *this phrase* now describes escaping trouble..."
```

---

## 3. Image paths

Put files under `Images for Deck/` (any subfolder is fine).

In JSON, use paths relative to the project root with forward slashes:

```json
"promptImages": ["Images for Deck/MyPhoto.jpg"]
```

---

## 4. Round types

Top level looks like:

```json
{
  "rounds": [
    { "id": "round-1", "name": "Cards of Common Knowledge", "type": "jeopardy", "...": "..." },
    { "id": "round-2", "name": "The Price Is Right", "type": "price", "...": "..." },
    { "id": "round-3", "name": "Answer or Eliminate", "type": "mcq", "...": "..." },
    { "id": "round-4", "name": "Find My Ex", "type": "ex", "...": "..." }
  ]
}
```

| `type` | What it is |
|---|---|
| `jeopardy` | Category grid with point values |
| `price` | Product / price items (no hints) |
| `mcq` | Multiple choice (text or image options) |
| `ex` | Progressive clues (Next clue / Back / Reveal) |

Keep each round `id` unique (e.g. `round-1`, `round-2`).

---

## 5. Jeopardy question (`type: "jeopardy"`)

```json
{
  "id": "my-category",
  "name": "My Category",
  "questions": [
    {
      "points": 10,
      "prompt": "Question text with *emphasis* here",
      "hint": "Shown only after Show hint",
      "answer": "The answer",
      "promptImages": ["Images for Deck/optional-clue.jpg"],
      "answerImage": "Images for Deck/optional-answer.jpg",
      "hintImage": "Images for Deck/optional-hint.jpg"
    }
  ]
}
```

Also set on the round:

```json
"pointValues": [10, 20, 30, 40]
```

---

## 6. Price Is Right item (`type: "price"`)

```json
{
  "id": "price-9",
  "number": 9,
  "title": "My item title",
  "prompt": "What is the price of ...",
  "promptImages": ["Images for Deck/The Price Is Right/item.jpg"],
  "promptList": ["Optional bullet 1", "Optional bullet 2"],
  "answer": "12.50 Euro",
  "answerBreakdown": ["Optional line with detail (3.00)"]
}
```

No hints on this round — only Reveal answer.

---

## 7. Multiple choice (`type: "mcq"`)

Hide “explanation numbers” from options; put them in `answerKey` so they only appear on reveal.

```json
{
  "id": "my-q",
  "number": 1,
  "title": "Catchy board title",
  "prompt": "Which option is correct?",
  "options": [
    { "key": "A", "text": "Option A text only" },
    { "key": "B", "text": "Option B text only" },
    { "key": "C", "image": "Images for Deck/Answer or Eliminate/logo-c.jpeg" }
  ],
  "answer": "C",
  "answerKey": [
    "A: Full A explanation",
    "B: Full B explanation",
    "C: Full C explanation"
  ]
}
```

For image options: **only the image is shown** (plus A/B/C/D/E). Do not put brand names in the option text if that would spoil the puzzle.

---

## 8. Find My Ex clues (`type: "ex"`)

```json
{
  "id": "fme-5",
  "number": 5,
  "clues": [
    { "text": "Clue 1 about X" },
    { "text": "Clue 2 about X" },
    {
      "text": "Clue 3 with a photo of X",
      "image": "Images for Deck/Find my Ex/person.jpg",
      "imageAlign": "right"
    },
    { "text": "Clue 4" },
    { "text": "Clue 5" }
  ],
  "answer": "X = \"Something\"",
  "answerImage": "Images for Deck/Find my Ex/answer.jpg"
}
```

Clue 1 is visible immediately. **Next clue** reveals the next one; previous clues stay visible. **Back** hides the latest clue again.

---

## 9. Suggested workflow for a friends night

1. Duplicate the repo (Fork on GitHub, or download ZIP).
2. Edit `quiz-data.json` with your questions.
3. Drop images into `Images for Deck/`.
4. Test locally with `python -m http.server 8765`.
5. Push to GitHub and turn on Pages.
6. Share the Pages link in your group chat.
7. Host scores manually — the deck only displays content.

---

## 10. Resetting during play

- **Reset board** (inside a round): clears opened cards for that round only.
- **Reset All** (home screen): clears opened cards for every round.

Opened/unopened state is stored in the browser (`localStorage`), not in the JSON file.
