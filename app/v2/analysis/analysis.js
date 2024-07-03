const queryData = require("../../helper/query");

let whereSTID = "";

const getByMatch = matchAnalysisId => {
  var query = `SELECT match_predit_id, compare_team1 as home_team, compare_team2 as away_team, probability_games, predictor
                            FROM ss_match_predictor
                            WHERE ss_match_predictor.match_predit_id=${matchAnalysisId}`;

  return queryData
    .get(query)
    .then(result => result)
    .catch(error => {
      throw error;
    });
};

const getByTournament = (tournamentId, stId = null) => {
  if (stId !== null) {
    let whereSTID = `AND ss_match.st_id=${stId}`;
  }

  var query = `SELECT ss_match.match_id, ss_match_predictor.match_predit_id as analysis,ss_match.tournament_id, 
                            ss_match.sport_id, ss_match.round, ss_match.match_number,
                            ss_match.home_id, ss_match.home_team, ss_match.away_id, ss_match.away_team,
                            ss_team1.team_name_en as home_team_name_en,
                            ss_team1.team_name_th as home_team_name_th, ss_team1.team_logo as home_team_logo,
                            ss_team2.team_name_en as away_team_name_en,
                            ss_team2.team_name_th as away_team_name_th, ss_team2.team_logo as away_team_logo,
                            ss_match.ht_home_score, ss_match.ht_away_score, ss_match.ft_home_score, ss_match.ft_away_score, 
                            ss_match.et_home_score, ss_match.et_away_score, ss_match.pen_home_score, ss_match.pen_away_score,
                            ss_match.match_date, ss_match.match_status, ss_match.tournament, ss_match.lives_tv, ss_match.stadium_id,
                            ss_stadium.stadium_name_th, ss_stadium.stadium_name_en, ss_match.status, ss_match_predictor.predictor,
                            ss_match.create_date, ss_match.lastupdate_date, ss_news.news_id2 as news_id
                            FROM ss_match
                            LEFT JOIN ss_team ss_team1 ON ss_match.home_id=ss_team1.team_id
                            LEFT JOIN ss_team ss_team2 ON ss_match.away_id=ss_team2.team_id
                            LEFT JOIN ss_stadium ON ss_match.stadium_id=ss_stadium.stadium_id
                            LEFT JOIN ss_match_predictor ON ss_match.match_id=ss_match_predictor.match_id
                            LEFT JOIN ss_news ON ss_match.match_id=ss_news.match_id
                            WHERE ss_match.tournament_id=${tournamentId}
                            ${whereSTID}
                            ORDER BY ss_match.match_date DESC, ss_match.match_number`;

  return queryData
    .get(query)
    .then(result => {
      var matchAnalysis = result.filter(match => match.analysis !== null);

      return matchAnalysis;
    })
    .catch(error => {
      throw error;
    });
};

module.exports = {
  getByMatch,
  getByTournament
};
