const winston   = require ('winston')
  , async       = require ('async')
  , blueprint   = require ('@onehilltech/blueprint')
  , mongodb     = require ('@onehilltech/blueprint-mongodb')
  , _           = require ('underscore')
  , ObjectId    = mongodb.Types.ObjectId
  , Client      = require ('../models/Client')
  , HttpError   = blueprint.errors.HttpError
  , granters    = require ('../middleware/granters')
  , validators  = require ('../middleware/validators')
  ;

/**
 * @class WorkflowController
 *
 * The WorkflowController provides methods for binding OAuth 2.0 routes to its
 * implementation of the OAuth 2.0 protocol.
 *
 * @param models
 * @constructor
 */
function WorkflowController () {
  blueprint.BaseController.call (this);
}

blueprint.controller (WorkflowController, blueprint.BaseController);

module.exports = WorkflowController;

/**
 * Logout a user. After this method returns, the token is no longer valid.
 */
WorkflowController.prototype.logoutUser = function () {
  return {
    execute: function (req, res, callback) {
      async.waterfall ([
        function (callback) {
          req.accessToken.remove (callback);
        },

        function (token, callback) {
          if (!token)
            return callback (new HttpError (500, 'invalid_token', 'Invalid access token'));

          res.status (200).send (true);
          return callback (null);
        }
      ], callback);
    }
  };
};

/**
 * Issue an access token. The issue workflow depends on the grant_type
 * body parameter.
 */
WorkflowController.prototype.issueToken = function () {
  const grantTypes = Object.keys (granters);
  const baseSchema = {
    grant_type: {in: 'body', notEmpty: true, isIn: {options: [grantTypes]}},
    client_id: {in: 'body', notEmpty: true, isMongoId: true}
  };

  return {
    validate: function (req, callback) {
      async.waterfall ([
        function (callback) {
          Client.findById (req.body.client_id, callback);
        },

        function (client, callback) {
          if (!client)
            return callback (new HttpError (400, 'invalid_client', 'Client not found'));

          // Cache the client to later.
          req.client = client;

          // Different clients have different validation requirements. So, let's
          // find the validator for the client, and use it.
          const typeSchema = validators[client.type] || {};
          const schema = _.extend (baseSchema, typeSchema);

          req.check (schema);

          return callback (null);
        }
      ], callback);
    },

    sanitize: function (req, callback) {
      req.body.client_id = new ObjectId (req.body.client_id);
      return callback (null);
    },

    execute: function (req, res, callback) {
      async.waterfall ([
        function (callback) {
          granters[req.body.grant_type].createToken (req, callback);
        },

        function (accessToken, callback) {
          accessToken.serialize (callback);
        },

        function (payload, callback) {
          const ret = _.extend ({token_type: 'Bearer'}, payload);
          res.status (200).json (ret);

          return callback (null);
        }
      ], callback);
    }
  };
};