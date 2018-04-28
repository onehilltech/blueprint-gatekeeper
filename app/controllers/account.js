/*
 * Copyright (c) 2018 One Hill Technologies, LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

const {
  model,
  NotFoundError,
  BadRequestError
} = require ('@onehilltech/blueprint');

const {
  get
} = require ('lodash');

const {
  Action
} = require ('@onehilltech/blueprint');

const {
  ResourceController,
  Types: {
    ObjectId
  }
} = require ('@onehilltech/blueprint-mongodb');

const {
  fromCallback
} = require ('bluebird');

/**
 * Default account id generator. This generator will just produce a new
 * ObjectId for each account.
 */
function __generateAccountId (account) {
  return Promise.resolve (account._id || new ObjectId ());
}

/**
 * @class AccountController
 */
module.exports = ResourceController.extend ({
  model: model ('account'),
  namespace: 'gatekeeper',

  _generateAccountId: null,

  init () {
    this._super.call (this, ...arguments);

    this._generateAccountId = get (this.app.configs, 'gatekeeper.generatorsAccountId', __generateAccountId);
  },

  create () {
    return this._super.call (this, ...arguments).extend ({
      prepareDocument (req, doc) {
        doc.created_by = req.user.client_id;

        return this.controller._generateAccountId (doc).then (id => {
          if (id)
            doc._id = id;

          return doc;
        });
      },

      prepareResponse (req, res, result) {
        // If the origin request wanted to login the user, then we need to
        // return to login the user for the account and return the access
        // token for the corresponding login.

        const login = get (req.query, 'login', false);

        if (!login)
          return result;

        req.gatekeeperClient = req.user;
        req.account = result.account;

        let tokenController = this.controller.app.lookup ('controller:oauth2.token');
        const password = get (tokenController, 'granters.password');

        return password.createToken (req)
          .then (accessToken => accessToken.serialize ())
          .then (accessToken => {
            result.token = Object.assign ({token_type: 'Bearer'}, accessToken);
            return result;
          });
      }
    });
  },

  getOne () {
    return this._super.call (this, ...arguments).extend ({
      schema: {
        [this.resourceId]: {
          in: 'params',
          isMongoId: false,
          isMongoIdOrMe: true
        }
      },

      getId (req, id) {
        return id === 'me' ? req.user._id : id;
      }
    });
  },

  changePassword () {
    return Action.extend ({
      schema: {
        [this.resourceId]: {
          in: 'params',
          isMongoIdOrMe: true,
          toMongoId: true
        },

        'password.current': {
          in: 'body',
          notEmpty: true
        },

        'password.new': {
          in: 'body',
          notEmpty: true
        }
      },

      execute (req, res) {
        const currentPassword = req.body.password.current;
        const newPassword = req.body.password.new;
        const {accountId} = req.params;

        return this.controller.model.findById (accountId)
          .then (account => {
            if (!account)
              return Promise.reject (new NotFoundError ('unknown_account', 'The account does not exist.'));

            return account.verifyPassword (currentPassword)
              .then (match => {
                // If the password does not match, then we can just return an
                // error message to the client, and stop processing the request.
                if (!match)
                  return Promise.reject (new BadRequestError ('invalid_password', 'The current password is invalid.'));

                account.password = newPassword;
                return account.save ();
              })
              .then (() => {
                res.status (200).json (true);
              });
          });
      }
    });
  }
});

/*

Account.prototype.changePassword = function () {
  return {
    validate: {
      'accountId': {
        in: 'params',
        isMongoIdOrToken: {
          errorMessage: "Must be ObjectId or 'me'",
          options: ['me']
        }
      },
      'password.current': {
        in: 'body',
        notEmpty: true
      },

      'password.new': {
        in: 'body',
        notEmpty: true
      }
    },

    sanitize: idSanitizer,

    execute: function (req, res, callback) {
      const currentPassword = req.body.password.current;
      const newPassword = req.body.password.new;

      async.waterfall ([
        function (callback) {
          Account.findById (req.params.accountId, callback);
        },

        function (account, callback) {
          async.waterfall ([
            function (callback) {
              account.verifyPassword (currentPassword, callback);
            },

            function (match, callback) {
              if (!match)
                return callback (new HttpError (400, 'invalid_password', 'Current password is invalid'));

              account.password = newPassword;
              account.save (callback);
            }
          ], callback);
        },

        function (account, n, callback) {
          res.status (200).json (n === 1);
          return callback (null);
        }
      ], callback);
    }
  }
};

*/
