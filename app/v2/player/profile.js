const queryData = require("../../helper/query");

const getProfile = playerId => {
  var query = `SELECT player_id, common_name, firstname_th, lastname_th, firstname_en, lastname_en, position_th, position_en, 
    birthdate, (YEAR(CURRENT_DATE) - YEAR(birthdate)) as age, height, weight, ss_country.country_id, ss_country.name as country_name_en, image,
    ss_country.th as country_name_th 
    FROM ss_player 
    LEFT JOIN ss_player_position ON ss_player.position_id=ss_player_position.position_id 
    LEFT JOIN ss_country ON ss_player.nationallity_count_id=ss_country.country_id
    WHERE player_id=${playerId}`;

  return queryData
    .get(query)
    .then(result => result)
    .catch(error => {
      throw error;
    });
};

const getNationality = playerId => {};

const getStats = (playerId, tournamentId) => {
  var query = `SELECT SUM(ss_match_player_stat.apps) as apps, SUM(ss_match_player_stat.in) as starter,
    SUM(sub) AS sub, SUM(goals) as goals, SUM(assists) as assists, SUM(yellow_card) as yellow_card,
    SUM(red_card) as red_card
    FROM ss_match_player_stat
    WHERE match_id in (SELECT match_id from ss_match WHERE tournament_id=${tournamentId})
    AND player_id=${playerId}
    GROUp BY player_id`;

  return queryData
    .get(query)
    .then(result => result)
    .catch(error => {
      throw error;
    });
};

const getStatsDetail = (playerId, tournamentId, eventType) => {
  var whereCondition1 = "";
  var whereCondition2 = "";

  if (eventType == "goal") {
    whereCondition1 = `ss_match_event.player1_id=${playerId} OR ss_match_event.player2_id=${playerId}`;
    whereCondition2 = `AND ss_match_event.event_type_id IN (1,8,11)`;
  } else {
    whereCondition1 = `ss_match_event.player1_assist_id=${playerId} OR ss_match_event.player2_assist_id=${playerId}`;
  }

  // **** old query
  // var query = `
  // SELECT ss_match_event.match_id, ss_match_event.event_type_id, ss_match_event.minutes,
  //   ss_match.home_id, team1.team_name_th as home_team_th, team1.team_name_en as home_team_en, team1.team_logo as home_team_logo,
  //   ss_match.away_id, team2.team_name_th as away_team_th, team2.team_name_en as away_team_en, team2.team_logo as away_team_logo,
  //   ss_match.ft_home_score, ss_match.ft_away_score
  // FROM ss_match_event
  // LEFT JOIN ss_match ON ss_match_event.match_id=ss_match.match_id
  // LEFT JOIN ss_team team1 ON ss_match.home_id=team1.team_id
  // LEFT JOIN ss_team team2 ON ss_match.away_id=team2.team_id
  // WHERE (
  //   ${whereCondition1}
  // )
  // AND ss_match_event.match_id IN (
  //   SELECT ss_match_player_stat.match_id
  //   FROM ss_match_player_stat
  //   WHERE ss_match_player_stat.match_id IN (
  //         SELECT match_id FROM ss_match WHERE tournament_id=${tournamentId}
  //   )
  //   AND ss_match_player_stat.player_id=${playerId}
  // )
  // ${whereCondition2}
  // ORDER BY ss_match_event.match_id
  // `;

  var query = `
  SELECT ss_match_event.match_id, ss_match_event.event_type_id, ss_match_event.minutes,
    ss_match.home_id, team1.team_name_th as home_team_th, team1.team_name_en as home_team_en, team1.team_logo as home_team_logo, 
    ss_match.away_id, team2.team_name_th as away_team_th, team2.team_name_en as away_team_en, team2.team_logo as away_team_logo,
    ss_match.ft_home_score, ss_match.ft_away_score
  FROM ss_match_event
  LEFT JOIN ss_match ON ss_match_event.match_id=ss_match.match_id
  LEFT JOIN ss_team team1 ON ss_match.home_id=team1.team_id
  LEFT JOIN ss_team team2 ON ss_match.away_id=team2.team_id
  WHERE (
    ${whereCondition1}
  )
  AND ss_match_event.tournament_id=${tournamentId}
  ${whereCondition2}
  ORDER BY ss_match_event.match_id
  `;

  return queryData
    .get(query)
    .then(result => result)
    .catch(error => {
      throw error;
    });
};

module.exports = {
  getProfile,
  getStats,
  getStatsDetail
};
