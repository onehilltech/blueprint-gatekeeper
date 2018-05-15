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
  expect
} = require ('chai');

const {
  request
} = require ('../../../../../lib/testing');

const {
  lean,
  seed,

  Types: {
    ObjectId
  }
} = require ('@onehilltech/blueprint-mongodb');

const blueprint = require ('@onehilltech/blueprint');

describe ('app | routers | account', function () {
  describe ('/v1/accounts', function () {
    context ('GET', function () {
      it ('should return all the accounts for glob scope', function () {
        const {accounts} = seed ('$default');

        return request ()
          .get ('/v1/accounts')
          .withUserToken (0)
          .query ({_sort: {username: 1}})
          .expect (200, {'accounts': lean (accounts)});
      });

      it ('should return all the accounts for valid scope', function () {
        const {accounts} = seed ('$default');

        return request ()
          .get ('/v1/accounts')
          .query ({_sort: {username: 1}})
          .withUserToken (1)
          .expect (200, {'accounts': lean (accounts)});
      });

      it ('should not allow request', function () {
        return request ()
          .get ('/v1/accounts')
          .withUserToken (2)
          .expect (403, { errors:
            [ { code: 'invalid_scope',
              detail: 'This request does not have a valid scope.',
              status: '403' } ] });
      });
    });

    context ('POST', function () {
      const data = { username: 'tester1', password: 'tester1', email: 'james@onehilltech.com' };

      it ('should create a new account with new id', function () {
        const {native} = seed ('$default');

        return request ()
          .post ('/v1/accounts')
          .send ({account: data})
          .withClientToken (0)
          .expect (200).then (res => {
            let _id = res.body.account._id;

            expect (res.body).to.eql ({
              account: {
                _id,
                enabled: true,
                scope: [],
                username: data.username,
                email: data.email,
                created_by: native[0].id,
                verification: {
                  required: false
                }
              }
            });
          });
      });

      it ('should create a new account with existing id', function () {
        const {native} = seed ('$default');
        const _id = new ObjectId ();

        return request ()
          .post ('/v1/accounts')
          .send ({account: Object.assign ({_id}, data)})
          .withClientToken (0)
          .expect (200, {
            account: {
              _id: _id.toString (),
              enabled: true,
              scope: [],
              username: data.username,
              email: data.email,
              created_by: native[0].id,
              verification: {
                required: false
              }
            }
          });
      });

      it ('should create a new account, and login the user', function () {
        const {native} = seed ('$default');

        const autoLogin = {
          _id: new ObjectId (),
          username: 'auto-login',
          password: 'auto-login',
          email: 'auto-login@onehilltech.com'
        };

        let expected = Object.assign ({
          _id: autoLogin._id.toString (),
          created_by: native[0].id,
          scope: [],
          enabled: true,
          verification: {
            required: false
          }
        }, {username: autoLogin.username, email: autoLogin.email});

        return request ()
          .post ('/v1/accounts')
          .query ({login: true})
          .send ({account: autoLogin})
          .withClientToken (0)
          .expect (200).then (res => {
            expect (res.body.account).to.eql (expected);
            expect (res.body).to.have.property ('token');

            expect (res.body.token).to.have.keys (['token_type', 'access_token', 'refresh_token']);
            expect (res.body.token).to.have.property ('token_type', 'Bearer');
          });
      });

      it ('should not create an account [duplicate]', function () {
        const {accounts} = seed ('$default');
        const account = accounts[0];

        const dup = {username: account.username, password: account.password, email: account.email, created_by: account.created_by};

        return request ()
          .post ('/v1/accounts')
          .send ({account: dup})
          .withClientToken (0)
          .expect (400, { errors:
              [ { code: 'already_exists',
                detail: 'The resource you are creating already exists.',
                status: '400' } ] });
      });

      it ('should not create an account [missing parameter]', function () {
        const invalid = {password: 'tester1', email: 'james@onehilltech.com'};

        return request ()
          .post ('/v1/accounts')
          .send (invalid)
          .withClientToken (0)
          .expect (400, {
            errors: [
              {
                code: 'validation_failed',
                detail: 'The request validation failed.',
                meta: {
                  validation: {
                    'account.email': {
                      location: 'body',
                      msg: 'This field is required.',
                      param: 'account.email',
                    },
                    'account.password': {
                      location: 'body',
                      msg: 'This field is required.',
                      param: 'account.password',
                    },
                    'account.username': {
                      location: 'body',
                      msg: 'This field is required.',
                      param: 'account.username',
                    }
                  }
                },
                status: '400'
              }
            ]
          });
      });

      it ('should not create an account [invalid scope]', function () {
        const account = { username: 'tester1', password: 'tester1', email: 'james@onehilltech.com'};

        return request ()
          .post ('/v1/accounts')
          .send ({account: account})
          .withClientToken (1)
          .expect (403, { errors: [{ status: '403', code: 'invalid_scope', detail: 'This request does not have a valid scope.' }] });
      });
    });
  });

  describe ('/v1/accounts/:accountId', function () {
    context ('GET', function () {
      it ('should return the owner account', function () {
        const {accounts} = seed ('$default');
        const account = accounts[0];

        return request ()
          .get (`/v1/accounts/${account.id}`)
          .withUserToken (2)
          .expect (200, {account: account.lean ()});
      });

      it ('should return the account for me', function () {
        const {accounts} = seed ('$default');
        const account = accounts[0];

        return request ()
          .get ('/v1/accounts/me')
          .withUserToken (2)
          .expect (200, {account: account.lean ()});
      });

      context ('get_all', function () {
        it ('should return account for a different user', function () {
          const {accounts} = seed ('$default');
          const account = accounts[1];

          request ()
            .get (`/v1/accounts/${account.id}`)
            .withUserToken (1)
            .expect (200, {account: account.lean ()});
        });
      });

      context ('!get_all', function () {
        it ('should not return account for different user', function () {
          const {accounts} = seed ('$default');
          const account = accounts[1];

          return request ()
            .get (`/v1/accounts/${account.id}`)
            .withUserToken (2)
            .expect (403, { errors:
                [ { code: 'forbidden_access',
                  detail: 'You do not have access to the account.',
                  status: '403' } ] });
        });
      });
    });

    context ('UPDATE', function () {
      it ('should update the scope', function () {
        const {accounts} = seed ('$default');
        const account = accounts[3];

        let updated = account.lean ();
        updated.scope.push ('the_new_scope');

        return request ()
          .put (`/v1/accounts/${account.id}`)
          .withUserToken (0)
          .send ({account: {scope: updated.scope}})
          .expect (200, {account: updated});
      });

      it ('should update the email', function () {
        const {accounts} = seed ('$default');
        const account = accounts[0];

        let updated = account.lean ();
        updated.email = 'foo@contact.com';

        return request ()
          .put (`/v1/accounts/${account.id}`)
          .withUserToken (0)
          .send ({account: {email: updated.email}} )
          .expect (200, {account: updated});
      });

      it ('should not update the scope', function () {
        const {accounts} = seed ('$default');
        const account = accounts[0];

        return request ()
          .put (`/v1/accounts/${account.id}`)
          .withUserToken (2)
          .send ({account: {scope: ['the_new_scope']}})
          .expect (403, { errors:
              [ { code: 'invalid_scope',
                detail: 'You are not allowed to update the account scope.',
                status: '403' } ] });
      });

      it ('should not update the password', function () {
        const {accounts} = seed ('$default');
        const account = accounts[3];

        return request ()
          .put (`/v1/accounts/${account.id}`)
          .withUserToken (0)
          .send ({account: {password: '1234567890'}})
          .expect (403, { errors:
              [ { code: 'forbidden',
                detail: 'You cannot update or delete the password.',
                status: '403' } ] });
      });
    });

    context ('DELETE', function () {
      it ('should allow account owner to delete account', function () {
        const {accounts} = seed ('$default');

        return request ()
          .delete (`/v1/accounts/${accounts[0].id}`)
          .withUserToken (0)
          .expect (200, 'true');
      });

      it ('should not allow user to delete account of another user', function () {
        const {accounts} = seed ('$default');
        const account = accounts[1];

        return request ()
          .delete (`/v1/accounts/${account.id}`)
          .withUserToken (0)
          .expect (403, { errors:
            [ { code: 'invalid_account',
              detail: 'You are not the account owner.',
              status: '403' } ] });
      });
    });

    describe ('/password', function () {
      it ('should change the password', function () {
        const {accounts} = seed ('$default');
        const account = accounts[0];

        return request ()
          .post (`/v1/accounts/${account.id}/password`)
          .withUserToken (0)
          .send ({password: { current: account.username, new: 'new-password'}})
          .expect (200, 'true').then (() => {
            const Account = blueprint.lookup ('model:account');

            return Account.findById (account._id)
              .then (actual => {
                expect (account.password).to.not.equal (actual.password);
              });
          });
      });

      it ('should not change the password because current is wrong', function () {
        const {accounts} = seed ('$default');
        const account = accounts[0];

        return request ()
          .post (`/v1/accounts/${account.id}/password`)
          .withUserToken (0)
          .send ({password: { current: 'bad-password', new: 'new-password'}})
          .expect (400, { errors:
              [ { code: 'invalid_password',
                detail: 'The current password is invalid.',
                status: '400' } ] });
      });
    });
  });
});