/*global module, require, __dirname, Promise */
var os = require('os'),
  path = require('path'),
  fs = require('fs'),
  cp = require('./child-process-promise'),
  exists = function (target) {
    'use strict';
    console.log("Checking if path exists: ", target);
    return new Promise(function (resolve, reject) {
      fs.access(target, function (err) {
        if (err) {
          console.log("Error accessing path: " + err);
          reject(target);
        } else {
          resolve(target);
        }
      });
    });
  },
  makeExecutable = function (target) {
    'use strict';
    return new Promise(function (resolve, reject) {
      fs.chmod(target, '0755', function (err) {
        if (err) {
          console.log("Error making executable: " + err);
          reject(target);
        } else {
          resolve(target);
        }
      });
    });
  },
  unzip = function (targetPath) {
    'use strict';
    console.log("Unzipping binary...");
    var unzipCmd = 'cat ' + path.join(__dirname, 'vendor', 'ffmpeg.gz') + ' | gzip -d  > ' + targetPath;
    console.log(unzipCmd);
    return cp.exec(unzipCmd).then(function () {
      return makeExecutable(targetPath);
    });
  },
  findUnpackedBinary = function (targetPath) {
    'use strict';
    return exists(targetPath).catch(unzip);
  };

module.exports = function ffmpeg(commandStr) {
  'use strict';
  var binaryPath = path.resolve(path.join(__dirname, 'vendor/ffmpeg'));
  var targetPath = path.join(os.tmpdir(), 'ffmpeg');
  return new Promise(function(resolve, reject) {
    fs.access(targetPath, function(err) {
        if (!err) {
          cp.exec(targetPath + " " + commandStr).then(resolve).catch(reject);
        } else {
          cp.exec("cp " + binaryPath + " " + targetPath)
            .then(function() {
              return makeExecutable(targetPath).then(function(commandPath) { cp.exec(commandPath + " " + commandStr).then(resolve).catch(reject); });
            }).catch(function() {
              return findUnpackedBinary(targetPath).then(function(commandPath) { cp.exec(commandPath + " " + commandStr).then(resolve).catch(reject); });
            });
        }
      });
  });
};
