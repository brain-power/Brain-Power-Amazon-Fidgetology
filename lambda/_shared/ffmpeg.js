const child_process = require('./child-process-promise');
const ffmpegPath = process.env.local ? require("@ffmpeg-installer/ffmpeg").path : ("./@ffmpeg-installer/ffmpeg").path;

module.exports = function ffmpeg(commandStr) {
  return child_process.exec(`${ffmpegPath} ${commandStr}`);
};