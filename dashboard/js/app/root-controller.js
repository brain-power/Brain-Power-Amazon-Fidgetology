app.controller('RootController', ['$scope', '$http', '$timeout', '$mdDialog', 'Upload', function($scope, $http, $timeout, $mdDialog, Upload) {
    var s3Client,
        kinesis;
    $http.get(API_ENDPOINT + "/Config")
        .then(function(response) {
            $scope.Config = response.data;
            $scope.Config.API_ENDPOINT = API_ENDPOINT;
            AWS.config.update({
                region: $scope.Config.REGION || "us-east-1",
                credentials: new AWS.CognitoIdentityCredentials({
                    IdentityPoolId: $scope.Config.IdentityPoolId
                })
            });
            s3Client = new AWS.S3({
                params: { Bucket: $scope.Config.UPLOADS_BUCKET_NAME }
            });
            kinesis = new AWS.Kinesis();
            initKinesis();
        });

    function initKinesis() {
        var DEFAULT_RECORDS_LIMIT;
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
                DEFAULT_RECORDS_LIMIT = 10;
                processRecords(data.Records);
                $timeout(getNextShard, POLLING_INTERVAL);
            } else {
                DEFAULT_RECORDS_LIMIT = 1000;
                getNextShard();
            }
        }

        kinesis.getShardIterator({ ShardIteratorType: 'TRIM_HORIZON', StreamName: $scope.Config.KDS_PROCESSED_STREAM_NAME, ShardId: SHARD_ID }, defaultCallback);
    }

    function processRecords(records) {
        records.forEach(function(record) {
            record.data = new TextDecoder("utf-8").decode(record.Data);
            record.data = JSON.parse(record.data);
        });
        if (records.length)
            console.log(records);
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
}]);