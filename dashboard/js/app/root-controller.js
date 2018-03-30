app.controller('RootController', ['$scope', '$http', '$timeout', '$interval', '$mdDialog', 'Upload', function($scope, $http, $timeout, $interval, $mdDialog, Upload) {
    var s3Client,
        kinesisClient;

    $scope.init = function() {
        $scope.inProgress = true;
        var _API_ENDPOINT;
        try {
            _API_ENDPOINT = (API_ENDPOINT || "/Prod");
        } catch (e) {
            _API_ENDPOINT = "/Prod";
        }
        $http.get(_API_ENDPOINT + "/Config")
            .then(function(response) {
                $scope.Config = response.data;
                $scope.Config.API_ENDPOINT = _API_ENDPOINT;
                AWS.config.update({
                    region: $scope.Config.AWS_REGION || "us-east-1",
                    credentials: new AWS.CognitoIdentityCredentials({
                        IdentityPoolId: $scope.Config.IdentityPoolId
                    })
                });
                s3Client = new AWS.S3({
                    params: { Bucket: $scope.Config.UPLOADS_BUCKET_NAME }
                });
                $scope.$broadcast("configLoaded", $scope.Config);
                if ($scope.Config.KDS_PROCESSED_STREAM_NAME) {
                    kinesisClient = new AWS.Kinesis();
                    initKinesisPolling();
                }
                $scope.inProgress = false;
                console.log($scope.Config);
            }).catch(function() {
                $scope.inProgress = false;
            });
    };

    function initKinesisPolling() {
        var DEFAULT_RECORDS_LIMIT = 20; // max records to retrieve per request
        var POLLING_INTERVAL = 500; // milliseconds
        var SHARD_ID = 'shardId-000000000000'; // app publishes to only one shard
        var shardIterator;
        var getNextShard = function() {
            kinesisClient.getRecords({
                Limit: DEFAULT_RECORDS_LIMIT,
                ShardIterator: shardIterator
            }, defaultCallback);
        };
        var defaultCallback = function(err, data) {
            if (err) return console.error(err);
            shardIterator = data.NextShardIterator || data.ShardIterator;
            if (data.Records) {
                prepareRecords(data.Records.slice());
                $timeout(getNextShard, POLLING_INTERVAL);
            } else {
                getNextShard();
            }
        };
        kinesisClient.getShardIterator({
            ShardIteratorType: 'LATEST',
            StreamName: $scope.Config.KDS_PROCESSED_STREAM_NAME,
            ShardId: SHARD_ID
        }, defaultCallback);
    }

    function prepareRecords(records) {
        records.forEach(function(record) {
            // Decode base64-encoded records.
            record.data = JSON.parse(new TextDecoder("utf-8").decode(record.Data));
        });
        if (records.length) {
            $scope.$broadcast("newRecords", records);
            //console.log("Fragment Number", records[0].data.InputInformation.KinesisVideo.FragmentNumber);
            //console.log("Producer Timestamp", new Date(records[0].data.InputInformation.KinesisVideo.ProducerTimestamp * 1000));
            //console.log("Frame Timestamp", new Date(Math.round(records[0].data.FaceSearchResponse[0].DetectedFace.Timestamp * 1000)));
            //console.log(records.length + " Records");
        }
    }
    $scope.staticVideo = [];
    $scope.openUploadDialog = function($event) {
        window.scrollTo(0, 0);
        $scope.Upload = Upload;
        $mdDialog.show({
            parent: $(document.body),
            targetEvent: $event,
            templateUrl: 'views/upload-video-dialog.html',
            locals: {
                metadata: $scope.metadata || {},
                Upload: $scope.Upload,
                staticVideo: $scope.staticVideo,
                Config: $scope.Config
            },
            controller: UploadVideoDialogController
        });

        function UploadVideoDialogController($scope, $mdDialog, metadata, Upload, staticVideo, Config) {
            $scope.metadata = metadata;
            $scope.Upload = Upload;
            $scope.staticVideo = staticVideo;
            $scope.Config = Config;
            $scope.uploadVideo = function(file, callback) {
                $scope.uploadSuccess = undefined;
                $scope.uploadError = undefined;
                $scope.uploadStatus = "Uploading to S3 ...";
                var s3Params = {
                    Key: "raw_uploads/" + new Date().getTime() + "_" + file.name.replace(/ /g,"_"),
                    Body: file,
                    ContentType: file.type,
                    Metadata: {

                    }
                }
                var delay = 0;
                file.startTimestamp = (new Date().getTime() + delay * 1000);
                s3Params.Metadata[$scope.Config.PRODUCER_START_TIMESTAMP_KEY] = file.startTimestamp.toString();
                s3Client.putObject(s3Params, function(err, data) {
                    if (err) {
                        return callback(err);
                    }
                    $scope.uploadStatus = "Converting to streamable MKV fragments ...";
                    $timeout(function() {
                        callback(null, data);
                    }, 5 * 1000);
                });
            };

            $scope.saveVideo = function() {
                $scope._file = $scope.uploadVideoForm.video_file;
                if ($scope._file.$valid) {
                    $scope.inProgress = true;
                    $scope.uploadVideo($scope.file, function(err, response) {
                        if (err) {
                            $scope.error = "Error occurred during video upload.";
                            console.error(err);
                        } else {
                            $scope.closeDialog();
                            staticVideo.pop();
                            staticVideo.push($scope.file);
                            $scope.$apply();
                        }
                        $scope.inProgress = false;
                    });
                } else {
                    $scope.inProgress = false;
                    $scope.error = "Uploaded video file is invalid";
                }
            };

            $scope.closeDialog = function() {
                $mdDialog.hide();
            };
        }
    };

    $scope.streamMetadata = null;
    $scope.toggleWebcamStream = function($event) {
        $scope.streamMetadata = $scope.streamMetadata || {
            framerate: '--',
            bufferSize: '--',
            postInterval: '--',
            KVSLatency: '--',
            payloadSize: '--'
        };
        $scope.isStreaming = !$scope.isStreaming;

        $scope.webcam_canvas = $("#webcam_canvas").get(0);
        var clientWidth = window.innerWidth ||
            document.documentElement.clientWidth ||
            document.body.clientWidth;
        var clientHeight = window.innerHeight ||
            document.documentElement.clientHeight ||
            document.body.clientHeight;

        Webcam.on("error", function(err) {
            //alert(err);
            //$scope.isStreaming = false;
            console.log(err);
        });

        Webcam.set({
            width: Math.min(640, clientWidth),
            height: Math.min(640, clientWidth) * 3 / 4,
            image_format: "jpeg",
            quality: 80
        });

        $scope.$broadcast($scope.isStreaming ? "startStreaming" : "stopStreaming", {});
    };

    $interval(function() {
        $scope.currentTime = new Date().getTime();
    }, 1000);

}]);