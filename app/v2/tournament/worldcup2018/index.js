const validate = require("validate.js");
const tournament = require("./worldcup.js");
const config = require("../../../config/index");
const log = require("../../../../logging/index");

const responseData = config.response;

var getHome = (req, res) => {
  var requestInfo = {
    method: req.method,
    path: req.path
  };

  return tournament
    .getHome(requestInfo)
    .then(result => {
      return res.json(responseData(200, "success", result.info, result.data));
    })
    .catch(error => {
      if (error.code) {
        return res
          .status(error.code)
          .json(
            responseData(error.code, "fail", { error: error.message }, null)
          );
      }
      return res
        .status(500)
        .json(responseData(500, "fail", { error: error.code }, null));
    });
};

var getStats = (req, res) => {
  var requestStat = req.query.q ? req.query.q : "all";

  var requestInfo = {
    method: req.method,
    path: req.path,
    teamId: req.params.teamId,
    query: {
      requestStat
    }
  };

  return tournament
    .getStats(requestInfo)
    .then(result => {
      return res.json(responseData(200, "success", result.info, result.data));
    })
    .catch(error => {
      if (error.code) {
        return res
          .status(error.code)
          .json(
            responseData(error.code, "fail", { error: error.message }, null)
          );
      }
      return res
        .status(500)
        .json(responseData(500, "fail", { error: error.code }, null));
    });
};

var deleteCache = (req, res) => {
  return tournament
    .deleteCache(req)
    .then(result => {
      if (result == 0) {
        return res.json(
          responseData(
            204,
            "fail",
            "no key found or key already deleted.",
            null
          )
        );
      }
      return res.json(
        responseData(200, "success", "deleted keys: " + result, null)
      );
    })
    .catch(error => {
      return res
        .status(500)
        .json(responseData(500, "fail", { error: error }, null));
    });
};

module.exports = {
  getHome,
  getStats,
  deleteCache
};
