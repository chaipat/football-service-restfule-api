const queryData = require("../../helper/query");
const helper = require("../../helper/helper");

let whereSTID = "";

const getByTeam = (teamId, tournamentId, stId = null) => {
  if (stId !== null) {
    let whereSTID = `AND ss_match.st_id=${stId}`;
  }

  var query = `SELECT ss_match.match_id, ss_match.tournament_id, ss_match.sport_id, ss_match.round, ss_match.match_number,
                            ss_match.home_id, ss_match.home_team, ss_match.away_id, ss_match.away_team,
                            ss_team1.team_name_en as home_team_name_en,
                            ss_team1.team_name_th as home_team_name_th, ss_team1.team_logo as home_team_logo,
                            ss_team2.team_name_en as away_team_name_en,
                            ss_team2.team_name_th as away_team_name_th, ss_team2.team_logo as away_team_logo,
                            ss_match.ht_home_score, ss_match.ht_away_score, ss_match.ft_home_score, ss_match.ft_away_score, 
                            ss_match.et_home_score, ss_match.et_away_score, ss_match.pen_home_score, ss_match.pen_away_score,
                            ss_match.match_date, ss_match.match_status, ss_match.tournament, ss_match.lives_tv, ss_match.stadium_id,
                            ss_stadium.stadium_name_th, ss_stadium.stadium_name_en, ss_match.status, ss_match.create_date, ss_match.lastupdate_date,
                            ss_match_predictor.match_predit_id as analysis, ss_news.news_id2 as news_id
                            FROM ss_match
                            LEFT JOIN ss_team ss_team1 ON ss_match.home_id=ss_team1.team_id
                            LEFT JOIN ss_team ss_team2 ON ss_match.away_id=ss_team2.team_id
                            LEFT JOIN ss_stadium ON ss_match.stadium_id=ss_stadium.stadium_id
                            LEFT JOIN ss_match_predictor ON ss_match.match_id=ss_match_predictor.match_id
                            LEFT JOIN ss_news ON ss_match.match_id=ss_news.match_id
                            WHERE ss_match.tournament_id=${tournamentId}
                            ${whereSTID}
                            AND (ss_team1.team_id=${teamId} OR ss_team2.team_id=${teamId})
                            ORDER BY ss_match.match_date DESC`;
  return queryData
    .get(query)
    .then(result => {
      // setup moment date
      helper.addMomentDate(result, "match_date");
      return result;
    })
    .catch(error => {
      throw error;
    });
};

const getByMatch = (matchId, stId = null) => {
  if (stId !== null) {
    let whereSTID = `AND ss_match.st_id=${stId}`;
  }

  var query = `SELECT ss_match.match_id, ss_match.tournament_id, ss_match.sport_id, ss_match.round, ss_match.match_number,
                            ss_match.home_id, ss_match.home_team, ss_match.away_id, ss_match.away_team,
                            ss_team1.team_name_en as home_team_name_en,
                            ss_team1.team_name_th as home_team_name_th, ss_team1.team_logo as home_team_logo,
                            ss_team2.team_name_en as away_team_name_en,
                            ss_team2.team_name_th as away_team_name_th, ss_team2.team_logo as away_team_logo,
                            ss_match.ht_home_score, ss_match.ht_away_score, ss_match.ft_home_score, ss_match.ft_away_score, 
                            ss_match.et_home_score, ss_match.et_away_score, ss_match.pen_home_score, ss_match.pen_away_score,
                            ss_match.match_date, ss_match.match_status, ss_match.tournament, ss_match.lives_tv, ss_match.stadium_id,
                            ss_stadium.stadium_name_th, ss_stadium.stadium_name_en, ss_match.status, ss_match.create_date, ss_match.lastupdate_date,
                            ss_match_predictor.match_predit_id as analysis
                            FROM ss_match
                            LEFT JOIN ss_team ss_team1 ON ss_match.home_id=ss_team1.team_id
                            LEFT JOIN ss_team ss_team2 ON ss_match.away_id=ss_team2.team_id
                            LEFT JOIN ss_stadium ON ss_match.stadium_id=ss_stadium.stadium_id
                            LEFT JOIN ss_match_predictor ON ss_match.match_id=ss_match_predictor.match_id
                            WHERE ss_match.match_id=${matchId}
                            ${whereSTID}`;

  return queryData
    .get(query)
    .then(result => {
      // setup moment date
      helper.addMomentDate(result, "match_date");
      return result;
    })
    .catch(error => {
      throw error;
    });
};

const getByTournament = (tournamentId, stId, round) => {
  // todo
};

const getByGroup = (tournamentId, stId, groupName) => {
  if (stId !== null) {
    let whereSTID = `AND ss_match.st_id=${stId}`;
  }

  var query = `
    SELECT ss_match.match_id, ss_match.tournament_id, ss_match.sport_id, ss_match.round, ss_match.match_number,
    ss_match.home_id, ss_match.home_team, ss_match.away_id, ss_match.away_team,
    ss_team1.team_name_en as home_team_name_en,
    ss_team1.team_name_th as home_team_name_th, ss_team1.team_logo as home_team_logo,
    ss_team2.team_name_en as away_team_name_en,
    ss_team2.team_name_th as away_team_name_th, ss_team2.team_logo as away_team_logo,
    ss_match.ht_home_score, ss_match.ht_away_score, ss_match.ft_home_score, ss_match.ft_away_score, 
    ss_match.et_home_score, ss_match.et_away_score, ss_match.pen_home_score, ss_match.pen_away_score,
    ss_match.match_date, ss_match.match_status, ss_match.tournament, ss_match.lives_tv, ss_match.stadium_id,
    ss_stadium.stadium_name_th, ss_stadium.stadium_name_en, ss_match.status, ss_match.create_date, ss_match.lastupdate_date,
    ss_match_predictor.match_predit_id as analysis, ss_news.news_id2 as news_id,
    ss_group.group_id, ss_group.group_name_th, ss_group.group_name_en
    FROM ss_match
    LEFT JOIN ss_team ss_team1 ON ss_match.home_id=ss_team1.team_id
    LEFT JOIN ss_team ss_team2 ON ss_match.away_id=ss_team2.team_id
    LEFT JOIN ss_stadium ON ss_match.stadium_id=ss_stadium.stadium_id
    LEFT JOIN ss_group ON ss_match.group_id=ss_group.group_id
    LEFT JOIN ss_match_predictor ON ss_match.match_id=ss_match_predictor.match_id
    LEFT JOIN ss_news ON ss_match.match_id=ss_news.match_id
    WHERE ss_match.tournament_id=${tournamentId}
    ${whereSTID}
    AND ss_match.group_id=(
        SELECT group_id
        FROM ss_group
        WHERE tournament_id=${tournamentId}
        AND group_name_en='Group ${groupName.toUpperCase()}'
    )
    ORDER BY match_date`;

  return queryData
    .get(query)
    .then(result => {
      // setup moment date
      if (result !== null) {
        helper.addMomentDate(result, "match_date");
      }
      return result;
    })
    .catch(error => {
      throw error;
    });
};

const getByDate = (tournamentId, stId = null, matchDate) => {
  if (stId !== null) {
    let whereSTID = `AND AND ss_match.st_id=${stId}`;
  }

  var query = `SELECT ss_match.match_id, ss_match.tournament_id, ss_match.sport_id, ss_match.round, ss_match.match_number,
                            ss_match.home_id, ss_match.home_team, ss_match.away_id, ss_match.away_team,
                            ss_team1.team_name_en as home_team_name_en,
                            ss_team1.team_name_th as home_team_name_th, ss_team1.team_logo as home_team_logo,
                            ss_team2.team_name_en as away_team_name_en,
                            ss_team2.team_name_th as away_team_name_th, ss_team2.team_logo as away_team_logo,
                            ss_match.ht_home_score, ss_match.ht_away_score, ss_match.ft_home_score, ss_match.ft_away_score, 
                            ss_match.et_home_score, ss_match.et_away_score, ss_match.pen_home_score, ss_match.pen_away_score,
                            ss_match.match_date, ss_match.match_status, ss_match.tournament, ss_match.lives_tv, ss_match.stadium_id,
                            ss_stadium.stadium_name_th, ss_stadium.stadium_name_en, ss_match.status, ss_match.create_date, ss_match.lastupdate_date,
                            ss_match_predictor.match_predit_id as analysis
                            FROM ss_match
                            LEFT JOIN ss_team ss_team1 ON ss_match.home_id=ss_team1.team_id
                            LEFT JOIN ss_team ss_team2 ON ss_match.away_id=ss_team2.team_id
                            LEFT JOIN ss_stadium ON ss_match.stadium_id=ss_stadium.stadium_id
                            LEFT JOIN ss_match_predictor ON ss_match.match_id=ss_match_predictor.match_id
                            WHERE ss_match.tournament_id=${tournamentId}
                            ${whereSTID}
                            AND DATE(ss_match.match_date)='${matchDate}'
                            ORDER BY ss_match.match_number;`;

  return queryData
    .get(query)
    .then(result => {
      // setup moment date
      if (result !== null) {
        helper.addMomentDate(result, "match_date");
      }
      return result;
    })
    .catch(error => {
      throw error;
    });
};

const getDayMatch = (tournamentId, stId = null) => {
  if (stId !== null) {
    let whereSTID = `AND ss_match.st_id=${stId}`;
  }

  var query = `
    SELECT DATE(match_date) as matchDate
    FROM ss_match 
    WHERE tournament_id=${tournamentId} 
    ${whereSTID}
    GROUP BY DATE(match_date) `;

  return queryData
    .get(query)
    .then(result => {
      return result;
    })
    .catch(error => {
      throw error;
    });
};

const getKnockOut = (tournamentId, stId) => {
  var query = `
    SELECT ss_match.position, ss_match.match_id, ss_match.tournament_id, ss_match.sport_id, ss_match.round, ss_match.match_number,
    ss_match.home_id, ss_match.home_team, ss_match.away_id, ss_match.away_team,
    ss_team1.team_name_en as home_team_name_en,
    ss_team1.team_name_th as home_team_name_th, ss_team1.team_logo as home_team_logo,
    ss_team2.team_name_en as away_team_name_en,
    ss_team2.team_name_th as away_team_name_th, ss_team2.team_logo as away_team_logo,
    ss_match.ht_home_score, ss_match.ht_away_score, ss_match.ft_home_score, ss_match.ft_away_score, 
    ss_match.et_home_score, ss_match.et_away_score, ss_match.pen_home_score, ss_match.pen_away_score,
    ss_match.match_date, ss_match.match_status, ss_match.tournament, ss_match.lives_tv, ss_match.stadium_id,
    ss_stadium.stadium_name_th, ss_stadium.stadium_name_en, ss_match.status, ss_match.create_date, ss_match.lastupdate_date,
    ss_match_predictor.match_predit_id as analysis, ss_news.news_id2 as news_id
    FROM ss_match
    LEFT JOIN ss_team ss_team1 ON ss_match.home_id=ss_team1.team_id
    LEFT JOIN ss_team ss_team2 ON ss_match.away_id=ss_team2.team_id
    LEFT JOIN ss_stadium ON ss_match.stadium_id=ss_stadium.stadium_id
    LEFT JOIN ss_match_predictor ON ss_match.match_id=ss_match_predictor.match_id
    LEFT JOIN ss_news ON ss_match.match_id=ss_news.match_id
    WHERE ss_match.tournament_id=${tournamentId}
    AND ss_match.st_id=${stId}
    AND ss_match.round IN (2,3,4,5)
    ORDER BY ss_match.round, ss_match.position, ss_match.match_number`;

  return queryData
    .get(query)
    .then(result => {
      return result;
    })
    .catch(error => {
      throw error;
    });
};

module.exports = {
  getByTeam,
  getByMatch,
  getByGroup,
  getByDate,
  getDayMatch,
  getKnockOut
};
