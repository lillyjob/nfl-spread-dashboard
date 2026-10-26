# Do NFL teams beat the point spread, and does it last?

Project B for FINN 43303, Financial Data Analytics II. A two-page website and a Tableau Public dashboard answer one question.

- **Question:** Which NFL teams beat the point spread most often since 2015, and does that record hold from one season to the next?
- **Reader:** A sportsbook risk manager deciding which teams' lines need the most scrutiny.
- **Rows counted:** One row is one team in one regular-season game with a posted spread. Playoff games, pick'em games (no favorite), and pushes (margin equals the spread) are dropped.
- **Period:** The 2015 through 2025 regular seasons (5,586 rows, 32 teams, 11 seasons).

## Files

| File | What it is |
|---|---|
| `index.html` | The report page: answer, four summary numbers, four findings with charts, the data section, and the agreement table. |
| `dashboard.html` | The dashboard page: filters for season, team, role and site, the same four numbers, and four charts that change with the filters. |
| `style.css` | One look (colors, fonts, dark mode) shared by both pages. |
| `app.js` | Loads the data and holds every definition and statistic (cover rate, average miss, persistence). Also has the settings for the agreement table. |
| `charts.js` | Small SVG chart functions (dot plot, line, scatter, bars) and tooltips. |
| `report.js` | Fills the report page from the data file. |
| `dashboard.js` | Runs the filters and redraws the dashboard. |
| `data/nfl_team_games.csv` | The data file both pages load and Tableau connects to: one row per team per game. |
| `data/source/spreadspoke_scores.csv` | Original game file (one row per game, 1966 to 2025). |
| `data/source/nfl_teams.csv` | Original team lookup, used to map renamed and moved teams to one franchise. |
| `build_data.py` | Turns the two source files into `nfl_team_games.csv`. Run `python3 build_data.py` from the repository root. |
| `TABLEAU_GUIDE.md` | Step-by-step guide for rebuilding the dashboard in Tableau Public, with the values each worksheet must show. |
| `README.md` | This file. |

## Where the data come from

Kaggle, "NFL scores and betting data" (files `spreadspoke_scores.csv` and `nfl_teams.csv`). The file does not say whether each spread is an opening or closing line. There are no private individuals in the data.

## Definitions

- **Cover:** a team covers when its final margin plus its spread is above zero. The favorite's spread is negative and the underdog's is positive.
- **Underdog cover rate:** share of underdog rows that covered. **Home cover rate:** share of home rows that covered (neutral-site games excluded). **Average miss vs. spread:** average of |final margin + spread|, in points.

## Running it

The pages load the CSV with `fetch`, so open them from the published site or a local server (`python3 -m http.server`, then visit http://localhost:8000), not by double-clicking the file.

## After the Tableau dashboard is live

Open `app.js`, paste the Tableau Public link into `TABLEAU_URL`, and the four numbers shown in Tableau into `TABLEAU_NUMBERS`. The report's agreement table then fills in. If a number differs, add one sentence under the table on which build you kept and why.
