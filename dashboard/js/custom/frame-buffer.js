/* 
 * Authored by Runpeng Liu,
 * Brain Power (2018) 
 */

var FrameBuffer = function(params) {
    var that = Object.create(FrameBuffer.prototype);
    
    var MIN_BUFFER_SIZE = 20;
    var frameBuffer = [];
    var frameTimestamps = [];
    var bufferSize = Math.max(MIN_BUFFER_SIZE, params.size);
    that.bufferSize = bufferSize;
    var startTimestamp;
    var lastTimestamp;

    that.addFrame = function(imgData) {
        frameBuffer.push(imgData);
        startTimestamp = startTimestamp || new Date().getTime();
        lastTimestamp = new Date().getTime();
        frameTimestamps.push(lastTimestamp);
    };
    that.clear = function() {
        frameBuffer = [];
        frameTimestamps = [];
        startTimestamp = null;
    };
    that.shouldClear = function() {
        return frameBuffer.length >= bufferSize;
    };
    that.getData = function() {
        return {
            frames: frameBuffer.slice(),
            framerate: Math.round(1000 * frameBuffer.length / (lastTimestamp - startTimestamp)),
            timestamps: frameTimestamps.slice()
        }
    };
    that.getSize = function() {
        return frameBuffer.length;
    };

    Object.freeze(that);
    return that;
};