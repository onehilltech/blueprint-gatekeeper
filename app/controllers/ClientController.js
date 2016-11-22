'use strict';

var blueprint = require ('@onehilltech/blueprint')
  , mongodb   = require ('@onehilltech/blueprint-mongodb')
  , ResourceController = mongodb.ResourceController
  , Policy    = blueprint.Policy
  , scope     = require ('../../lib/scope')
  ;

var Client = require ('../models/Client')
  ;

function ClientController () {
  ResourceController.call (this, {model: Client});
}

module.exports = ClientController;

blueprint.controller (ClientController, ResourceController);

ClientController.prototype.create = function () {
  return ResourceController.prototype.create.call (this, {
    on: {
      authorize: function (req, callback) {
        Policy.Definition (
          Policy.assert ('has_role', scope.client.create)
        ).evaluate (req, callback);
      }
    }
  })
};

ClientController.prototype.update = function () {
  return ResourceController.prototype.update.call (this, {
    on: {
      authorize: function (req, callback) {
        Policy.Definition (
          Policy.assert ('has_role', scope.client.update)
        ).evaluate (req, callback);
      }
    }
  })
};

ClientController.prototype.delete = function () {
  return ResourceController.prototype.delete.call (this, {
    on: {
      authorize: function (req, callback) {
        Policy.Definition (
          Policy.assert ('has_role', scope.client.delete)
        ).evaluate (req, callback);
      }
    }
  })
};
