if (document.location.hash == "")
{
    document.location.hash = "/";
}

var db = new Firebase("https://getreview.firebaseio.com");
var users = db.child("users");
var reviews = db.child("reviews");
var ractive;
var groups = ['Dev', 'UX', 'Product'];
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
    if (db.getAuth())
    {
        app.router.setRoute("/");
        return;
    }
   ractive = new Ractive({
      el: 'App',
      template: '#LoginTemplate',
      data: {}
    });


    ractive.on({
    googleConnect:  function() {
        db.authWithOAuthRedirect("google", function(error, authData) {
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
        review : undefined
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
    var review = reviews.child(group).child(id);
    
    review.once("value", function(snapshot){
        ractive.data.review = snapshot.val();        
        ractive.data.timespan = $.timeago(ractive.data.review.date);
        ractive.update();
        setInterval(function(){
            ractive.data.timespan = $.timeago(ractive.data.review.date);
            console.log('update');
            
        }, 60000);   
    });
    
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
        groups: groups,
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
                date: new Date().toISOString(),
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
        
         ractive.on({
        sayThanks: function(){
            console.log('said thanks');
            app.router.setRoute("MyReviews");   
        }
     });
    });
    
   
}

function myReviewsRoute()
{
    ractive = new Ractive({

      el: 'App',

      template: '#MyReviewsTemplate',

      data: {
        reviews: []
      }
    });
    
    var aggregatedReviews = {};
    for(var i = 0;i<groups.length;i++)
    {
        var myReviews = reviews.child(groups[i]);
        var reviewGroup = groups[i];
        myReviews.on("child_added", function(snapshot, obj)
        {
            var review = snapshot.val();
            review.id = snapshot.name();
            review.group = snapshot.ref().parent().name();
            review.timespan = $.timeago(review.date);
            if (review.reviewer) return;            
            if (review.status !== "pending" || 
                review.reviewee.id == db.getAuth().uid ||
               review.users[db.getAuth().uid].status !== 'pending') return;
            if (review.reviewee === db.getAuth().uid) return;
            ractive.data.reviews.push(review);
        });    
        
         myReviews.on("child_removed", function(snapshot)
        {
            var review = snapshot.val();
            review.id = snapshot.name();
            for(var j = 0;j<groups.length;j++)
            {
                if (ractive.datata.reviews[j].id == review.id){
                    ractive.datata.reviews.splice(j,1);
                }
            }
        });    
    }
    
    setInterval(function(){
        for(var i = 0;i<ractive.data.reviews.length;i++) {
            console.log('update');
            ractive.data.reviews[i].timespan = $.timeago(ractive.data.reviews[i].date);
        }
    },1000);
    ractive.on("accept", function(event){
        var reviewId = event.context.id;
        var group = event.context.group;
        reviews.child(group).child(reviewId).child("users").child(db.getAuth().uid).child("status").set("accepted");
        ractive.data.reviews.splice( ractive.data.reviews.indexOf(event.context),1);
        ractive.update();
    });
    
    ractive.on("decline", function(event){
        var reviewId = event.context.id;
        var group = event.context.group;
        reviews.child(group).child(reviewId).child("users").child(db.getAuth().uid).child("status").set("declined");
        ractive.data.reviews.splice( ractive.data.reviews.indexOf(event.context),1);
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
        '/MyReviews': auth(myReviewsRoute)
      };


app.router = Router(routes);
app.router.init();

document.handleNotification = function(group, id){
    reviews.child(group).child(id).child("users").child(db.getAuth().uid).child("status").set("accepted");
    
}
function forwardNotification(group)
{
    reviews.child(group).on("child_added", function(snapshot)
    {
        var review = snapshot.val();
        if (review.reviewer) return;
        if (review.status !== "pending") return;
        if (review.reviewee === db.getAuth().uid) return;
        if ((new Date() - new Date(review.date)) > 60000) return;
        if (review.description)
        {
            document.externalNotifications = document.externalNotifications || []
            document.externalNotifications.push({
                title: review.reviewee.firstName,
                description: review.description,
                group:  group,
                id: snapshot.name()
            });
            /*
            var title = $("<div/>").text(review.reviewee.firstName + " need a review!");
            var description = $("<div/>").text(review.description);
            
            $("#Notifications").append($("<li/>").append(title).append(description));*/
        }
    });
}

forwardNotification("UX");
forwardNotification("Dev");
forwardNotification("Product");

