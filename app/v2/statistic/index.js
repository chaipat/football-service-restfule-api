const validate = require("validate.js");
const statistic = require("./statistic");
const log = require("../../../logging/index");
const config = require("../../config/index");
const helpers = require("../../helper/helper");

const responseData = config.response;

var updateCounter = (req, res) => {
  if (helpers.isEmptyObject(req.body)) {
    return res
      .status(400)
      .json(responseData(400, "fail", "no request object", null));
  }

  // TODO: เช็ค req.body.id ว่าถูกต้องไหม

  var counterFields = []; // ใส่ชื่อตอลัมน์ที่ต้องการจะอัพเดท

  if (req.body.type === "view") {
    counterFields = ["countview"];
  } else if (req.body.type === "share") {
    counterFields = ["share"];
  } else {
    return res
      .status(400)
      .json(responseData(400, "fail", "wrong request object", null));
  }

  if (validate({ field: req.body.id }, { field: { numericality: true } })) {
    return res
      .status(400)
      .json(responseData(400, "fail", "invalid request", null));
  }

  var updateInfo = {
    table: `ss_${req.body.secion}`,
    counterFields,
    idField: `${req.body.section}_id2`,
    section: req.body.section,
    type: req.body.type,
    id: req.body.id
  };

  return statistic
    .updateCounter(updateInfo)
    .then(result => {
      return res.json(responseData(200, "success", null, result));
    })
    .catch(error => {
      return res
        .status(500)
        .json(responseData(500, "fail", { error: error }, null));
    });
};

var getCounter = (req, res) => {
  var section = req.params.section;
  var id = req.params.id;

  // TODO - verify req.params and sanitize data
  if (validate({ field: req.params.id }, { field: { numericality: true } })) {
    return res
      .status(400)
      .json(responseData(400, "fail", "invalid request", null));
  }

  reqInfo = {
    section: req.params.section,
    id: req.params.id,
    path: req.path
  };

  return statistic
    .getCounter(reqInfo)
    .then(result => {
      return res.json(responseData(200, "success", result.info, result.data));
    })
    .catch(error => {
      return res
        .status(500)
        .json(responseData(500, "fail", { error: error }, null));
    });
};

module.exports = {
  updateCounter,
  getCounter
};
