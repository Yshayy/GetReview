
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

var reviewStatusRoute = function(id)
{
    console.log(id);
    ractive = new Ractive({

      el: 'App',

      template: '#ReviewStatusTemplate',

      data: {}
    });
}

var requestReviewRoute = function()
{
   ractive = new Ractive({

      el: 'App',

      template: '#RequestReviewTemplate',

      data: {
        groups: [
            'Dev',
            'Product',
            'UX'],
        description: '',
        group: 'UX'
      }
    });
    
    ractive.on({
        submitReview : function(){
            //console.log('submitReview ' + ractive.data.group);
            var review = reviews.child(ractive.data.group).push({
                status: 'pending',
                date: new Date(),
                description: ractive.data.description,
                reviewee: db.getAuth().uid,                
            });
            
            app.router.setRoute('ReviewStatus/'+review.name());
            
        } 
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
        '/request': requestReviewRoute,
        '/ReviewStatus/:id': reviewStatusRoute
      };


app.router = Router(routes);
app.router.init();

