app.controller('MetricsChartController', ['$scope', '$http', '$timeout', '$filter', function($scope, $http, $timeout, $filter) {
    var $ = angular.element;
    var recordsBuffer = [];

    $scope.metricsConfigs = [{
        displayName: "Face Pose",
        plottingFactors: ["Pose.Pitch", "Pose.Roll", "Pose.Yaw"],
        yAxisLabel: "Face  Pose  Angle  ( deg )",
        yMax: 90,
        yMin: -90,
        units: "deg",
        precision: 1
    }, {
        displayName: "Rotational Motion",
        plottingFactors: ["RotationalVelocity"],
        thresholds: [10, 20, 30, 45],
        yAxisLabel: "Change  in  Head Orientation  (deg / sec)",
        yMax: 60,
        yMin: 0,
        precision: 0,
        units: "deg / sec"
    }, {
        displayName: "Translational Motion",
        plottingFactors: ["TranslationalVelocity"],
        thresholds: [0.20, 0.40, 0.80, 1.20],
        yAxisLabel: "Velocity  of  Face Center  (face lengths / sec)",
        yMax: 1.6,
        yMin: 0,
        precision: 2,
        units: "face lengths / sec"
    }];

    $scope.plottingHistorySettings = [{
        interval: 30 * 1000, // in milliseconds
        displayName: 'Last 30 sec'
    }, {
        interval: 60 * 1000,
        displayName: 'Last 1 min'
    }, {
        interval: 3 * 60 * 1000,
        displayName: 'Last 3 min'
    }, {
        interval: 5 * 60 * 1000,
        displayName: 'Last 5 min'
    }];
    $scope.threshold_colors = ["#009966", "#ffde33", "#ff9933", "#cc0033", "#660099"];

    $scope.selectedMetric = $scope.metricsConfigs[1];

    $scope.selectedPlotHistory = $scope.plottingHistorySettings[1];

    var flatten = function(obj, name, stem) {
        var merge = function(objects) {
            var out = {};
            for (var i = 0; i < objects.length; i++) {
                for (var p in objects[i]) {
                    out[p] = objects[i][p];
                }
            }
            return out;
        };
        var out = {};
        var newStem = (typeof stem !== 'undefined' && stem !== '') ? stem + '.' + name : name;
        if (typeof obj !== 'object') {
            out[newStem] = obj;
            return out; 
        }
        for (var p in obj) {
            var prop = flatten(obj[p], p, newStem);
            out = merge([out, prop]);
        }
        return out;
    };

    function getTimeLabel(tMillis, relative) {
        var date = new Date(Math.round(tMillis));
        return relative ? $filter('date')(date, 'm:ss') : $filter('date')(date, "h:mm:ss a");
    }

    $scope.init = function() {
        var initChart = function() {
            $scope.raw_metrics_echart = echarts.init($("#chart-metrics-raw").get(0));
            $scope.raw_metrics_chart_opts = {
                textStyle: {
                    fontFamily: 'Ubuntu',
                    fontSize: 16
                },
                title: {
                    text: $scope.selectedMetric.displayName,
                    left: 'center',
                    textStyle: {
                        fontFamily: 'Ubuntu'
                    }
                },
                tooltip: {
                    trigger: 'axis',
                    formatter: function(_params) {
                        var ret = "";
                        var timestamp = _params[0].axisValue;
                        var startTime = ($scope.streamMetadata || {}).startTimestamp || ($scope.staticVideo[0] || {}).startTimestamp || 0;
                        var timeDisplay = getTimeLabel(timestamp - startTime, startTime);
                        ret = "<b><i class='fa fa-clock'></i>&nbsp;Session Time - " + timeDisplay + "</b>";
                        ret += "<br>";
                        _params.forEach(function(params) {
                            ret += "<br>";
                            ret += "<span style='color:%c;'><i class='fa fa-circle'></i></span>&nbsp; &nbsp;" + params.seriesName + "&nbsp; &nbsp;<b>" +
                                params.value.toFixed($scope.selectedMetric.precision || 1) + "&nbsp;" + $scope.selectedMetric.units + "</b>";
                            ret = ret.replace("%c", params.color);
                        });
                        return ret;
                    }
                },
                xAxis: {
                    data: [],
                    name: $scope.selectedMetric.xAxisLabel || "Time",
                    nameLocation: 'center',
                    nameGap: 35,
                    axisLabel: {
                        formatter: function(value) {
                            if (typeof value !== 'string' || parseInt(value))
                                return getTimeLabel(parseInt(value));
                            return value;
                        },
                        fontSize: 15
                    },
                    nameTextStyle: {
                        fontWeight: 'bold'
                    }
                },
                yAxis: {
                    max: isNaN($scope.selectedMetric.yMax) ? 'dataMax' : $scope.selectedMetric.yMax,
                    min: isNaN($scope.selectedMetric.yMin) ? 'dataMin' : $scope.selectedMetric.yMin,
                    splitLine: {
                        show: true
                    },
                    name: $scope.selectedMetric.yAxisLabel || "",
                    nameLocation: 'center',
                    nameGap: 50,
                    nameRotate: 90,
                    axisLabel: {
                        fontSize: 15
                    },
                    nameTextStyle: {
                        fontWeight: 'bold'
                    }
                },
                toolbox: {
                    left: '8%',
                    feature: {
                        dataZoom: {
                            title: {
                                zoom: 'Area zooming',
                                back: 'Restore area zooming'
                            },
                            yAxisIndex: 'none'
                        },
                        restore: {
                            title: 'Restore'
                        },
                        saveAsImage: {
                            title: 'Save image'
                        }
                    }
                }
            }
        };
        $timeout(initChart, 100);
    };

    var handleNewRecords = function(event, records) {
        records.forEach(function(record, index) {
            var face = record.data.FaceSearchResponse[0].DetectedFace;
            record.data.FaceSearchResponse[0].DetectedFace = flatten(face);

            Object.keys(record.data.InputInformation.KinesisVideo).forEach(function(key) {
                record.data.FaceSearchResponse[0].DetectedFace[key] = record.data.InputInformation.KinesisVideo[key];
            });
        });
        recordsBuffer = recordsBuffer.concat(records);
        if (chartUpdateLocked) return;
        var facesData = records.map(function(record) {
            return record.data.FaceSearchResponse[0].DetectedFace;
        });
        var plotOptions = getPlotOptions(facesData);
        $scope.raw_metrics_chart_opts.xAxis.data = plotOptions.xAxis.data || $scope.raw_metrics_chart_opts.xAxis.data;
        $scope.raw_metrics_chart_opts.series = plotOptions.series || $scope.raw_metrics_chart_opts.series;
        $scope.raw_metrics_chart_opts.visualMap = plotOptions.visualMap;
        $scope.raw_metrics_echart.setOption($scope.raw_metrics_chart_opts);
    };

    var getPlotOptions = function(facesData) {
        var opts = {
            series: [],
            xAxis: {}
        };
        var previousSeries = $scope.raw_metrics_chart_opts.series || [];
        var previousTimestamps = $scope.raw_metrics_chart_opts.xAxis.data || [];
        var recentFaceData = facesData.filter(function(face) {
            return (1000 * face.Timestamp) > ($scope.latestMetricTimestamp || 0);
        });
        $scope.selectedMetric.plottingFactors.forEach(function(factor, index) {
            var previousData = (previousSeries[index] || {}).data || [];
            var joinedData = previousData.concat(recentFaceData.map(function(face) { return face[factor]; }))
            var seriesItem = {
                name: factor,
                type: 'line',
                data: joinedData,
                symbolSize: 7,
                itemStyle: {
                    normal: {
                        lineStyle: {
                            width: 2
                        }
                    },
                    emphasis: {
                        lineStyle: {
                            width: 4
                        }
                    }
                },
                markLine: {
                    silent: true,
                    lineStyle: {
                        normal: {
                            color: 'black'
                        }
                    },
                    data: ($scope.selectedMetric.thresholds || []).map(function(v) {
                        return { yAxis: v };
                    })
                }, 
                smooth: true
            };
            opts.series.push(seriesItem);
        });
        opts.xAxis.data = previousTimestamps.concat(recentFaceData.map(function(face) { return Math.ceil(1000 * face.Timestamp); }));
        opts.visualMap = $scope.selectedMetric.thresholds ? getVisualMapPieces() : null;
        $scope.latestMetricTimestamp = opts.xAxis.data[opts.xAxis.data.length - 1];
        while (opts.xAxis.data[0] < $scope.latestMetricTimestamp - $scope.selectedPlotHistory.interval) {
            opts.xAxis.data.shift();
            opts.series.forEach(function(series) {
                series.data.shift();
            });
        }
        if ($scope.selectedMetric.thresholds) {
            opts.series.forEach(function(series) {
                series.areaStyle = getAreaGradient(series.data);
            });
        }
        return opts;
    };

    var getAreaGradient = function(data) {
        var pieces = [{
            color: $scope.threshold_colors[3]
        }, {
            color: $scope.threshold_colors[2]
        }, {
            color: $scope.threshold_colors[1]
        }, {
            color: $scope.threshold_colors[0]
        }];
        var _pieces = [];
        var dataMax = Math.max.apply(Math, data);
        var thresholdIndex = $scope.selectedMetric.thresholds.findIndex(function(thresholdValue) {
            return thresholdValue >= dataMax;
        });
        if (thresholdIndex === undefined) {
            thresholdIndex = $scope.selectedMetric.thresholds.length - 1;
        }
        for (var i = pieces.length - 1; i >= pieces.length - 1 - thresholdIndex; i--) {
            _pieces = [{ color: pieces[i].color }].concat(_pieces);
        }
        _pieces.forEach(function(piece, index) {
            piece.offset = index / ((_pieces.length - 1) || 1);
        });
        return {
            normal: {
                color: new echarts.graphic.LinearGradient(0, 0, 0, 1, _pieces),
                origin: 'start'
            }
        };
    };

    var getVisualMapPieces = function() {
        return {
            top: 10,
            right: 10,
            itemGap: 5,
            itemWidth: 15,
            itemHeight: 0.75 * 14,
            precision: isNaN($scope.selectedMetric.precision) ? 1 : $scope.selectedMetric.precision,
            pieces: [{
                gt: 0,
                lte: $scope.selectedMetric.thresholds[0],
                color: $scope.threshold_colors[0]
            }, {
                gt: $scope.selectedMetric.thresholds[0],
                lte: $scope.selectedMetric.thresholds[1],
                color: $scope.threshold_colors[1]
            }, {
                gt: $scope.selectedMetric.thresholds[1],
                lte: $scope.selectedMetric.thresholds[2],
                color: $scope.threshold_colors[2]
            }, {
                gt: $scope.selectedMetric.thresholds[2],
                lte: $scope.selectedMetric.thresholds[3],
                color: $scope.threshold_colors[3]
            }, {
                gt: $scope.selectedMetric.thresholds[3],
                color: $scope.threshold_colors[4]
            }]
        }
    };

    var chartUpdateLocked = false;

    $scope.plotHistoryChanged = function() {
        chartUpdateLocked = true;
        $scope.raw_metrics_chart_opts.xAxis.data = recordsBuffer.map(function(record) {
            var face = record.data.FaceSearchResponse[0].DetectedFace;
            return Math.round(1000 * face.Timestamp);
        });
        $scope.raw_metrics_chart_opts.series = $scope.selectedMetric.plottingFactors
            .map(function(factor) {
                return {
                    name: factor,
                    type: 'line',
                    data: recordsBuffer.map(function(record) {
                        return record.data.FaceSearchResponse[0].DetectedFace[factor]
                    }),
                    smooth: true
                }
            });
        $scope.latestMetricTimestamp = $scope.raw_metrics_chart_opts.xAxis.data[$scope.raw_metrics_chart_opts.xAxis.data.length - 1];
        while ($scope.raw_metrics_chart_opts.xAxis.data[0] < $scope.latestMetricTimestamp - $scope.selectedPlotHistory.interval) {
            $scope.raw_metrics_chart_opts.xAxis.data.shift();
            $scope.raw_metrics_chart_opts.series.forEach(function(series) {
                series.data.shift();
            });
        }
        if ($scope.selectedMetric.thresholds) {
            $scope.raw_metrics_chart_opts.series.forEach(function(series) {
                series.areaStyle = getAreaGradient(series.data);
            });
        }
        $scope.raw_metrics_echart.setOption($scope.raw_metrics_chart_opts);
        chartUpdateLocked = false;
    };

    $scope.metricChanged = function() {
        chartUpdateLocked = true;
        echarts.dispose($scope.raw_metrics_echart);
        $scope.raw_metrics_echart = echarts.init($("#chart-metrics-raw").get(0));
        $scope.raw_metrics_chart_opts.title.text = $scope.selectedMetric.displayName;
        $scope.raw_metrics_chart_opts.yAxis.name = $scope.selectedMetric.yAxisLabel;
        $scope.raw_metrics_chart_opts.yAxis.max = isNaN($scope.selectedMetric.yMax) ? 'dataMax' : $scope.selectedMetric.yMax;
        $scope.raw_metrics_chart_opts.yAxis.min = isNaN($scope.selectedMetric.yMin) ? 'dataMin' : $scope.selectedMetric.yMin;
        $scope.raw_metrics_chart_opts.visualMap = $scope.selectedMetric.thresholds ? getVisualMapPieces() : null;
        $scope.plotHistoryChanged();
        chartUpdateLocked = false;
    };

    $scope.$on("newRecords", handleNewRecords);

}]);