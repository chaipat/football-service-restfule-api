const queryData = require("../../helper/query");

const getStats = (tournamentId, statType) => {
  if (statType === "goal" || statType === "assist") {
    var query = "";

    if (statType === "goal") {
      query = `SELECT * FROM ss_view_top_score WHERE tournament_id=${tournamentId}`;
    } else {
      query = `SELECT * FROM ss_view_top_assist WHERE tournament_id=${tournamentId}`;
    }
  }

  return queryData
    .get(query)
    .then(result => result)
    .catch(error => {
      throw error;
    });
};

module.exports = {
  getStats
};
