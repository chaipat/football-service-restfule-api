var express = require('express');
var config = require('../config/index');
var utils = require('../utils/index');

var mysqlModule = mysqlModule.prototype;

function mysqlModule () {

}

mysqlModule.getData = function (queryString, callback) {

  var mysql_connection = config.getMySQLConnection();

  mysql_connection.connect(function(connectionError) {

    if (connectionError) {
      mysql_connection.end();
      callback(connectionError, null);
    } else {
      mysql_connection.query({
        sql: queryString,
        timeout: 2000,
      },
      function(error, results, fields) {

        if(error) {
          mysql_connection.end();
          callback(error, null);
        } else {
          callback(null, results);
          mysql_connection.end();
        }

      });
    }

  });

};

mysqlModule.getDataLivescore = function (queryString, callback) {

  var mysql_connection = config.getLivescoreMySQLConnection();

  mysql_connection.connect(function(connectionError) {

    if (connectionError) {
      mysql_connection.end();
      callback(connectionError, null);
    } else {
      mysql_connection.query({
        sql: queryString,
        timeout: 2000,
      },
      function(error, results, fields) {

        if(error) {
          mysql_connection.end();
          callback(error, null);
        } else {

          callback(null, results);
          mysql_connection.end();

        }

      });
    }

  });

};

mysqlModule.getDataPassParams = function (queryString, queryData, callback) {

  var mysql_connection = config.getMySQLConnection();

  mysql_connection.connect(function(connectionError) {

    if (connectionError) {
      mysql_connection.end();
      callback(connectionError, null);
    } else {
      mysql_connection.query({
        sql: queryString,
        timeout: 2000,
        values: queryData,
      },
      function(error, results, fields) {

        if(error) {
          mysql_connection.end();
          callback(error, null);
        } else {

          callback(null, results);
          mysql_connection.end();

        }

      });
    }

  });

};

module.exports = mysqlModule;
