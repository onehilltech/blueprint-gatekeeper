'use strict';

var blueprint  = require ('@onehilltech/blueprint')
  , mongodb    = require ('@onehilltech/blueprint-mongodb')
  , async      = require ('async')
  , objectPath = require ('object-path')
  , Account    = require ('../models/Account')
  ;

var ResourceController = mongodb.ResourceController
  ;

const gatekeeperConfig = blueprint.app.configs.gatekeeper
  ;

/**
 * Default account id generator. This generator will just produce a new
 * ObjectId for each account.
 */
function __generateAccountId (account, callback) {
  callback (null, new mongodb.Types.ObjectId ());
}

var generateAccountId = objectPath.get (gatekeeperConfig, 'generators.accountId', __generateAccountId);

function idSanitizer (req, callback) {
  if (req.params.accountId === 'me')
    req.params.accountId = req.user._id;
  else
    req.sanitizeParams ('accountId').toMongoId ();

  return callback (null);
}

function AccountController () {
  ResourceController.call (this, {
    model: Account,
    namespace: 'gatekeeper',
    idOptions: {
      validator: 'isMongoIdOrToken',
      validatorOptions: ['me'],
      sanitizer: idSanitizer
    }
  });
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
      prepareDocument: function (req, doc, callback) {
        doc = {
          email : req.body.account.email,
          username : req.body.account.username,
          password : req.body.account.password,
          created_by : req.user.id
        };

        async.waterfall ([
          function (callback) {
            generateAccountId (doc, callback);
          },

          function (id, callback) {
            if (id != null)
              doc._id = id;

            return callback (null, doc);
          }
        ], callback);
      }
    }
  };

  return ResourceController.prototype.create.call (this, options);
};

AccountController.prototype.update = function () {
  return ResourceController.prototype.update.call (this, {
    on: {
      prepareUpdate: function (req, doc, callback) {
        // Only the superuser can update the scope.
        if (!req.superuser)
          delete doc.$set.scope;

        return callback (null, doc);
      }
    }
  });
};

module.exports = AccountController;
