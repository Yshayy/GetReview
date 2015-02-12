
var db = new Firebase("https://getreview.firebaseio.com");
var users = db.child("users");
var reviews = db.child("reviews");
var ractive;
var app = {
  router: undefined
}


var homeRoute = function()
{
   ractive = new Ractive({

      el: 'App',

      template: '#HomeTemplate',


      data: {}
    });
}


var loginRoute = function()
{
   ractive = new Ractive({

      el: 'App',

      template: '#LoginTemplate',

      data: {}
    });


    ractive.on({
    googleConnect:  function() {
        db.authWithOAuthPopup("google", function(error, authData) {
        if (error) {
          console.log("Login Failed!", error);
        } else {
          users.child(authData.uid).set({
            provider: authData.provider,
            firstName: authData.google.cachedUserProfile.given_name,
            lastName: authData.google.cachedUserProfile.family_name,
            pictuure: authData.google.cachedUserProfile.picture
          });
          app.router.setRoute("home");
        }
      })
    }});
}

var requestReviewRoute = function()
{
   ractive = new Ractive({

      el: 'App',

      template: '#RequestReviewTemplate',

      data: {}
    });
}

var routes = {
        '/': function()
        {
          console.log('/');
          if (db.getAuth())
          {
             app.router.setRoute("home");
          }
          else
          {
            app.router.setRoute("login");
          }
        },
        '/home': homeRoute,
        '/login': loginRoute,
        '/request': requestReviewRoute
      };

app.router = Router(routes);
app.router.init();

