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

const bcrypt  = require ('bcrypt');
const mongodb = require ('@onehilltech/blueprint-mongodb');

const {
  Schema: {
    Types: {ObjectId}
  }
} = mongodb;

const options = require ('./-common-options') ();
const Client = require ('./client');

const SALT_WORK_FACTOR = 10;

let Schema = mongodb.Schema;

let schema = new Schema ({
  /// Username for the account.
  username: { type: String, required: true, unique: true, index: true },

  /// Encrypted password
  password: { type: String, required: true, hidden: true},

  /// Contact email address for the account.
  email: { type: String, required: true, unique: true, trim: true},

  /// The client that created the account.
  created_by: {type: ObjectId, required: true, ref: Client.modelName, index: true, validation: {optional: true}, const: true},

  /// Enabled state for the account.
  enabled: { type: Boolean, required: true, default: true },

  /// The default scope for the account. This is applied to the access
  /// token for the account.
  scope: {type: [String], default: []},

  /// The date the account was verified. If accounts do not need to
  /// be verified, then this value will always be null.
  verified_at: {type: Date}
}, options);

/**
 * Hash the user's password before saving it to the database. This will
 * help protect the password if the database is somehow hacked.
 */
schema.pre ('save', function () {
  // only hash the password if it has been modified (or is new)
  if (!this.isModified ('password'))
    return Promise.resolve ();

  return bcrypt.hash (this.password, SALT_WORK_FACTOR)
    .then (hash => {
      this.password = hash
    })
});

/**
 * Verify the password provided by the user. The \@ password should
 * not be encrpyted. This method will perform the hash of the password
 * to verify its correctness.
 *
 * @param[in]           password          The user's password
 * @param[in]           callback          Callback function
 */
schema.methods.verifyPassword = function (password) {
  return bcrypt.compare (password, this.password);
};

/**
 * Get the client id, which is an alias for created_by.
 */
schema.virtual ('client_id').get (function () {
  return this.created_by;
});

/**
 * Authenticate the username and password.
 *
 * @param username
 * @param password
 * @param done
 */
schema.statics.authenticate = function (username, password) {
  return this.findOne ({ username: username }).then (account => {
    if (!account)
      return Promise.reject (new Error ('The account does not exist.'));

    if (!account.enabled)
      return Promise.reject (new Error ('The account is disabled.'));

    return account.verifyPassword (password).then (match => {
      if (!match)
        return Promise.reject (new Error ('The password is invalid.'));

      return account;
    });
  });
};

module.exports = mongodb.resource ('account', schema, 'gatekeeper_accounts');
