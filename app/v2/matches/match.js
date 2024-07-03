const queryData = require('../../helper/query');
const helper = require('../../helper/helper');

const getPredictLineup = (matchId, homeTeamId, awayTeamId) => {
  var query = `SELECT ss_match_lineups.team_id, ss_match_lineups.player_id,
    common_name, firstname_th, lastname_th, firstname_en, lastname_en, image
    FROM ss_match_lineups
    LEFT JOIN ss_player ON ss_match_lineups.player_id=ss_player.player_id
    WHERE ss_match_lineups.match_id=${matchId}`;

  return queryData
    .get(query)
    .then(result => {
      var lineup = {
        home_team: [],
        away_team: []
      };

      result.map(player => {
        if (player.team_id === homeTeamId) {
          lineup.home_team.push(player);
        } else if (player.team_id === awayTeamId) {
          lineup.away_team.push(player);
        }
      });

      return lineup;
    })
    .catch(error => error);
};

const getLiveReport = matchId => {
  var query = `
    SELECT 
    minutes, extra_min,
    player1_id p1_id, p1.firstname_th p1_f_th, p1.lastname_th p1_l_th, p1.common_name p1_common, p1.image p1_image,
    team1_id as t1_id, t1.team_name_en as t1_name_en, t1.team_logo t1_logo,
    player2_id p2_id, p2.firstname_th p2_f_th, p2.lastname_th p2_l_th, p2.common_name p2_common, p2.image p2_image,
    team2_id as t2_id, t2.team_name_en as t2_name_en, t2.team_logo t2_logo,
    ss_match_event.event_type_id, ss_event_type.event,
    player1_assist_id ps1_id, ps1.firstname_th ps1_f_th, ps1.lastname_th ps1_l_th, ps1.common_name ps1_common, ps1.image ps1_image,
    player2_assist_id ps2_id, ps2.firstname_th ps2_f_th, ps2.lastname_th ps2_l_th, ps2.common_name ps2_common, ps2.image ps2_image
    FROM ss_match_event
    LEFT JOIN ss_event_type ON ss_match_event.event_type_id=ss_event_type.event_type_id
    LEFT JOIN ss_player p1 ON ss_match_event.player1_id=p1.player_id
    LEFT JOIN ss_player p2 ON ss_match_event.player2_id=p2.player_id
    LEFT JOIN ss_team t1 ON ss_match_event.team1_id=t1.team_id
    LEFT JOIN ss_team t2 ON ss_match_event.team2_id=t2.team_id
    LEFT JOIN ss_player ps1 ON ss_match_event.player1_assist_id=ps1.player_id
    LEFT JOIN ss_player ps2 ON ss_match_event.player2_assist_id=ps2.player_id
    WHERE match_id=${matchId}
    ORDER BY minutes;
`;

  return queryData
    .get(query)
    .then(result => result)
    .catch(error => {
      throw error;
    });
};

const getTeamCompetition = matchId => {
  var query = `
  SELECT match_id, home_id, away_id FROM ss_match WHERE match_id=${matchId}
  `;

  return queryData
    .get(query)
    .then(result => result)
    .catch(error => {
      throw error;
    });
};

const getLineUp = (matchId, sub) => {
  var query = `SELECT ss_match_player.match_id, ss_match_player.team_id, ss_match_player.mom,
  ss_team.team_name_th, ss_team.team_name_en, ss_team.team_logo,
  ss_player.player_id, ss_player.firstname_th, ss_player.lastname_th,
  ss_player.firstname_en, ss_player.lastname_en, ss_player.common_name,
  ss_player.image, ss_player.position_id, ss_player_position.position_th, ss_player_position.position_en,
  ss_match_player.formation_position_id
  FROM ss_match_player
  LEFT JOIN ss_player ON ss_match_player.player_id=ss_player.player_id
  LEFT JOIN ss_team ON ss_match_player.team_id=ss_team.team_id
  LEFT JOIN ss_player_position ON ss_player.position_id=ss_player_position.position_id
  WHERE ss_match_player.match_id=${matchId}
  AND ss_match_player.is_substitute=${sub}
  ORDER BY ss_player.position_id;`;

  return queryData
    .get(query)
    .then(result => result)
    .catch(error => {
      throw error;
    });
};

const getMatchStats = matchId => {
  var query = `
    SELECT ss_match_stat.team_id, ss_team.team_name_th, ss_team.team_name_en, ss_team.team_logo,
    ss_match_stat.season_id, ss_match_stat.tournament_id, 
    possestion_time, short, ongoal, offgoal, goals, corners, offsides, fouls,
    saves, goalkick, freekick, yellow, red
    FROM ss_match_stat
    LEFT JOIN ss_team ON ss_match_stat.team_id=ss_team.team_id
    WHERE match_id=${matchId};
   `;
  return queryData
    .get(query)
    .then(result => result)
    .catch(error => {
      throw error;
    });
};

const getMatchInfo = (matchId, stId) => {
  var query = `SELECT ss_match.match_id, ss_match.tournament_id, ss_match.sport_id, ss_match.round, ss_match.match_number,
                            ss_match.home_id, ss_match.home_team, ss_match.away_id, ss_match.away_team,
                            ss_team1.team_name_en as home_team_name_en,
                            ss_team1.team_name_th as home_team_name_th, ss_team1.team_logo as home_team_logo,
                            ss_team2.team_name_en as away_team_name_en,
                            ss_team2.team_name_th as away_team_name_th, ss_team2.team_logo as away_team_logo,
                            ss_match.ht_home_score, ss_match.ht_away_score, ss_match.ft_home_score, ss_match.ft_away_score, 
                            ss_match.et_home_score, ss_match.et_away_score, ss_match.pen_home_score, ss_match.pen_away_score,
                            ss_match.match_date, ss_match.match_status, ss_match.tournament, ss_match.lives_tv, ss_match.stadium_id,
                            ss_stadium.stadium_name_th, ss_stadium.stadium_name_en, ss_match.status, ss_match.create_date, 
                            ss_match.lastupdate_date, ss_news.news_id2 as news_id
                            FROM ss_match
                            LEFT JOIN ss_team ss_team1 ON ss_match.home_id=ss_team1.team_id
                            LEFT JOIN ss_team ss_team2 ON ss_match.away_id=ss_team2.team_id
                            LEFT JOIN ss_stadium ON ss_match.stadium_id=ss_stadium.stadium_id
                            LEFT JOIN ss_news ON ss_match.match_id=ss_news.match_id
                            WHERE ss_match.match_id=${matchId}
                            AND ss_match.st_id=${stId}`;

  return queryData
    .get(query)
    .then(result => {
      // setup moment date
      helper.addMomentDate(result, 'match_date');
      return result;
    })
    .catch(error => {
      throw error;
    });
};

const getTeamFormation = matchId => {
  var query = `SELECT home_id, away_id, hometeam_formation.formation home_formation,
    awayteam_formation.formation away_formation
    FROM ss_match
    LEFT JOIN ss_team_formation hometeam_formation ON ss_match.home_formation=hometeam_formation.tfid
    LEFT JOIN ss_team_formation awayteam_formation ON ss_match.away_formation=awayteam_formation.tfid
    WHERE ss_match.match_id=${matchId}
  `;

  return queryData
    .get(query)
    .then(result => result)
    .catch(error => {
      throw error;
    });
};

const getPenalty = (matchId, teamId) => {
  var query = `SELECT ss_player.player_id, ss_player.firstname_th, ss_player.lastname_th,
  ss_player.firstname_en, ss_player.lastname_en, ss_player.common_name,
  ss_player.image, mp.match_pen_id, mp.match_id, mp.team_id, mp.number, mp.is_goal
  FROM (ss_match_pen mp)
  LEFT JOIN ss_player ON ss_player.player_id = mp.player_id
  WHERE mp.match_id = ${matchId}
  AND mp.team_id = ${teamId}
  ORDER BY mp.number asc
  `;

  return queryData
    .get(query)
    .then(result => result)
    .catch(error => {
      throw error;
    });
};

module.exports = {
  getPredictLineup,
  getLiveReport,
  getTeamCompetition,
  getMatchStats,
  getLineUp,
  getMatchInfo,
  getTeamFormation,
  getPenalty
};
