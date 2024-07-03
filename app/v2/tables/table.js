const queryData = require("../../helper/query");

const getByTournament = (tournamentID, group) => {
  var whereGroup = "";

  if (group !== "all") {
    whereGroup = `AND ss_group.group_name_en = 'Group ${group.toUpperCase()}'`;
  }

  var query = `
    SELECT ss_standing.tournament_id, ss_standing.round, ss_standing.team_id, ss_standing.team, 
    ss_standing.position, ss_standing.overall_gp as gp, ss_standing.overall_w as w, ss_standing.overall_d as d, 
    ss_standing.overall_l as l, ss_standing.overall_gs as gs, ss_standing.overall_ga as ga, ss_standing.gd as gd, 
    ss_standing.p as pts, ss_team.team_name_th, ss_team.team_name_en, ss_team.team_logo,
    ss_tournament.tournament_name_th, ss_tournament.tournament_name_en, 
    ss_group.group_name_th, ss_group.group_name_en
    FROM ss_standing
    LEFT JOIN ss_team ON ss_standing.team_id = ss_team.team_id
    LEFT JOIN ss_tournament ON ss_tournament.tournament_id = ss_standing.tournament_id
    LEFT JOIN ss_group ON ss_group.group_id = ss_standing.group_id
    WHERE ss_standing.tournament_id =  '${tournamentID}'
    ${whereGroup}
    order by ss_standing.group_id, ss_standing.p desc, ss_standing.position;`;

  return queryData
    .get(query)
    .then(result => result)
    .catch(error => error);
};

const getGroupOfTeam = (tournamentId, teamId) => {
  var query = `SELECT ss_standing.tournament_id, ss_standing.round, ss_standing.team_id, ss_standing.team, 
            ss_standing.position, ss_standing.overall_gp as gp, ss_standing.overall_w as w, ss_standing.overall_d as d, 
            ss_standing.overall_l as l, ss_standing.overall_gs as gs, ss_standing.overall_ga as ga, ss_standing.gd as gd, 
            ss_standing.p as pts, ss_team.team_name_th, ss_team.team_name_en, ss_team.team_logo,
            ss_tournament.tournament_name_th, ss_tournament.tournament_name_en, 
            ss_group.group_name_th, ss_group.group_name_en
            FROM ss_standing
            LEFT JOIN ss_team ON ss_standing.team_id = ss_team.team_id
            LEFT JOIN ss_tournament ON ss_tournament.tournament_id = ss_standing.tournament_id
            LEFT JOIN ss_group ON ss_group.group_id = ss_standing.group_id
            WHERE ss_standing.tournament_id=${tournamentId} 
            AND ss_standing.group_id=(
                SELECT ss_standing.group_id 
                FROM ss_standing 
                WHERE ss_standing.tournament_id=${tournamentId} and team_id=${teamId}
            )
            order by ss_standing.p desc, ss_standing.position`;

  return queryData
    .get(query)
    .then(result => result)
    .catch(error => error);
};

module.exports = {
  getByTournament,
  getGroupOfTeam
};
