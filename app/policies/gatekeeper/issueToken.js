'use strict';

const blueprint = require ('@onehilltech/blueprint')
  , granters    = require ('../../middleware/granters')
  , clients     = require ('./clients')
  ;

const {
  policies: { all }
} = require ('@onehilltech/blueprint');


module.exports = all ([
  /*
   * The client must be in good standing.
   */
  function (req, callback) {
    return callback (null, req.client.enabled, {reason: 'client_disabled', message: 'Client is disabled'});
  },

  all ([
    /*
     * Check the policies for the client type.
     */
    function (req, callback) {
      var clientPolicies = clients[req.client.type] || function (req, callback) { return callback (null, true); };
      clientPolicies (req, callback);
    },

    /*
     * Evaluate the policies for the granter.
     */
    function (req, callback) {
      const grantType = req.body.grant_type;
      const policies = granters[grantType].policies || function (req, callback) { return callback (null, true); };

      return policies (req, callback);
    }
  ])
]);

