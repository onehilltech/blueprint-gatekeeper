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

const dab = require ('@onehilltech/dab');

module.exports = {
  native: [
    {
      name: 'client1',
      email: 'client1@gatekeeper.com',
      client_secret: 'client1'
    },
    {
      name: 'client2',
      email: 'client2@gatekeeper.com',
      client_secret: 'client2'
    },
    {
      name: 'client3',
      email: 'client3@gatekeeper.com',
      client_secret: 'client3',
      enabled: false
    }
  ],

  android: [
    {
      name: 'android1',
      client_secret: 'android1',
      email: 'android1@gatekeeper.com',
      package: 'com.onehilltech.gatekeeper',
    }
  ],

  recaptcha: [
    {
      name: 'recaptcha1',
      recaptcha_secret: '6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe',
      email: 'james@onehilltech.com',
      scope: ['gatekeeper.account.create'],
      origin: 'http://localhost'
    },

    {
      name: 'recaptcha2',
      recaptcha_secret: 'invalid-secret',
      email: 'james@onehilltech.com',
      scope: ['gatekeeper.account.create'],
      origin: 'http://localhost'
    }
  ],


  accounts: [
    {
      email: 'hilljh82@gmail.com',
      username: 'account1',
      password: 'account1',
      created_by: dab.ref ('native.0')
    },
    {
      email: 'account2@gatekeeper.com',
      username: 'account2',
      password: 'account2',
      created_by: dab.ref ('native.0')
    },
    {
      email: 'account3@gatekeeper.com',
      username: 'account3',
      password: 'account3',
      created_by: dab.ref ('native.0')
    },
    {
      email: 'account4@gatekeeper.com',
      username: 'account4',
      password: 'account4',
      created_by: dab.ref ('native.0'),
      scope: ['gatekeeper.account.update.scope']
    },
    {
      email: 'account5@gatekeeper.com',
      username: 'account5',
      password: 'account5',
      created_by: dab.ref ('native.0'),
      enabled: false
    }
  ],

  user_tokens: [
    { client: dab.ref ('native.0'), account: dab.ref ('accounts.0'), scope: ['gatekeeper.account.*'] },
    { client: dab.ref ('native.0'), account: dab.ref ('accounts.0'), scope: ['gatekeeper.account.get_all'] },
    { client: dab.ref ('native.0'), account: dab.ref ('accounts.0'), scope: ['dummy'] },
    { client: dab.ref ('native.0'), account: dab.ref ('accounts.0'), enabled: false },
    { client: dab.ref ('native.0'), account: dab.ref ('accounts.4')}
  ],

  client_tokens: [
    { client: dab.ref ('native.0'), scope: ['gatekeeper.account.create']},
    { client: dab.ref ('native.0'), scope: ['dummy']}
  ]
};
