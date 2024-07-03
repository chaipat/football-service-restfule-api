var winston = require("winston");
var DailyRotateFile = require("winston-daily-rotate-file");
var path = require("path");

var log_path = __dirname + "/logs/";
var logger = new winston.Logger({
  transports: [
    new winston.transports.Console({
      prettyPrint: true,
      level: "verbose",
      json: false,
      timestamp: true
    }),
    new DailyRotateFile({
      name: "info-file",
      filename: path.join(log_path, "log-siamsport-service-info.log"),
      datePattern: ".yyyy-MM-dd",
      maxsize: "50M",
      prettyPrint: true,
      level: "info",
      json: false
    }),
    new DailyRotateFile({
      name: "error-file",
      filename: path.join(log_path, "log-siamsport-service-error.log"),
      datePattern: ".yyyy-MM-dd",
      maxsize: "50M",
      prettyPrint: true,
      level: "error",
      json: false
    })
  ],
  exceptionHandlers: [
    new winston.transports.Console({
      prettyPrint: true,
      json: false,
      timestamp: true
    }),
    new DailyRotateFile({
      name: "exception-file",
      filename: path.join(log_path, "log-siamsport-service-exceptions.log"),
      datePattern: ".yyyy-MM-dd",
      maxsize: "50M",
      prettyPrint: true,
      level: "error",
      json: false
    })
  ],
  exitOnError: false
});

module.exports = logger;
