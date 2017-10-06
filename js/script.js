/**
 * Create the module. Set it up to use html5 mode.
 */
window.MyOpenItems = angular.module('myOpenItems', ['elasticsearch'],
    ['$locationProvider', function($locationProvider){
        $locationProvider.html5Mode(true);
    }]
);

/**
 * Create a service to power calls to Elasticsearch. We only need to
 * use the _search endpoint.
 */
MyOpenItems.factory('itemService',
    ['$q', 'esFactory', '$location', function($q, elasticsearch, $location){
        var client = elasticsearch({
            host: $location.host() + ":9200"
        });

        /**
         * Given a term and an offset, load another round of 10 items.
         *
         * Returns a promise.
         */
        var search = function(query, offset){
            var deferred = $q.defer();
            
            client.search({
                "index": 'data',
                "type": 'autor',
                "body": {
                    "size": 10,
                    "from": (offset || 0) * 10,
                    "query": query,
		        "aggs" : {
                    "sexo" : {
                        "terms" : { "field" : "sexo" }
                    },
                    "ano_nacimiento" : {
                        "terms" : { "field" : "ano_nacimiento" }
                    },
                    "ano_fallecimiento" : {
                        "terms" : { "field" : "ano_fallecimiento" }
                    },
                    "pais" : {
                        "terms" : { "field" : "pais" }
                    }
			     }
	           }
            }).then(function(result) {
                deferred.resolve(result);
            }, deferred.reject);

            return deferred.promise;
        };


        return {
            "search": search
        };
    }]
);

MyOpenItems.filter('removeWikidataUri', function () {
    return function (text) {
        var str = text.replace('http://www.wikidata.org/entity/', '');
        return str;
    };
});

MyOpenItems.filter('customSplitString', function() {
  return function(input) {
       var arr = JSON.parse(input);
       return arr;
     };
});

/**
 * Create a controller to interact with the UI.
 */
MyOpenItems.controller('itemCtrl',
    ['itemService', '$scope', '$location', function(items, $scope, $location){
        // Provide some nice initial choices
        var initChoices = [
            "Cervantes",
            "Lope de Vega",
            "Garcilaso",
            "Luis",
            "Carlos",
            "Gustavo",
            "Luis",
            "Felipe"
        ];
        var idx = Math.floor(Math.random() * initChoices.length);

        // Initialize the scope defaults.
        $scope.items = [];        // An array of item results to display
        $scope.facetsexo = [];        // An array of facet sexo results to display
        $scope.facetnacimiento = [];        // An array of facet fecha nacimiento results to display
        $scope.facetfallecimiento = [];        // An array of facet fecha fallecimiento results to display
        $scope.facetpais = [];        // An array of facet pais results to display
        $scope.page = 0;            // A counter to keep track of our current page
        $scope.allResults = false;  // Whether or not all results have been found.
        
        $scope.selectedFacetNacimiento = {};
        $scope.selectedFacetFallecimiento = {};
        $scope.selectedFacetPais = {};
        $scope.selectedFacetSexo = {};
        // And, a random search term to start if none was present on page load.
        $scope.searchTerm = $location.search().q || initChoices[idx];
                
        $scope.arrayToString = function(string){
            return string.join(", ");
        };

        /**
         * A fresh search. Reset the scope variables to their defaults, set
         * the q query parameter, and load more results.
         */
        $scope.search = function(){
            $scope.page = 0;
            $scope.items = [];
            $scope.facetsexo = [];
            $scope.facetnacimiento = [];
            $scope.facetfallecimiento = [];
            $scope.facetpais = [];
            $scope.allResults = false;   
            $location.search({'q': $scope.searchTerm});
            
            $scope.query = {
		        "bool": {
		           "must": { "match": { "nombre.folded": $scope.searchTerm }, },
                }
            };
            
            $scope.loadMore();
        };

        /**
         * Load the next page of results, incrementing the page counter.
         * When query is finished, push results onto $scope.items and decide
         * whether all results have been returned (i.e. were 10 results returned?)
         */
        $scope.loadMore = function(){
            $scope.facetsexo = [];
            $scope.facetnacimiento = [];
            $scope.facetfallecimiento = [];
            $scope.facetpais = [];
            
            items.search($scope.query, $scope.page++).then(function(results){
                if(results.hits.hits.length !== 10){
                    $scope.allResults = true;
                }

                var i = 0;
                for(;i < results.hits.hits.length; i++){
                    $scope.items.push(results.hits.hits[i]._source);
                }

                var i = 0;
                for(;i < results.aggregations.sexo.buckets.length; i++){
                    $scope.facetsexo.push(results.aggregations.sexo.buckets[i]);
                }

                var i = 0;
                for(;i < results.aggregations.ano_nacimiento.buckets.length; i++){
                    $scope.facetnacimiento.push(results.aggregations.ano_nacimiento.buckets[i]);
                }

                var i = 0;
                for(;i < results.aggregations.ano_fallecimiento.buckets.length; i++){
                    $scope.facetfallecimiento.push(results.aggregations.ano_fallecimiento.buckets[i]);
                }

                var i = 0;
                for(;i < results.aggregations.pais.buckets.length; i++){
                    $scope.facetpais.push(results.aggregations.pais.buckets[i]);
                }

            });
        };
        
        $scope.createFilterFacetNacimiento = function(){
            
            $scope.queryFacetNacimiento = [];
            for(var key in $scope.selectedFacetNacimiento){
                for(var key2 in $scope.selectedFacetNacimiento[key]){
                    if($scope.selectedFacetNacimiento[key][key2]){
                        $scope.queryFacetNacimiento.push(key2);
                    }    
                }
            }
            
            if($scope.queryFacetNacimiento.length != 0)
                $scope.filter.push({"terms": {"ano_nacimiento": $scope.queryFacetNacimiento}});
        }
        
        $scope.createFilterFacetFallecimiento = function(){
            
            $scope.queryFacetFallecimiento = [];
            for(var key in $scope.selectedFacetFallecimiento){
                for(var key2 in $scope.selectedFacetFallecimiento[key]){
                    if($scope.selectedFacetFallecimiento[key][key2]){
                        $scope.queryFacetFallecimiento.push(key2);
                    }    
                }
            }
            
            if($scope.queryFacetFallecimiento.length != 0)
                $scope.filter.push({"terms": {"ano_fallecimiento": $scope.queryFacetFallecimiento}});
        }
        
        
        $scope.createFilterFacetPais = function(){
            
            $scope.queryFacetPais = [];
            for(var key in $scope.selectedFacetPais){
                for(var key2 in $scope.selectedFacetPais[key]){
                    if($scope.selectedFacetPais[key][key2]){
                        $scope.queryFacetPais.push(key2);
                    }    
                }
            }
            
            if($scope.queryFacetPais.length != 0)
                $scope.filter.push({"terms": {"pais": $scope.queryFacetPais}});
        }
        
        $scope.createFilterFacetSexo = function(){
            
            $scope.queryFacetSexo = [];
            for(var key in $scope.selectedFacetSexo){
                for(var key2 in $scope.selectedFacetSexo[key]){
                    if($scope.selectedFacetSexo[key][key2]){
                        $scope.queryFacetSexo.push(key2);
                    }    
                }
            }
            
            if($scope.queryFacetSexo.length != 0)
                $scope.filter.push({"terms": {"sexo": $scope.queryFacetSexo}});
        }        
        
        $scope.applyFiltersQuery = function(){
            
            $scope.page = 0;
            $scope.items = [];
            
            $scope.filter = [];
            
            $scope.createFilterFacetNacimiento();
            $scope.createFilterFacetFallecimiento();
            $scope.createFilterFacetPais();
            $scope.createFilterFacetSexo();
            
            $scope.query = {
		         "bool": {
		           "must": { "match": { "nombre.folded": $scope.searchTerm }, },
                   "filter": $scope.filter
                   }
            };
            
            $scope.loadMore();
        }
        
        // Load results on first run
        $scope.search();
    }]
);
