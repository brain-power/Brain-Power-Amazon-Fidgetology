const childProcess = require('child_process');

const execPromise = command => {
  console.log("Executing... ", command);
  return new Promise((resolve, reject) => {
    childProcess.exec(command, err => {
      if (err) {
        console.log(`Error with command: ${command}`, err);
        reject(err);
      } else {
        resolve();
      }
    });
  });
};

const spawnPromise = (command, options) => {
  return new Promise((resolve, reject) => {
    const process = childProcess.spawn(command, options);
    process.stdout.on('data', buffer => {
      console.log(buffer.toString());
    });
    process.stderr.on('data', buffer => {
      console.error(buffer.toString());
    });
    process.on('close', code => {
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
