# Sheet

A small Excel-like spreadsheet that runs entirely in the browser (no build step, no dependencies).

- Ribbon with File / Home / Insert tabs; 26 columns x 100 rows; formula bar; auto-save in the browser
- Home: undo/redo, copy/cut/paste, font, size, bold/italic/underline, text and fill color, alignment, number formats, borders
- Insert: table style, charts (column, bar, line, pie) from selected cells, checkbox, link, comment, symbols
- Multiple sheets (tabs at the bottom); formulas work within one sheet
- Formulas: operators `+ - * / ^ & % = <> < > <= >=`, cell refs, ranges, text, TRUE/FALSE, errors (#DIV/0!, #N/A, #VALUE!...)
- About 200 functions: math, statistical, text, logical, lookup, date, financial, information, database, engineering, dynamic arrays (results spill into neighbouring cells), plus compatibility names like CONCATENATE and STDEV.S
- Not included: Cube functions and WEBSERVICE (need an OLAP server / cross-site requests). Functions live in `formulas.js` (`FN` table) so you can add more.
- Open and save CSV
- Keys: arrows (Shift to select a range), Enter/F2 or typing to edit, Tab/Enter to commit, Delete to clear, Ctrl+Z/Y undo/redo, Ctrl+C/X/V, Ctrl+B/I/U

## Deploy on GitHub
1. Create a new repository and push these files to the `main` branch.
2. In the repo go to Settings > Pages and set Source to "GitHub Actions".
3. Your site goes live at `https://<user>.github.io/<repo>/`.
