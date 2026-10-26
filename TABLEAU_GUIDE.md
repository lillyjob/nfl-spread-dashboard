# Tableau build guide: NFL cover-rate dashboard

Build this in Tableau Public (the free desktop app, or web authoring) from `data/nfl_team_games.csv`. Tableau menus change between versions; **when a step does not match your screen, trust the screen** and look for the same command by name. The number after each worksheet is what it must show at the default filters (every season, all teams, All roles, All sites). Check each one against the website before you format anything.

The four sentences this build answers:

- **Question:** Which NFL teams beat the point spread most often since 2015, and does that record hold from one season to the next?
- **Reader:** A sportsbook risk manager deciding which teams' lines need the most scrutiny.
- **Rows counted:** One row is one team in one regular-season game with a posted spread (pushes and pick'em games removed).
- **Period:** The 2015 through 2025 regular seasons.

## 1. Connect to the data

1. Open Tableau Public, choose **Connect > Text file** (or **Files > Text file**), and select `nfl_team_games.csv`.
2. On the Data Source tab, check that the preview shows **5,586 rows** and these fields: `game_id, season, week, date, team, team_id, opponent, opponent_id, site, role, team_score, opp_score, margin, team_spread, cover_margin, spread_miss, covered, result, over_under`.
3. Set data types: `season`, `week`, `covered`, `spread_miss`, `margin`, `cover_margin`, `team_spread` are numbers; `date` is a date; the rest are strings.
4. Open a worksheet. In the Data pane, right-click `season` and choose **Convert to Dimension** (keep it a number). `covered` and `spread_miss` stay as measures.
5. Do not add any filter on the data source. Every rule (2015 to 2025, regular season, no pushes) is already in the file.

## 2. Calculated fields

Create each with **Analysis > Create Calculated Field** (or right-click in the Data pane). Use these names exactly: they are the labels on the website.

| Name | Formula | Serves |
|---|---|---|
| `Team-games counted` | `COUNT([game_id])` | Summary number 1 |
| `Underdog cover rate` | `AVG(IF [role] = "Underdog" THEN [covered] END)` | Summary number 2, season chart, group chart |
| `Home cover rate` | `AVG(IF [site] = "Home" THEN [covered] END)` | Summary number 3, season chart, group chart |
| `Average miss vs. spread (points)` | `AVG([spread_miss])` | Summary number 4 |
| `Cover rate` | `AVG([covered])` | Team chart |
| `Favorite cover rate` | `AVG(IF [role] = "Favorite" THEN [covered] END)` | Group chart |
| `Away cover rate` | `AVG(IF [site] = "Away" THEN [covered] END)` | Group chart |
| `Prior-season cover rate` | `IF LOOKUP(COUNT([game_id]), -1) >= 5 AND COUNT([game_id]) >= 5 THEN LOOKUP(AVG([covered]), -1) END` | Persistence chart (x axis) |

How they work: `covered` is 1 when the team beat the spread and 0 otherwise, so its average is the cover rate. `IF ... THEN [covered] END` returns nothing for other rows, and `AVG` skips them, so each field averages only its own group. `Prior-season cover rate` is a table calculation: right-click it on the sheet, choose **Edit Table Calculation**, and set **Compute using > Season** (specific dimension), with Team as the only other field on the view. It needs at least 5 games in both seasons, the same rule as the website.

## 3. Worksheets

For every sheet: set the title (double-click the sheet title) to the one given, format numbers as shown, and label the axes in plain words.

**Sheets 1 to 4: the four summary numbers.** One sheet each, with the field dragged to **Text** on the Marks card (nothing on Rows or Columns). Right-click the field, **Format > Numbers**, and set the format. Title the sheet with the label.

| Step | Sheet title | Field | Number format | Must show |
|---|---|---|---|---|
| 1 | Team-games counted | `Team-games counted` | Number (Custom), 0 decimals, thousands separator | **5,586** |
| 2 | Underdog cover rate | `Underdog cover rate` | Percentage, 1 decimal | **51.0%** |
| 3 | Home cover rate | `Home cover rate` | Percentage, 1 decimal | **48.6%** |
| 4 | Average miss vs. spread (points) | `Average miss vs. spread (points)` | Number, 1 decimal | **10.1** |

Stop here and compare these four with the website before building anything else. If one differs, the formula is wrong; fix it first.

**Step 5: Cover rate by team.** Drag `team` to **Rows** and `Cover rate` to **Columns**. On the Marks card choose **Circle**. Sort `team` descending by `Cover rate` (click the sort icon on the axis). Add a reference line at 0.5: right-click the `Cover rate` axis, **Add Reference Line**, Scope **Entire Table**, Value **Constant 0.5**, label "50%", dashed. Format the axis as a percentage with 0 decimals. Title: "Cover rate by team, 2015-2025".

Must show 32 circles. Top and bottom, then the rest in order:

| Team | Team-games | Cover rate |
|---|---|---|
| Bengals | 171 | 57.3% |
| Vikings | 173 | 57.2% |
| Steelers | 173 | 56.1% |
| Patriots | 174 | 54.6% |
| Lions | 177 | 54.2% |
| Saints | 178 | 53.4% |
| Packers | 176 | 52.8% |
| Rams | 175 | 52.6% |
| Bills | 172 | 52.3% |
| Cowboys | 176 | 52.3% |
| Ravens | 169 | 52.1% |
| Chiefs | 177 | 51.4% |
| Dolphins | 176 | 51.1% |
| Seahawks | 171 | 50.9% |
| Chargers | 175 | 50.9% |
| Eagles | 178 | 50.0% |
| Colts | 175 | 49.7% |
| Washington | 175 | 49.7% |
| Cardinals | 176 | 49.4% |
| Giants | 173 | 49.1% |
| Raiders | 176 | 48.9% |
| Jaguars | 174 | 48.9% |
| Buccaneers | 172 | 48.3% |
| 49ers | 178 | 47.8% |
| Broncos | 176 | 47.7% |
| Bears | 170 | 47.6% |
| Texans | 172 | 47.1% |
| Panthers | 177 | 46.9% |
| Titans | 175 | 44.6% |
| Falcons | 177 | 44.1% |
| Jets | 173 | 42.2% |
| Browns | 176 | 39.2% |

**Step 6: Cover rate by season.** Drag `season` to **Columns** (discrete, blue pill). Drag `Underdog cover rate` to **Rows**, then drag `Home cover rate` next to it on Rows, and put both on one axis (drag the second onto the first axis, or use **Measure Values** and keep only these two). Mark type **Line** with circles. Add a reference line at 0.5. Format as percentage, 1 decimal. Title: "Cover rate by season". Must show:

| Season | Underdog cover rate | Home cover rate | Average miss (points) |
|---|---|---|---|
| 2015 | 55.0% | 46.4% | 10.6 |
| 2016 | 48.0% | 49.6% | 9.3 |
| 2017 | 48.0% | 51.5% | 10.7 |
| 2018 | 54.0% | 48.6% | 10.3 |
| 2019 | 53.4% | 43.8% | 10.6 |
| 2020 | 54.4% | 49.8% | 10.0 |
| 2021 | 51.5% | 46.4% | 10.9 |
| 2022 | 54.0% | 50.2% | 9.0 |
| 2023 | 47.3% | 50.2% | 10.4 |
| 2024 | 44.9% | 48.8% | 9.9 |
| 2025 | 51.1% | 49.4% | 9.9 |

(The last column is for step 9.)

**Step 7: Cover rate by role and site.** Use **Measure Names / Measure Values**: drag `Measure Names` to **Rows** and `Measure Values` to **Columns**, then keep only `Favorite cover rate`, `Underdog cover rate`, `Home cover rate`, and `Away cover rate` in the Measure Values shelf and filter Measure Names to those four. Mark type **Bar**; add the reference line at 0.5 (Per Pane). Format as percentage, 1 decimal, and show the values as labels. Title: "Cover rate by role and site". Must show **49.0%, 51.0%, 48.6%, 51.4%** (Favorite, Underdog, Home, Away).

**Step 8: Does a cover rate carry over to the next season?** Drag `team` and `season` to **Detail** (both discrete). Drag `Prior-season cover rate` to **Columns** and `Cover rate` to **Rows**. Mark type **Circle**, with opacity near 60%. Add reference lines at 0.5 on both axes. Open **Analytics > Trend Line > Linear**, uncheck "Show confidence bands", and right-click the line to **Describe Trend Line**. Title: "Cover rate in a season against the next season".

Must show **320 circles** (Tableau reports 32 nulls in the lower right for the first season of each team; that is correct). The trend line must show a slope of **0.000** and R-squared of **0.000**, meaning a correlation of 0.00 (the website reports r = 0.000 on 320 pairs).

**Step 9 (optional): Average miss by season.** `season` on Columns, `Average miss vs. spread (points)` on Rows, line with circles. Must show the last column of the step 6 table.

## 4. The control

Build one control that changes several worksheets at once. Do this:

1. On any sheet that has `season` on Columns, right-click the `season` pill, choose **Show Filter**, and set it to **Range of Values**. (If `season` is only offered as discrete, set the filter type to **Multiple Values (dropdown)** instead.)
2. Click the filter's small arrow, choose **Apply to Worksheets > Selected Worksheets**, and tick all sheets except sheets 1 to 4 if you want them fixed at the full period. For the website's behavior, tick **all** of them.
3. Repeat for `team` (**Apply to Worksheets > Selected Worksheets**, tick every sheet **except Step 5**, which shows every team), `role`, and `site`. These give the same four filters as the website.

Test it: set the season range to 2020 to 2023. The four summary numbers must read **2,078, 51.8%, 49.1%, 10.1**. Set the team to Browns with all seasons: **176, 38.8%, 43.7%, 9.4**. Reset both afterwards.

## 5. The dashboard

1. Create a new dashboard (**Dashboard > New Dashboard**), set the size to **Automatic** (or Range with a minimum of 1000 by 900).
2. Add a **Text** object at the top as the title: "Which NFL teams beat the point spread most often, and does it carry over to the next season? One row is one team in one regular-season game, 2015-2025."
3. Under it, place sheets 1 to 4 in one horizontal row. Keep their titles visible.
4. Add one more **Text** object with the finding as one sentence: "A team's cover rate in one season says nothing about the next: the correlation is 0.00 across 320 team-seasons, and only the Browns and Jets sit clearly away from 50%."
5. Below, place the team chart (step 5) on the left and the season chart (step 6) and group chart (step 7) on the right, then the persistence chart (step 8).
6. Show the filters (season, team, role, site) by clicking the arrow on a sheet and choosing the filters in the **Filters** menu; float or stack them at the side. Make sure each filter is set as in section 4.
7. Click each filter and check that every chart that should respond does.

## 6. Publish

**File > Save to Tableau Public As...**, sign in, name it "NFL spread cover-rate dashboard", and submit the link. Open the link in a private window to confirm that it works without signing in. Then put the four numbers from the live dashboard into `app.js` (`TABLEAU_NUMBERS` and `TABLEAU_URL`) so the report page's agreement table fills in.
