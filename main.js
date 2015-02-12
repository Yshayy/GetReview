
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
            authData: authData,
            firstName: authData.google.cachedUserProfile.given_name,
            lastName: authData.google.cachedUserProfile.family_name,
            picture: authData.google.cachedUserProfile.picture,
            id: authData.uid
          });
          app.router.setRoute("/");
        }
      })
    }});
}

var reviewStatusRoute = function(group,id)
{
    console.log(id);
    ractive = new Ractive({

      el: 'App',

      template: '#ReviewStatusTemplate',

      data: {
        users:[],
      }
    });
    
    reviews.child(group)
            .child(id)
           .child("users")
           .on("child_added", function(snapshot)
            {
                console.log("new child added");
                ractive.data.users.push(snapshot.val());
            });
    
    reviews.child(group)
            .child(id)
           .child("users")
           .on("child_changed", function(snapshot)
            {
                var updatedUser = snapshot.val();
                var targetUser = ractive.data.users.filter(function(u){ return u.id === updatedUser.id;})[0];
                $.extend(targetUser, updatedUser);
                ractive.update("users");
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
            users.on("value",function(data){
                var allUsers = data.val();
                for (var userId in allUsers)
                {
                    if (userId == db.getAuth().uid) continue;
                    var user = allUsers[userId];
                    review.child("users").push(
                        {
                            firstName: user.firstName,
                            lastName: user.lastName,
                            id: userId,
                            picutre: user.picture,
                            status: "pending"
                        });
                }
            });
            
            
            app.router.setRoute('ReviewStatus/'+ ractive.data.group + "/" +review.name());
            
        } 
    });
}

function respond(id)
{
    
}

var auth = function(fn)
{
    return function()
    {
        if (db.getAuth())
        {
            fn.apply(this,arguments);
        }
        else
        {
            app.router.setRoute("/login");
        }
    }
}

var routes = {
        '/selectgroup': auth(function()
        {
            var group = "";
            if (confirm("are you developers"))
            {
                group = "Dev";
            }
            else if (confirm("are you ux"))
            {
                group = "UX";
            }
            else
            {
                group = "Product";
            }
            
            users.set()
        }),
        '/': auth(homeRoute),
        '/login': loginRoute,
        '/request': auth(requestReviewRoute),
        '/ReviewStatus/:group/:id': auth(reviewStatusRoute),
        '/Respond/:id':auth(respond)
      };


app.router = Router(routes);
app.router.init();

