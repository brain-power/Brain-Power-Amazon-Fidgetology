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
  findUnpackedBinary = function () {
    'use strict';
    return exists(path.join(os.tmpdir(), 'ffmpeg')).catch(unzip);
  };

module.exports = function ffmpeg(commandStr) {
  'use strict';
  return findUnpackedBinary().then(function (commandPath) { return cp.exec(commandPath + " " + commandStr); }).catch(console.log);
};
