var passport   = require ('passport')
  ;

module.exports = exports = {
  '/token': {
    post: { action: 'oauth2.WorkflowController@issueToken' }
  },

  '/logout' : {
    use: passport.authenticate ('bearer', {session: false}),
    get: { action : 'oauth2.WorkflowController@logoutUser' }
  }
};
