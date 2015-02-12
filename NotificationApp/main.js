
var win = gui.Window.get();
    var tray;

    // Get the minimize event
    win.on('minimize', function() {
      // Hide window
      this.hide();

      // Show tray
      tray = new gui.Tray({ title: 'GetReview', icon: 'icon.png' });

      // Show window and remove tray when clicked
      tray.on('click', function() {
        win.show();
        this.remove();
        tray = null;
      });
    });