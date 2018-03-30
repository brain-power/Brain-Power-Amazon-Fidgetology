/*global module, require, console, Promise */
var childProcess = require('child_process'),
  execPromise = function (command) {
    'use strict';
    console.log("Executing... ", command);
    return new Promise(function (resolve, reject) {
      childProcess.exec(command, function (err) {
        if (err) {
          console.log("Error with command: " + command, err);
          reject(err);
        } else {
          resolve();
        }
      });
    });
  },
  spawnPromise = function (command, options) {
    'use strict';
    return new Promise(function (resolve, reject) {
      var process = childProcess.spawn(command, options);
      process.stdout.on('data', function (buffer) {
        console.log(buffer.toString());
      });
      process.stderr.on('data', function (buffer) {
        console.error(buffer.toString());
      });
      process.on('close', function (code) {
        if (code !== 0) {
          reject(code);
        } else {
          resolve();
        }
      });
    });
  };
module.exports = {
  exec: execPromise,
  spawn: spawnPromise
};
