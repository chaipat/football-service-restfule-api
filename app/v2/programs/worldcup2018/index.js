const validate = require("validate.js");
const tournament = require("./worldcup.js");
const config = require("../../../config/index");
const log = require("../../../../logging/index");

const responseData = config.response;

var getPrograms = (req, res) => {
  // เช็ค parameters ว่าเป็นตัวเลขหรือไม่
  if (
    validate({ field: req.params.round }, { field: { numericality: true } })
  ) {
    return res
      .status(400)
      .json(responseData(400, "fail", "invalid request", null));
  }

  var round = req.params.round;

  var requestInfo = {
    method: req.method,
    path: req.path,
    round
  };

  return tournament
    .getPrograms(requestInfo)
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

var getByGroup = (req, res) => {
  if (!req.query.g) {
    return res
      .status(400)
      .json(responseData(400, "fail", "invalid request", null));
  }

  var requestInfo = {
    method: req.method,
    path: req.path,
    query: {
      groupName: req.query.g
    }
  };

  return tournament
    .getByGroup(requestInfo)
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
      return res.status(500).json(responseData(500, "fail", { error }, null));
    });
};

var getMatchDay = (req, res) => {
  var selectDate = req.query.day ? req.query.day : null;

  var requestInfo = {
    method: req.method,
    path: req.path,
    query: {
      selectDate
    }
  };

  return tournament
    .getMatchDay(requestInfo)
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
      return res.status(500).json(responseData(500, "fail", { error }, null));
    });
};

var getKnockOut = (req, res) => {
  var requestInfo = {
    method: req.method,
    path: req.path
  };

  return tournament
    .getKnockOut(requestInfo)
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
      return res.status(500).json(responseData(500, "fail", { error }, null));
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
  getPrograms,
  getByGroup,
  getMatchDay,
  getKnockOut,
  deleteCache
};
