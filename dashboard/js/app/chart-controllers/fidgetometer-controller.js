app.controller('FidgetometerController', ['$scope', '$http', '$timeout', '$filter', function($scope, $http, $timeout, $filter) {
    $scope.threshold_colors = ["#009966", "#ffde33", "#ff9933", "#cc0033", "#660099"];
    $scope.averageFidgetQuotient = 0;
    $scope.init = function() {
        var initChart = function() {
            $scope.fidgetometer_echart = echarts.init($("#fidgetometer").get(0));
            $scope.fidgetometer_opts = {
                textStyle: {
                    fontFamily: 'Ubuntu',
                    fontSize: 18
                },
                title: {
                    left: 'center',
                    text: 'Fidgetometer',
                    textStyle: {
                        fontSize: 32
                    }
                },
                tooltip: {
                    formatter: "{a} <br/> {c}"
                },
                series: [{
                    name: 'Fidget/Motion Quotient',
                    type: 'gauge',
                    min: 0,
                    max: 100,
                    axisLine: {
                        lineStyle: {
                            width: 20,
                            color: [
                                [0.2, $scope.threshold_colors[0]],
                                [0.35, $scope.threshold_colors[1]],
                                [0.65, $scope.threshold_colors[2]],
                                [0.8, $scope.threshold_colors[3]],
                                [1.0, $scope.threshold_colors[4]]
                            ]
                        }
                    },
                    splitLine: {
                        length: 32
                    },
                    detail: {
                        formatter: '{value}',
                        fontSize: 32,
                        fontWeight: 'bold'
                    },
                    data: [{ value: $scope.averageFidgetQuotient || 0, name: "Fidget Quotient" }]
                }]
            };
            $scope.fidgetometer_echart.setOption($scope.fidgetometer_opts);
        };
        $timeout(initChart, 100);
    };

    function updateFidgetMeter() {
        $scope.fidgetometer_opts.series[0].data[0].value = $scope.averageFidgetQuotient;
        $scope.fidgetometer_echart.setOption($scope.fidgetometer_opts);
    }

    // Fidget Quotient Constants
    var ROTATION_WEIGHT = 0.7;
    var TRANSLATION_WEIGHT = 0.3;
    var ROTATION_NORM = 20; // (deg/sec)
    var TRANSLATION_NORM = 0.1; // (frame distance/sec)
    function computeFidgetQuotient(face) {
        return ROTATION_WEIGHT * (face.RotationalVelocity / ROTATION_NORM) +
            TRANSLATION_WEIGHT * (face.TranslationalVelocity / TRANSLATION_NORM);
    }

    var handleNewRecords = function(event, records) {
        var averageFidgetQuotient = 0;
        records.forEach(function(record) {
            var face = record.data.FaceSearchResponse[0].DetectedFace;
            face.FidgetQuotient = computeFidgetQuotient(face);
            averageFidgetQuotient += (100 * face.FidgetQuotient / records.length);
        });
        $scope.averageFidgetQuotient = Number(averageFidgetQuotient.toFixed(1));
        updateFidgetMeter();
    };

    $scope.$on("newRecords", handleNewRecords);

}]);