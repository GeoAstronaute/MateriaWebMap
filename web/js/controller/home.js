app.controller('HomeController', function($scope, $http, $mdDialog, $timeout,
  $mdMedia, $mdToast, esriLoader, pins, categories, esriMapPoint, $state, $stateParams, $filter, basemaps, esriMapWidget) {
  var self = this
  $scope.basemaps = basemaps.data.rows
  $scope.pins = pins.data.rows
  $scope.pinsCount = pins.data.count
  $scope.categories = categories.data.rows
  for (i in $scope.pins) {
    for (y in $scope.categories) {
      $scope.categories[y].visible = true
      if ($scope.categories[y].id == $scope.pins[i].id_category) {
        $scope.pins[i].style = $scope.categories[y].style
      }
    }
  }
  var last = {
    bottom: true,
    top: false,
    left: false,
    right: false
  };
  var originatorEv;
  this.openMenu = function($mdOpenMenu, ev) {
    originatorEv = ev;
    $mdOpenMenu(ev);
  };
  originatorEv = null;

  esriLoader.require([
    "esri/Map",
    "esri/views/SceneView"
  ], function(Map, SceneView) {
    var map = new Map({
      basemap: "hybrid"
    });
    $scope.map = map
    for (i in $scope.basemaps) {
      if ($scope.basemaps[i].name == 'dark-gray') {
        $scope.map.basemap = $scope.basemaps[i].name
        $scope.map.basemapTemplateUrl = $scope.basemaps[i].templateUrl
      }
    }
    self.view = new SceneView({
      container: "viewDiv",
      map: map,
      zoom: 6,
      center: [1, 47],
      heading: 30,
      tilt: 20
    });
    var view = self.view
    view.then(function(view) {
      view.goTo({
    center: [1, 47],
    zoom: 7,
    heading: 30,
    tilt: 60
  })
      $scope.view = view
      $scope.center = self.view.center
      self.view.watch('center', function() {
        $scope.center = self.view.center
        $scope.$applyAsync('center');
      })
      $scope.changeBasemap = function(newVal) {
        $scope.map.basemap = newVal.name
        $scope.map.basemapTemplateUrl = newVal.templateUrl
      }
      esriMapWidget.search(view)
      esriMapWidget.Legend(view)

      var dataSets = []
      console.log("View :", view)
      for (i in $scope.categories) {
        var category = $scope.categories[i]
        var categoryDataset = $filter('pinsByCategories')($scope.pins, category.id)
        dataSets.push(categoryDataset)
        console.log("Result of categoryDataset :", categoryDataset)
        esriMapPoint.addPointCollection(map, categoryDataset, category.name).then(function(layer) {
          console.log("newLayer created :", layer)
        })
      }
      $scope.changeLayerVisibility = function(layer) {
        console.log("LayerVisibility Change :", layer.visible)
      }
      $scope.zoomIn = function(site) {
        view.goTo({
          center: [site.lng, site.lat],
          zoom: 15
        })
      }
      $scope.$watch(function() {
        return $scope.view.zoom
      }, function(newVal, oldVal) {
        console.log("zoom change :", newVal)
        if (newVal > 15) {
          $scope.view.zoom = 15
        }
      })
    });
    originatorEv = null
    $scope.openMenu = function($mdOpenMenu, ev) {
      originatorEv = ev
      $mdOpenMenu(ev)
    }
    $scope.edit = function(ev, layer) {
      console.log("layer in template :", layer)
      var useFullScreen = ($mdMedia('sm') || $mdMedia('xs')) && $scope.customFullscreen;
      $mdDialog.show({
          locals: {
            layer: layer
          },
          controller: EditTmplController,
          templateUrl: './views/template/edit.tmpl.html',
          parent: angular.element(document.body),
          targetEvent: ev,
          clickOutsideToClose: true,
          fullscreen: useFullScreen
        })
        .then(function(layer) {
          console.log("Then of show dialog :", layer)
        }, function() {
          $scope.status = 'You cancelled the dialog.';
        });
      $scope.$watch(function() {
        return $mdMedia('xs') || $mdMedia('sm');
      }, function(wantsFullScreen) {
        $scope.customFullscreen = (wantsFullScreen === true);
      });
    }

    function EditTmplController($scope, $mdDialog, layer) {
      $scope.hide = function() {
        $mdDialog.hide();
      };
      $scope.cancel = function() {
        $mdDialog.cancel();
      };
      $scope.answer = function(answer) {
        $mdDialog.hide(answer);
      };
      $scope.layer = layer
      console.log("Layer to edit :", layer)
      if (JSON.parse(layer.style)) {
        $scope.layer.style = JSON.parse(layer.style)
      }

      $scope.options = {
        format: 'hex'
      }

      $scope.saveEdits = function(layer) {
        console.log("Layer to edit :", layer)
        var newLayer = {}
        newLayer.name = layer.name
        newLayer.id = layer.id
        newLayer.style = JSON.stringify(layer.style)
        console.log("Layer to post :", newLayer)

        $http.put('./api/PUT/category/' + newLayer.id, newLayer).success(function(updatedLayer) {
          console.log("The layer has been successfully updated :", updatedLayer)

          $mdDialog.hide()
          $state.transitionTo($state.current, $stateParams, {
            reload: true,
            inherit: false,
            notify: true
          });
        })
      }
    }
    $scope.editCategory = function(ev, layer) {
      console.log("layer in template :", layer)
      var useFullScreen = ($mdMedia('sm') || $mdMedia('xs')) && $scope.customFullscreen;
      $mdDialog.show({
          locals: {
            layer: layer
          },
          controller: EditCategoryTmplController,
          templateUrl: './views/template/addPin.tmpl.html',
          parent: angular.element(document.body),
          targetEvent: ev,
          clickOutsideToClose: true,
          fullscreen: useFullScreen
        })
        .then(function(layer) {
          console.log("Then of show dialog :", layer)
        }, function() {
          $scope.status = 'You cancelled the dialog.';
        });
      $scope.$watch(function() {
        return $mdMedia('xs') || $mdMedia('sm');
      }, function(wantsFullScreen) {
        $scope.customFullscreen = (wantsFullScreen === true);
      });
    }


    function EditCategoryTmplController($scope, $mdDialog, layer) {
      $scope.hide = function() {
        $mdDialog.hide();
      };
      $scope.cancel = function() {
        $mdDialog.cancel();
      };
      $scope.answer = function(answer) {
        $mdDialog.hide(answer);
      };
      $scope.layer = layer

      console.log("Layer to edit :", layer)
      if (typeof layer.style == 'string') {
        if (JSON.parse(layer.style)) {
          $scope.layer.style = JSON.parse(layer.style)
        }
      }


      $scope.options = {
        format: 'hex'
      }
      $scope.saveEdits2 = function(pin, layer) {
        console.log("Layer to edit 2:", pin)
        pin.id_category = layer.id
        $http.post('./api/POST/pin/', pin).success(function(updatedLayer) {
          console.log("The layer has been successfully updated :", updatedLayer)
          $mdDialog.hide()
          $state.transitionTo($state.current, $stateParams, {
            reload: true,
            inherit: false,
            notify: true
          });
        })
      }
    }
    $scope.addCategory = function(ev) {
      var useFullScreen = ($mdMedia('sm') || $mdMedia('xs')) && $scope.customFullscreen;
      $mdDialog.show({
          controller: AddCategoryTmplController,
          templateUrl: './views/template/addCategory.tmpl.html',
          parent: angular.element(document.body),
          targetEvent: ev,
          clickOutsideToClose: true,
          fullscreen: useFullScreen
        })
        .then(function(layer) {
          console.log("Then of show dialog :", layer)
        }, function() {
          $scope.status = 'You cancelled the dialog.';
        });
      $scope.$watch(function() {
        return $mdMedia('xs') || $mdMedia('sm');
      }, function(wantsFullScreen) {
        $scope.customFullscreen = (wantsFullScreen === true);
      });
    }

    function AddCategoryTmplController($scope, $mdDialog) {
      $scope.hide = function() {
        $mdDialog.hide();
      };
      $scope.cancel = function() {
        $mdDialog.cancel();
      };
      $scope.answer = function(answer) {
        $mdDialog.hide(answer);
      };
      $scope.layer = {}
      $scope.saveEdits3 = function(category) {
        $scope.layer.style = JSON.stringify(category.style)
        $http.post('./api/POST/categorie/', category).success(function(updatedLayer) {
          console.log("The layer has been successfully updated :", updatedLayer)
          $mdDialog.cancel()
          $state.transitionTo($state.current, $stateParams, {
            reload: true,
            inherit: false,
            notify: true
          }).fail(function(err) {
            console.log("Err :", err)
          });
        })
      }
    }

    $scope.editPin = function(ev, pin) {
      var useFullScreen = ($mdMedia('sm') || $mdMedia('xs')) && $scope.customFullscreen;
      $mdDialog.show({
          locals: {
            pin: pin
          },
          controller: EditPinTmplController,
          templateUrl: './views/template/editPin.tmpl.html',
          parent: angular.element(document.body),
          targetEvent: ev,
          clickOutsideToClose: true,
          fullscreen: useFullScreen
        })
        .then(function(layer) {
          console.log("Then of show dialog :", layer)
        }, function() {
          $scope.status = 'You cancelled the dialog.';
        });
      $scope.$watch(function() {
        return $mdMedia('xs') || $mdMedia('sm');
      }, function(wantsFullScreen) {
        $scope.customFullscreen = (wantsFullScreen === true);
      });
    }

    function EditPinTmplController($scope, $mdDialog, pin) {
      $scope.pin = pin
      $scope.hide = function() {
        $mdDialog.hide();
      };
      $scope.cancel = function() {
        $mdDialog.cancel();
      };
      $scope.answer = function(answer) {
        $mdDialog.hide(answer);
      };
      $scope.layer = {}
      $scope.saveEdits4 = function(category) {

        $http.put('./api/PUT/pin/' + category.id, category).success(function(updatedLayer) {
          console.log("The layer has been successfully updated :", updatedLayer)
          $mdDialog.cancel()
          $state.transitionTo($state.current, $stateParams, {
            reload: true,
            inherit: false,
            notify: true
          }).fail(function(err) {
            console.log("Err :", err)
          });
        })
      }
    }
    $scope.toastPosition = angular.extend({}, last);
    $scope.getToastPosition = function() {
      sanitizePosition();
      return Object.keys($scope.toastPosition)
        .filter(function(pos) {
          return $scope.toastPosition[pos];
        })
        .join(' ');
    };

    function sanitizePosition() {
      var current = $scope.toastPosition;
      if (current.bottom && last.top) current.top = false;
      if (current.top && last.bottom) current.bottom = false;
      if (current.right && last.left) current.left = false;
      if (current.left && last.right) current.right = false;
      last = angular.extend({}, current);
    }
    $scope.confirmDeletePin = function(ev, pin) {
      console.log(pin)
      $scope.pin = pin
        // Appending dialog to document.body to cover sidenav in docs app
      var confirm = $mdDialog.confirm()
        .title('You are going to delete a location :', pin.name)
        .textContent('All information about this point will be definitevely lost. Are you sure?')
        .ariaLabel('Warn')
        .targetEvent(ev)
        .ok('Yes')
        .cancel('Cancel');
      $mdDialog.show(confirm, pin).then(function(pin) {
        console.log("g")
        $http.delete('./api/pins/' + $scope.pin.id).success(function() {
          $mdToast.show(
            $mdToast.simple()
            .textContent("operation success, reloading...")
            .position($scope.getToastPosition())
            .hideDelay(1000)
          ).then(function() {
            $state.transitionTo($state.current, $stateParams, {
              reload: true,
              inherit: false,
              notify: true
            }).fail(function(err) {
              console.log("Err :", err)
            });
          })
        })
      }, function() {
        $mdToast.show(
          $mdToast.simple()
          .textContent("operation aborded")
          .position($scope.getToastPosition())
          .hideDelay(1000)
        )
      });
    }
    $scope.confirmDeleteCategory = function(ev, pin) {
      console.log(pin)
      $scope.category = pin
        // Appending dialog to document.body to cover sidenav in docs app
      var confirm = $mdDialog.confirm()
        .title('You are going to delete a Category :', $scope.category.name)
        .textContent('All information about this category will be definitevely lost and all related points location. Are you sure?')
        .ariaLabel('Warn')
        .targetEvent(ev)
        .ok('Yes')
        .cancel('Cancel');
      $mdDialog.show(confirm, pin).then(function(pin) {
        console.log("g")
        $http.delete('./api/category/' + $scope.category.id).success(function() {
          $mdToast.show(
            $mdToast.simple()
            .textContent("operation success, reloading...")
            .position($scope.getToastPosition())
            .hideDelay(1000)
          ).then(function() {
            $state.transitionTo($state.current, $stateParams, {
              reload: true,
              inherit: false,
              notify: true
            }).fail(function(err) {
              console.log("Err :", err)
            });
          })
        })
      }, function() {
        $mdToast.show(
          $mdToast.simple()
          .textContent("operation aborded")
          .position($scope.getToastPosition())
          .hideDelay(1000)
        )
      });
    }
  })
})