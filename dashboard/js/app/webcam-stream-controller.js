app.controller('WebcamStreamController', ['$scope', '$http', '$timeout', function($scope, $http, $timeout) {

    var looperPromise;

    var DEFAULT_BUFFER_SIZE = 40;
    var frameBuffer;

    $scope.shouldUploadFrames = 1;

    function stopStreaming() {
        try {
            Webcam.reset();
        } catch (e) {
            console.error(e);
        }
        if (looperPromise) {
            clearTimeout(looperPromise);
            looperPromise = null;
        }
        if (frameBuffer) {
            frameBuffer.clear();
        }
        $scope.streamMetadata.lastPost = null;
        $scope.streamMetadata.startTimestamp = null;
    }

    function startStreaming() {
        if (!Number($scope.streamMetadata.bufferSize)) {
            $scope.streamMetadata.bufferSize = DEFAULT_BUFFER_SIZE;
        }
        if (!frameBuffer) {
            frameBuffer = new FrameBuffer({
                size: $scope.streamMetadata.bufferSize
            });
        }
        frameBuffer.clear();
        Webcam.off('live');
        Webcam.attach("#webcam-canvas");
        Webcam.on('live', startStreamLoop);
    }

    function getDataEndpoint() {
        if (/localhost/.test(window.location)) {
            return "/FrameData";
        }
        return $scope.Config.API_ENDPOINT + "/FrameData";
    }

    var frameCallback = function(imgData) {
        if (!$scope.isStreaming) return;
        frameBuffer.addFrame(imgData);
        if ($scope.streamMetadata.bufferSize &&
            frameBuffer.getSize() >= $scope.streamMetadata.bufferSize) {
            var data = frameBuffer.getData();
            frameBuffer.clear();
            if ($scope.streamMetadata.lastPost) {
                $scope.streamMetadata.postInterval = new Date().getTime() - $scope.streamMetadata.lastPost;
            }
            $scope.streamMetadata.lastPost = new Date().getTime();
            if ($scope.shouldUploadFrames) {
                $scope.streamMetadata.inProgress = true;
                $http.post(getDataEndpoint(), data).then(function(response) {
                    $scope.streamMetadata.KVSLatency = new Date().getTime() - $scope.streamMetadata.lastPost;
                    $scope.streamMetadata.inProgress = false;
                }).catch(console.error);
            }
            $scope.streamMetadata.payloadSize = Number((JSON.stringify(data).length / Math.pow(10, 6)).toFixed(2)) + " MB";
        }
    };

    function startStreamLoop() {
        var lastTimestamp;
        var looper = function() {
            if (lastTimestamp) {
                var dtMillis = new Date().getTime() - lastTimestamp;
                $scope.streamMetadata.framerate = Number((1000 / dtMillis).toFixed(1));
            }
            if ($scope.isStreaming) {
                Webcam.snap(frameCallback);
                lastTimestamp = new Date().getTime();
                looperPromise = setTimeout(looper, 1000 / parseInt($scope.Config.TARGET_FRAME_RATE));
            }
        };
        looper();
        $scope.streamMetadata.startTimestamp = new Date().getTime();
    }

    $scope.$on("stopStreaming", stopStreaming);

    $scope.$on("startStreaming", startStreaming);

}]);