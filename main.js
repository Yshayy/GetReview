if (document.location.hash == "")
{
    document.location.hash = "/";
}

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
    
    function checkAccepted(reviewerData)
    {
        if (reviewerData.status === "accepted")
                {
                    
                    review.child("reviewer").set(reviewerData, function(){
                        app.router.setRoute("Thanks/" + group + "/" + id );
                    });
                }
    }
    var review = reviews.child(group)
            .child(id);
    
    review
           .child("users")
           .on("child_added", function(snapshot)
            {
                review
                .child("users")
                .child(snapshot.name())
                .on("value", function(changeSnapshot){
                    var updatedUser = changeSnapshot.val();
                    checkAccepted(updatedUser);
                    var targetUser = ractive.data.users.filter(function(u){ return u.id === updatedUser.id;})[0];
                    if (!targetUser) 
                    {
                        ractive.data.users.push(updatedUser);
                    }
                    else
                    {
                        $.extend(targetUser, updatedUser);
                    }
                    ractive.update("users");
                });
                
            });
    
}

var requestReviewRoute = function()
{
   ractive = new Ractive({

      el: 'App',

      template: '#RequestReviewTemplate',

      data: {
        groups: [
            'Product',
            'Dev',
            'UX'],
        description: '',
        group: 'UX'
      }
    });
    
    ractive.on({
        submitReview : function(){
            //console.log('submitReview ' + ractive.data.group);
            var authData = db.getAuth();
            var review = reviews.child(ractive.data.group).push({
                status: 'pending',
                date: new Date(),
                description: ractive.data.description,
                reviewee: {
                    id:authData.uid,
                    firstName: authData.google.cachedUserProfile.given_name,
                    lastName: authData.google.cachedUserProfile.family_name,
                    picture: authData.google.cachedUserProfile.picture
                }
            });
            users.on("value",function(data){
                var allUsers = data.val();
                for (var userId in allUsers)
                {
                    if (userId == db.getAuth().uid) continue;
                    var user = allUsers[userId];
                    review.child("users").child(userId).set(
                        {
                            firstName: user.firstName,
                            lastName: user.lastName,
                            id: userId,
                            picture: user.picture,
                            status: "pending"
                        });
                }
            });
            
            
            app.router.setRoute('ReviewStatus/'+ ractive.data.group + "/" +review.name());
            
        } 
    });
}

function thanksRoute(group, id)
{
    console.log("thanks");
    var review = reviews.child(group)
            .child(id);
    
    review.once("value", function(snapshot)
    {
        var data = snapshot.val();
        ractive = new Ractive({

          el: 'App',

          template: '#ThanksTemplate',

          data: data
        });
    });
}

function myReviewsRoute(group)
{
    ractive = new Ractive({

      el: 'App',

      template: '#MyReviewsTemplate',

      data: {
        reviews: []
      }
    });
    
    var myReviews = reviews.child(group);
    myReviews.on("child_added", function(snapshot)
    {
        var review = snapshot.val();
        review.id = snapshot.name();
        if (review.reviewer) return;
        if (review.status !== "pending") return;
        if (review.reviewee === db.getAuth().uid) return;
        ractive.data.reviews.push(review);
    });
    
    ractive.on("accept", function(event){
        var reviewId = event.context.id;
        myReviews.child(reviewId).child("users").child(db.getAuth().uid).child("status").set("accepted");
        ractive.data.reviews.splice( ractive.data.reviews.indexOf(event.context));
        ractive.update();
    });
    
    ractive.on("decline", function(){
        var reviewId = event.context.id;
        myReviews.child(reviewId).child("users").child(db.getAuth().uid).child("status").set("declined");
        ractive.data.reviews.splice( ractive.data.reviews.indexOf(event.context));
        ractive.update();
    });
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
        '/Thanks/:group/:id' : thanksRoute,
        '/ReviewStatus/:group/:id': auth(reviewStatusRoute),
        '/MyReviews/:group': auth(myReviewsRoute)
      };


app.router = Router(routes);
app.router.init();

