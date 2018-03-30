var app = angular.module('dashboardApp', ['ngFileUpload', 'ngMaterial'])
    .config(function($mdThemingProvider) {
        $mdThemingProvider.theme('default')
            .primaryPalette('orange')
            .accentPalette('teal');
    });