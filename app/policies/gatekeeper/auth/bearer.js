const async     = require ('async')
  , blueprint   = require ('@onehilltech/blueprint')
  , HttpError   = blueprint.HttpError
  , AccessToken = require ('../../../models/access-token')
  //, AccessTokenGenerator = require ('../../../utils/access-token-generator')
  ;

const {
  policies: { all, any }
} = require ('@onehilltech/blueprint');

//const tokenGenerator = new AccessTokenGenerator ();

module.exports = any ([
  /*
   * Either we are already authenticated.
   */
  function (req, callback) {
    return callback (null, !!req.user);
  },

  /*
   * Or, we need to authenticate the user.
   */
  all ([
    /*
     * Verify and cache the access token.
     */
    function (req, callback) {
      async.waterfall ([
        /*
         * Extract the access token from the request.
         */
        function (callback) {
          let authorization = req.get ('authorization');

          if (authorization) {
            let parts = authorization.split (' ');

            if (parts.length !== 2)
              return callback (new HttpError (400, 'invalid_authorization', 'Invalid authorization header'));

            if (!/^Bearer$/i.test (parts[0]))
              return callback (new HttpError (400, 'invalid_scheme', 'Invalid authorization scheme'));

            return callback (null, parts[1]);
          }
          else if (req.body && req.body.access_token) {
            return callback (null, req.body.access_token);
          }
          else if (req.query && req.query.access_token) {
            return callback (null, req.query.access_token);
          }
          else {
            return callback (new HttpError (400, 'missing_token', 'Missing access token'));
          }
        },

        /*
         * Verify the access token.
         */
        function (accessToken, callback) {
          const origin = req.get ('origin');
          const opts = {audience: origin};

          tokenGenerator.verifyToken (accessToken, opts, function (err, payload) {
            if (!err)
              return callback (null, payload);

            // Process the error message. We have to check the name because the error
            // could be related to token verification.
            if (err.name === 'TokenExpiredError')
              return callback (new HttpError (401, 'token_expired', 'Token has expired'));

            if (err.name === 'JsonWebTokenError')
              return callback (new HttpError (403, 'invalid_token', err.message));
          });
        },

        /*
         * Locate the access token model in the database.
         */
        function (payload, callback) {
          req.scope = payload.scope;
          AccessToken.findById (payload.jti).populate ('client account').exec (callback);
        },

        /*
         * Cache the access token model.
         */
        function (accessToken, callback) {
          req.accessToken = accessToken;
          return callback (null, true);
        }
      ], callback);
    },

    /*
     * Check the state of the access token model.
     */
    function (req, callback) {
      let accessToken = req.accessToken;

      if (!accessToken)
        return callback (null, false, {reason: 'unknown_token', message: 'Unknown access token'});

      if (!accessToken.enabled)
        return callback (null, false, {reason: 'token_disabled', message: 'Token is disabled'});

      if (!accessToken.client)
        return callback (null, false, {reason: 'unknown_client', message: 'Unknown client'});

      if (!accessToken.client.enabled)
        return callback (null, false, {reason: 'client_disabled', message: 'Client is disabled'});

      // Set the user to the client id.
      req.user = accessToken.client;

      if (accessToken.kind === 'user_token') {
        if (!accessToken.account)
          return callback (null, false, {reason: 'unknown_account', message: 'Unknown account'});

        if (!accessToken.account.enabled)
          return callback (null, false, {reason: 'account_disabled', message: 'Account is disabled'});

        // Update the user to the account id.
        req.user = accessToken.account;
      }

      return callback (null, true);
    }
  ])
]);
