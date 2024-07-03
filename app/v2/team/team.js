const queryData = require("../../helper/query");

const getNationality = (countryId, tournamentId = null) => {
  var whereTournament = "";

  if (tournamentId) {
    whereTournament = `AND ss_team.tournament_id=${tournamentId}`;
  }

  var query = `
    SELECT ss_team.country_id, ss_team.team_id, ss_team.team_name_th, ss_team.team_name_en, ss_team.team_logo,
    ss_team.tournament_id, ss_tournament.tournament_name_th, ss_tournament.tournament_name_en, ss_tournament.url,
    ss_tournament.dimension
    FROM ss_team
    LEFT JOIN ss_tournament ON ss_team.tournament_id=ss_tournament.tournament_id
    WHERE ss_team.country_id=${countryId}
    AND ss_team.is_national=1
    ${whereTournament}
    LIMIT 1`;

  return queryData
    .get(query)
    .then(result => result)
    .catch(error => error);
};

const getByTournament = tournamentId => {
  var query = `
  SELECT tm.team_id, team_name_th, team_name_en, team_logo
  FROM ss_tournament_team_mapping tm
  LEFT JOIN ss_team ON tm.team_id=ss_team.team_id
  WHERE tm.tournament_id=${tournamentId}
  ORDER BY team_name_en`;

  return queryData
    .get(query)
    .then(result => result)
    .catch(error => error);
};

const getPlayers = (teamId, tournamentId) => {
  var query = `SELECT player_id, position_id, position_name, common_name,
	firstname_th, lastname_th, birthdate, weight, height, player_no, number, image
	FROM ss_view_team_player
  WHERE team_id = ${teamId}
  AND tournament_id=${tournamentId}
  AND status = 1
  ORDER BY position_id ASC, number`;

  return queryData
    .get(query)
    .then(result => result)
    .catch(error => error);
};

const getCoach = (teamId, tournamentId) => {
  var query = `SELECT DISTINCT ss_coach.coach_id, coach_name_th, coach_name_en, 
  ss_coach.country_id, ss_country.name as nationality, coach_birthdate, coach_image
  FROM ss_coach
  LEFT JOIN ss_view_team_player ON ss_coach.coach_id=ss_view_team_player.coach_id
  LEFT JOIN ss_country ON ss_coach.country_id=ss_country.country_id
  WHERE ss_view_team_player.team_id = ${teamId}
  AND ss_view_team_player.tournament_id=${tournamentId}
  AND ss_coach.status = 1`;

  return queryData
    .get(query)
    .then(result => result)
    .catch(error => {
      throw error;
    });
};

const getDetail = teamId => {
  var query = `SELECT team_name_th, team_name_en, team_logo, picture as team_info_picture, team_info
  FROM ss_team
  WHERE team_id=${teamId} 
  AND status=1`;

  return queryData
    .get(query)
    .then(result => result)
    .catch(error => error);
};

module.exports = {
  getNationality,
  getByTournament,
  getPlayers,
  getCoach,
  getDetail
};
