var winston   = require ('winston')
  , blueprint = require ('@onehilltech/blueprint')
  , messaging = blueprint.messaging
  , async     = require ('async')
  , HttpError = blueprint.errors.HttpError
  , gatekeeper = require ('../../lib')
  , JwtToken   = gatekeeper.tokens.JwtToken
  ;

var Account = require ('../models/Account')
  ;

function ActivationController () {

}

blueprint.controller (ActivationController);

var tokenStrategy;

messaging.on ('app.init', function (app) {
  var gatekeeperConfig = app.configs.gatekeeper;

  if (gatekeeperConfig.token.kind === 'jwt')
    tokenStrategy = new JwtToken (gatekeeperConfig.token.options);
  else
    throw new Error ('Unsupported token strategy');
});

/**
 * Activate an account.
 *
 * @returns {Function}
 */
ActivationController.prototype.activate = function () {
  return {
    validate: function (req, callback) {
      req.checkQuery ('token').notEmpty ();
      req.checkQuery ('redirect_uri').optional ().isURL ();

      return callback (req.validationErrors (true));
    },

    execute: function (req, res, callback) {
      async.waterfall ([
        async.constant (req.query.token),

        function (token, callback) {
          var opts = {};
          tokenStrategy.verifyToken (token, opts, callback);
        },

        function (payload, callback) {
          var filter = {email: payload.email, username: payload.username};

          Account.findOne (filter, function (err, account) {
            if (err) return callback (new HttpError (400, 'Failed to activate account'));
            if (!account) return callback (new HttpError (400, 'Account does not exist'));
            if (account.isActivated ()) return callback (new HttpError (400, 'Account already activated'));

            account.activation.date = Date.now ();
            account.save (callback);
          });
        }
      ], function (err, account) {
        if (err) {
          if (req.query.redirect_uri) {
            var failure_url = req.query.redirect_uri + '?success=0&error=' + err.message;
            res.redirect (failure_url);
          }
          else if ((err instanceof HttpError)) {
            return callback (err);
          }
          else {
            return callback (new HttpError (500, 'Failed to activate account'));
          }
        }
        else {
          if (req.query.redirect_uri) {
            var success_url = req.query.redirect_uri + '?success=1';
            res.redirect (success_url);
          }
          else {
            return res.status (200).json (true);
          }
        }
      });
    }
  };
};

module.exports = exports = ActivationController;
