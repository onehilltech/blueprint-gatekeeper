Gatekeeper
=============

OAuth 2.0 token server and module for Blueprint.js

[![npm version](https://img.shields.io/npm/v/@onehilltech/blueprint-gatekeeper.svg?maxAge=2592000)](https://www.npmjs.com/package/@onehilltech/blueprint-gatekeeper)
[![Build Status](https://travis-ci.org/onehilltech/blueprint-gatekeeper.svg?branch=master)](https://travis-ci.org/onehilltech/blueprint-gatekeeper)
[![Dependencies](https://david-dm.org/onehilltech/blueprint-gatekeeper.svg)](https://david-dm.org/onehilltech/blueprint-gatekeeper)
[![Coverage Status](https://coveralls.io/repos/github/onehilltech/blueprint-gatekeeper/badge.svg?branch=master)](https://coveralls.io/github/onehilltech/blueprint-gatekeeper?branch=master)

* Stand-alone token-based authentication server
* Module support for [Blueprint.js](https://github.com/onehilltech/blueprint) integration
* Implements the [OAuth 2.0](http://oauth.net/2/) specification
* Uses [JSON Web Tokens (JWTs)](https://jwt.io/) to generate tokens
* Stores tokens into [MongoDB](https://www.mongodb.org/) database

Installation
--------------

    yarn add @onehilltech/blueprint-gatekeeper
    
or
 
    npm install @onehilltech/blueprint-gatekeeper --save

Getting Started
----------------

### Defining the configuration

Define the configuration file to configure the module for your application:

```javascript
// app/configs/gatekeeper.js

module.exports = {
 tokens: {
     // This is the base options for all token generators.
     $: {
       issuer: '[your-issuer-name-here]',
       expiresIn: '1h',
       algorithm: 'HS256',
       secret: 'ssshhh'
     }
 },
};
```

### Mount Gatekeeper router endpoint

Define a route (or router) to import the Gatekeeper routes into the application:

```javascript
// app/routers/endpoint.js

const blueprint = require ('@onehilltech/blueprint');
const { Router } = blueprint;

module.exports = Router.extend ({
  specification: {
    '/gatekeeper': blueprint.mount ('@onehilltech/blueprint-gatekeeper:v1')    
  }
});
```

### Protecting routes

The router definition above will expose the Gatekeeper routers at `/gatekeeper`.
Lastly, define the routes you want to protect using the ```gatekeeper.auth.bearer```
Blueprint policy. For example, you can protect all routes on a given path:

```javascript
// app/routers/endpoint.js

const blueprint = require ('@onehilltech/blueprint');
const { Router } = blueprint;

module.exports = Router.extend ({
  specification: {
    '/gatekeeper': blueprint.mount ('@onehilltech/blueprint-gatekeeper:v1'),
    
    // Let's protect the /v1 routes.
    '/v1': {
      policy: 'gatekeeper.auth.bearer'
    }  
  }
});
```

The router above will protect all routes under the `/v1` path, which includes all routers located
in `app/routers/v1` directory. The client will need to define the `Authorization` header and include 
a generated token.

### Accessing the Authorized User

The `req.user` property contains the account model for an authorized user making
the request to access a protected route. For example, here is an example of setting
the user making the request as the owner of a created resource.

```javascript
const { model } = require ('@onehilltech/blueprint');
const { ResourceController } = require ('@onehilltech/blueprint-mongodb');

module.exports = ResourceController.extend ({
  Model: model ('tweet'),
  
  create () {
    return this._super (this, ...arguments).extend ({
      prepareDocument (req, doc) {
        // Make the authorized user the owner of the created resource.
        doc.user = req.user._id;
        return doc;
      }
    });
  }
});
```

> Gatekeeper has a `UserResourceController` that automatically adds the authorized
> user making the request as the owner of the resource being created.

Gatekeeper Client Libraries
----------------------------

* [ember-cli-gatekeeper](https://github.com/onehilltech/ember-cli-gatekeeper)

Next Steps
-----------

See the [Wiki](https://github.com/onehilltech/blueprint-gatekeeper/wiki) for 
more information.
