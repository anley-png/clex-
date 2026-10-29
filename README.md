# Sheet

A small Excel-like spreadsheet that runs entirely in the browser (no build step, no dependencies).

- 26 columns x 100 rows, formula bar, bold, auto-save in the browser
- Formulas: operators `+ - * / ^ & % = <> < > <= >=`, cell refs, ranges, text, TRUE/FALSE, errors (#DIV/0!, #N/A, #VALUE!...)
- About 200 functions: math, statistical, text, logical, lookup, date, financial, information, database, engineering, dynamic arrays (results spill into neighbouring cells), plus compatibility names like CONCATENATE and STDEV.S
- Not included: Cube functions and WEBSERVICE (need an OLAP server / cross-site requests). Functions live in `formulas.js` (`FN` table) so you can add more.
- Open and save CSV
- Keys: arrows to move, Enter/F2 or typing to edit, Tab/Enter to commit, Delete to clear, Ctrl+B bold

## Deploy on GitHub
1. Create a new repository and push these files to the `main` branch.
2. In the repo go to Settings > Pages and set Source to "GitHub Actions".
3. Your site goes live at `https://<user>.github.io/<repo>/`.
