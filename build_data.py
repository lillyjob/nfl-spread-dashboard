"""Reshape spreadspoke_scores.csv (one row per game) into one row per team per game.

Rows kept: regular-season games, 2015-2025 seasons, with a posted spread and a
named favorite. Dropped: playoff games, pick'em games (no favorite), pushes.
Run from the repository root:  python3 build_data.py
Writes data/nfl_team_games.csv and prints the row counts quoted in the report.
"""
import json
import pandas as pd

SRC = "data/source/spreadspoke_scores.csv"
TEAMS = "data/source/nfl_teams.csv"
OUT = "data/nfl_team_games.csv"

g = pd.read_csv(SRC)
t = pd.read_csv(TEAMS)

# franchise id and short label for every historical team name
name_to_id = dict(zip(t.team_name, t.team_id))
id_to_label = {}
for _, r in t.iterrows():
    id_to_label[r.team_id] = r.team_name_short  # latest short name wins below
# prefer the current name for relocated franchises
for tid, lab in {"LVR": "Raiders", "LAC": "Chargers", "LAR": "Rams", "WAS": "Washington",
                 "ARI": "Cardinals", "IND": "Colts", "TEN": "Titans", "NE": "Patriots"}.items():
    id_to_label[tid] = lab

counts = {"all_rows_in_file": len(g)}
g = g[(g.schedule_season >= 2015) & (g.schedule_season <= 2025)]
counts["games_2015_2025"] = len(g)
g = g[~g.schedule_playoff]
counts["regular_season_games"] = len(g)
counts["dropped_missing_spread"] = int(g.spread_favorite.isna().sum())
g = g[g.spread_favorite.notna()]
pick = g.team_favorite_id.eq("PICK")
counts["dropped_pickem_no_favorite"] = int(pick.sum())
g = g[~pick].copy()

g["home_id"] = g.team_home.map(name_to_id)
g["away_id"] = g.team_away.map(name_to_id)
assert g.home_id.notna().all() and g.away_id.notna().all()
assert g.team_favorite_id.isin(g.home_id).__or__(g.team_favorite_id.isin(g.away_id)).all()
# favorite must be one of the two teams in the game
assert ((g.team_favorite_id == g.home_id) | (g.team_favorite_id == g.away_id)).all()

g["game_id"] = range(1, len(g) + 1)
g["date"] = pd.to_datetime(g.schedule_date, format="%m/%d/%Y").dt.strftime("%Y-%m-%d")

rows = []
for _, r in g.iterrows():
    for side in ("home", "away"):
        me = r.home_id if side == "home" else r.away_id
        opp = r.away_id if side == "home" else r.home_id
        my_score = r.score_home if side == "home" else r.score_away
        opp_score = r.score_away if side == "home" else r.score_home
        spread = r.spread_favorite if me == r.team_favorite_id else -r.spread_favorite
        margin = my_score - opp_score
        cover_margin = margin + spread
        site = "Neutral" if r.stadium_neutral else ("Home" if side == "home" else "Away")
        ou = r.over_under_line
        rows.append(dict(
            game_id=r.game_id, season=int(r.schedule_season), week=int(r.schedule_week), date=r.date,
            team=id_to_label[me], team_id=me, opponent=id_to_label[opp], opponent_id=opp,
            site=site, role="Favorite" if me == r.team_favorite_id else "Underdog",
            team_score=int(my_score), opp_score=int(opp_score), margin=int(margin),
            team_spread=spread, cover_margin=cover_margin,
            result="Push" if cover_margin == 0 else ("Cover" if cover_margin > 0 else "No cover"),
            over_under=ou if pd.notna(ou) and str(ou).strip() != "" else "",
        ))
d = pd.DataFrame(rows)
pushes = d[d.result == "Push"]
counts["dropped_push_team_rows"] = len(pushes)
counts["dropped_push_games"] = len(pushes) // 2
d = d[d.result != "Push"].copy()
d["covered"] = (d.result == "Cover").astype(int)
d["spread_miss"] = d.cover_margin.abs()
d = d[["game_id", "season", "week", "date", "team", "team_id", "opponent", "opponent_id", "site", "role",
       "team_score", "opp_score", "margin", "team_spread", "cover_margin", "spread_miss", "covered", "result",
       "over_under"]]
d.to_csv(OUT, index=False)
counts["final_rows"] = len(d)
counts["teams"] = int(d.team.nunique())
counts["seasons"] = int(d.season.nunique())

print(counts)
