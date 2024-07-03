const express = require("express");
const app = express();

// var home = require('../app/v1/home/index');
var category = require("../v2/category/index");
// var detail = require('../app/v1/detail/index');
// var statistic = require('../app/v1/statistic/index');
// var search = require('../app/v1/search/index');
// var ads = require('../app/v1/ads/index');
// var service = require('../app/v1/service/index');
var news = require("../v2/news/index");
var video = require("../v2/video/index");
var timeout = require("../v2/category/timeout/index");
var statistic = require("../v2/statistic/index");

var wcProgram = require("../v2/programs/worldcup2018/index");
var wcTable = require("../v2/tables/worldcup2018/index");
var wcAnalysis = require("../v2/analysis/worldcup2018/index");
var wcTeamInfo = require("../v2/team/worldcup2018/index");
var wcPlayerInfo = require("../v2/player/worldcup2018/index");
var wcTournament = require("../v2/tournament/worldcup2018/index");

var apiRoutes = express.Router();

apiRoutes.get("/", (req, res) => {
  return res.send("New Siamsport API");
});

/**
 * Category page
 */
//apiRoutes.get('/category/list', category.getList);
// apiRoutes.get('/category/:id', category.getItemList);
// apiRoutes.get('/category/by/:order', category.getByOrder);
// apiRoutes.delete('/category/:id', category.deleteCache);
// apiRoutes.delete('/category/by/:order', category.deleteCache);

/**
 * news
 */
apiRoutes.get("/news/relate/:newsId", news.getRelate);
apiRoutes.delete("/news/relate/:newsId", news.deleteCache);
/**
 * Video
 */
apiRoutes.get("/video/sstv", video.sstvList);

/**
 * Timeout
 */
apiRoutes.get("/timeout/highlight", timeout.getHighlight);
apiRoutes.get("/timeout/by/:order", timeout.getByOrder);
apiRoutes.delete("/timeout/highlight", timeout.deleteCache);
apiRoutes.delete("/timeout/by/:order", timeout.deleteCache);

/**
 * Worlcup 2018
 */

/**
 * home
 */
apiRoutes.get("/home/worldcup2018", wcTournament.getHome);
apiRoutes.delete("/home/worldcup2018", wcTournament.deleteCache);

// tables
apiRoutes.get("/table/worldcup2018", wcTable.getTables);
apiRoutes.delete("/table/worldcup2018", wcTable.deleteCache);

// fixtures - result
// /programs/wordcup2018/round/1?matchday={1,2,3}
apiRoutes.get("/programs/worldcup2018/round/:round", wcProgram.getPrograms);
apiRoutes.delete("/programs/worldcup2018/round/:round", wcProgram.deleteCache);
apiRoutes.get("/programs/worldcup2018/matchDay", wcProgram.getMatchDay);
apiRoutes.delete("/programs/worldcup2018/matchDay", wcProgram.deleteCache);
apiRoutes.get("/programs/worldcup2018/group", wcProgram.getByGroup);
apiRoutes.delete("/programs/worldcup2018/group", wcProgram.deleteCache);
apiRoutes.get("/programs/worldcup2018/knockout", wcProgram.getKnockOut);
apiRoutes.delete("/programs/worldcup2018/knockout", wcProgram.deleteCache);
/**
 * Category
 */
apiRoutes.get("/category/:type/:by/:id", category.getItemList); //?type={news,column.video}&by={sport,tournament}&id={tournament id}
apiRoutes.delete("/category/:type/:by/:id", category.deleteCache);

/**
 * Match analysis
 */
apiRoutes.get("/analysis/worldcup2018", wcAnalysis.getItemList);
apiRoutes.delete("/analysis/worldcup2018", wcAnalysis.deleteCache);
apiRoutes.get("/analysis/worldcup2018/:matchId", wcAnalysis.getAnalysis);
apiRoutes.delete("/analysis/worldcup2018/:matchId", wcAnalysis.deleteCache);

/**
 * Match Live report
 */
apiRoutes.get("/analysis/worldcup2018/live/:matchId", wcAnalysis.getLive);
apiRoutes.delete(
  "/analysis/worldcup2018/live/:matchId",
  wcAnalysis.deleteCache
);

/**
 * Team info
 */
apiRoutes.get("/team/worldcup2018/list", wcTeamInfo.getList);
apiRoutes.delete("/team/worldcup2018/list", wcTeamInfo.deleteCache);
apiRoutes.get("/team/worldcup2018/info/:teamId", wcTeamInfo.getInfo);
apiRoutes.delete("/team/worldcup2018/info/:teamId", wcTeamInfo.deleteCache);

/**
 * Player info
 */
apiRoutes.get("/player/worldcup2018/info/:playerId", wcPlayerInfo.getInfo);
apiRoutes.delete(
  "/player/worldcup2018/info/:playerId",
  wcPlayerInfo.deleteCache
);

/**
 * Tournament stat (goal, assist etc.)
 */
apiRoutes.get("/stats/worldcup2018", wcTournament.getStats);
apiRoutes.delete("/stats/worldcup2018", wcTournament.deleteCache);

/**
 * Statistic (view, share etc.)
 */

apiRoutes.get("/stats/count/:section/:id", statistic.getCounter);
apiRoutes.post("/stats/count", statistic.updateCounter);

module.exports = { apiRoutes };
