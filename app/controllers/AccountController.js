var blueprint  = require ('@onehilltech/blueprint')
  , mongodb    = require ('@onehilltech/blueprint-mongodb')
  , messaging  = blueprint.messaging
  , uid        = require ('uid-safe')
  , async      = require ('async')
  , gatekeeper = require ('../../lib')
  ;

var Account = require ('../models/Account')
  ;

var ResourceController = mongodb.ResourceController
  , Policy = blueprint.Policy
  ;

var gatekeeperConfig;
var tokenStrategy;

const DEFAULT_ACTIVATION_REQUIRED = false;

var activationConfig;

messaging.on ('app.init', function (app) {
  gatekeeperConfig = app.configs.gatekeeper;
  activationConfig = gatekeeperConfig.activation || {};

  tokenStrategy = gatekeeper.tokens (gatekeeperConfig.token);
});

var DEFAULT_ACCOUNT_PROJECTION_EXCLUSIVE = {
  'password': 0,
  '__v': 0
};

function AccountController () {
  ResourceController.call (this, {name: 'account', model: Account, eventPrefix: 'gatekeeper'});
}

blueprint.controller (AccountController, ResourceController);

/**
 * Create a new account.
 *
 * @returns {*}
 */
AccountController.prototype.create = function () {
  var options = {
    on: {
      authorize: function (req, callback) {
        Policy.Definition (
          Policy.or ([
            Policy.assert ('has_scope', gatekeeper.scope.account.create),
            Policy.assert ('has_scope', gatekeeper.scope.superuser)
          ])
        ).evaluate (req, callback);
      },

      prepareDocument: function (req, doc, callback) {
        // Overwrite the current document with one that matches the
        // data model for an account.
        var required = activationConfig.required;

        if (required === undefined)
          required = DEFAULT_ACTIVATION_REQUIRED;

        doc = {
          email : req.body.account.email,
          username : req.body.account.username,
          password : req.body.account.password,
          created_by : req.user,
          activation: {
            required: required
          }
        };

        async.waterfall ([
          function (callback) {
            if (!doc.activation.required)
              return callback (null);

            var opts = {
              payload: {email: doc.email, username: doc.username},
              options: {
                expiresIn: gatekeeperConfig.activation.expiresIn
              }
            };

            tokenStrategy.generateToken (opts, callback);
          }
        ], function (err, token) {
          if (err) return callback (err);
          if (token) doc.activation.token = token;

          return callback (null, doc);
        });
      },

      postExecute: function (req, account, callback) {
        return callback (null, {_id: account._id});
      }
    }
  };

  return ResourceController.prototype.create.call (this, options);
};

/**
 * Get all the accounts in the database. Only administrators can access all the accounts
 * in the database.
 */
AccountController.prototype.getAll = function () {
  var options = {
    on: {
      authorize: function (req, callback) {
        Policy.Definition (
          Policy.assert ('has_scope', gatekeeper.scope.superuser)
        ).evaluate (req, callback);
      },

      prepareProjection: function (req, callback) {
        callback (null, DEFAULT_ACCOUNT_PROJECTION_EXCLUSIVE);
      }
    }
  };

  return ResourceController.prototype.getAll.call (this, options);
};

/**
 * Get a single account from the database.
 */
AccountController.prototype.get = function () {
  var options = {
    on: {
      authorize: function (req, callback) {
        Policy.Definition (
          Policy.or ([
            Policy.assert ('is_account_owner'),
            Policy.assert ('has_scope', gatekeeper.scope.superuser)
          ])
        ).evaluate (req, callback);
      },

      prepareProjection: function (req, callback) {
        callback (null, DEFAULT_ACCOUNT_PROJECTION_EXCLUSIVE);
      }
    }
  };

  return ResourceController.prototype.get.call (this, options);
};

/**
 * Delete an account in the database
 */
AccountController.prototype.delete = function () {
  var options = {
    on: {
      authorize: function (req, callback) {
        Policy.Definition (
          Policy.or ([
            Policy.assert ('is_account_owner'),
            Policy.assert ('has_scope', gatekeeper.scope.superuser)
          ])
        ).evaluate (req, callback);
      }
    }
  };

  return ResourceController.prototype.delete.call (this, options);
};

module.exports = exports = AccountController;
