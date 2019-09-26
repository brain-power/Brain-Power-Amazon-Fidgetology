/*global module, require, __dirname, Promise */
const os = require('os');

const path = require('path');
const fs = require('fs');
const cp = require('./child-process-promise');

const exists = target => {
  console.log("Checking if path exists: ", target);
  return new Promise((resolve, reject) => {
    fs.access(target, err => {
      if (err) {
        console.log(`Error accessing path: ${err}`);
        reject(target);
      } else {
        resolve(target);
      }
    });
  });
};

const makeExecutable = target => {
  return new Promise((resolve, reject) => {
    fs.chmod(target, '0755', err => {
      if (err) {
        console.log(`Error making executable: ${err}`);
        reject(target);
      } else {
        resolve(target);
      }
    });
  });
};

const unzip = targetPath => {
  console.log("Unzipping binary...");
  const unzipCmd = `cat ${path.join(__dirname, 'vendor', 'ffmpeg.gz')} | gzip -d  > ${targetPath}`;
  console.log(unzipCmd);
  return cp.exec(unzipCmd).then(() => makeExecutable(targetPath));
};

const findUnpackedBinary = () => {
  return exists(path.join(os.tmpdir(), 'ffmpeg')).catch(unzip);
};

module.exports = function ffmpeg(commandStr) {
  return findUnpackedBinary().then(commandPath => cp.exec(`${commandPath} ${commandStr}`)).catch(console.log);
};
