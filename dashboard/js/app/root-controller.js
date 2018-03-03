app.controller('RootController', ['$scope', '$http', '$timeout', '$mdDialog', 'Upload', function($scope, $http, $timeout, $mdDialog, Upload) {
    var s3Client,
        kinesis;

    $scope.init = function() {
        $scope.inProgress = true;
        $http.get(API_ENDPOINT + "/Config")
            .then(function(response) {
                $scope.Config = response.data;
                $scope.Config.API_ENDPOINT = API_ENDPOINT;
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
                kinesis = new AWS.Kinesis();
                initKinesis();
                $scope.inProgress = false;
            }).catch(function() {
                $scope.inProgress = false;
            });
    }

    function initKinesis() {
        var DEFAULT_RECORDS_LIMIT = 20;
        var POLLING_INTERVAL = 500;
        var SHARD_ID = 'shardId-000000000000';
        var getNextShard = function() {
            kinesis.getRecords({
                Limit: DEFAULT_RECORDS_LIMIT,
                ShardIterator: $scope.shardIterator
            }, defaultCallback);
        }
        var defaultCallback = function(err, data) {
            if (err) return console.error(err);
            $scope.shardIterator = data.NextShardIterator || data.ShardIterator;
            if (data.Records) {
                processRecords(data.Records.slice());
                $timeout(getNextShard, POLLING_INTERVAL);
            } else {
                getNextShard();
            }
        }
        kinesis.getShardIterator({ 
            ShardIteratorType: 'LATEST', 
            StreamName: $scope.Config.KDS_PROCESSED_STREAM_NAME, 
            ShardId: SHARD_ID 
        }, defaultCallback);
    }

    function processRecords(records) {
        records.forEach(function(record) {
            record.data = JSON.parse(new TextDecoder("utf-8").decode(record.Data));
        });
        if (records.length && $scope.streamMetadata) {
            $scope.firstRecordArrived = $scope.firstRecordArrived || new Date().getTime();
            $scope.streamMetadata.metricsLatency = $scope.firstRecordArrived - $scope.streamStartTime;
            console.log("Metrics latency", $scope.streamMetadata.metricsLatency);
            $scope.$broadcast("newRecords", records);
            console.log(records);
        }
    }

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
            },
            controller: UploadVideoDialogController
        });

        function UploadVideoDialogController($scope, $mdDialog, metadata, Upload) {
            $scope.metadata = metadata;
            $scope.Upload = Upload;
            $scope.uploadVideo = function(file, callback) {
                $scope.uploadSuccess = undefined;
                $scope.uploadError = undefined;
                s3Client.putObject({
                    Key: "raw_uploads/" + new Date().getTime() + "_" + file.name,
                    Body: file,
                    ContentType: file.type
                }, function(err, data) {
                    if (err) {
                        return callback(err);
                    }
                    $scope.latestUpload = data;
                    callback(null, data);
                });
            };

            $scope.saveVideo = function() {
                $scope._file = $scope.uploadVideoForm.video_file;
                if ($scope._file.$valid) {
                    $scope.inProgress = true;
                    $scope.uploadVideo($scope.file, function(err, response) {
                        if (err) {
                            $scope.inProgress = false;
                            console.error(err);
                            return;
                        }
                        $scope.inProgress = false;
                        $scope.closeDialog();
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
    }

}]);