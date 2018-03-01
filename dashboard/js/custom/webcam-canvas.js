var CanvasBuffer = function(params) {
    var MIN_BUFFER_SIZE = 20;
    var frameBuffer = [];
    var bufferSize = Math.max(MIN_BUFFER_SIZE, params.size);
    this.bufferSize = bufferSize;
    var startTimestamp;
    var lastTimestamp;

    return {
        addFrame: function(imgData) {
            frameBuffer.push(imgData);
            startTimestamp = startTimestamp || new Date().getTime();
            lastTimestamp = new Date().getTime();
        },
        clear: function() {
            frameBuffer = [];
            startTimestamp = null;
        },
        shouldClear: function() {
            return frameBuffer.length >= bufferSize;
        },
        getData: function() {
            return {
                frames: frameBuffer.slice(),
                framerate: Math.round(1000 * frameBuffer.length / (lastTimestamp - startTimestamp))
            }
        },
        getSize: function() {
            return frameBuffer.length
        }
    };
}