window.addEventListener("load", function() {

  // INITIALIZE NEW GAME
  var Q = window.Q = Quintus({ development: true })
      .include("Sprites, Scenes, Input, 2D, Touch, UI")
      .setup("mazeGame")
      .controls()
      .touch();

  // LOAD GAME ASSETS
  Q.load("/images/sprites.png, /images/sprites.json, /maps/maze1.json, /maps/maze2.json, /images/tiles.png",
    function() {
      Q.sheet("tiles", "/images/tiles.png", { tilew: 32, tileh: 32 });
      Q.compileSheets("/images/sprites.png", "/images/sprites.json");
      Q.stageScene("level1"); // run the game
  });

  var players = [];
  var socket = io.connect('http://localhost:8080');
  var UiPlayers = document.getElementById("players");

  Q.gravityX = 0;
  Q.gravityY = 0;

  /***************************************************************************/
  /*                            GAME CLASSES                                 */
  /***************************************************************************/

  // PLAYER CLASS
  Q.Sprite.extend("Player", {

    init: function(p) {
      this._super(p, {
        sheet: "player"
      });
      this.add("2d, stepControls");
      this.on("hit.sprite", function(collision) {
        if(collision.obj.isA("Ladder")) {
          this.p.destroy();
          Q.clearStages();
          Q.stageScene("level2", 1, { label: "Proceed to Level 2" });
        }
      });
    },

    step: function (dt) {
      this.p.socket.emit("update", { playerId: this.p.playerId, x: this.p.x, y: this.p.y, sheet: this.p.sheet })
    }

  });

  // ACTOR CLASS
  Q.Sprite.extend("Actor", {
    init: function (p) {
      this._super(p, {
        sheet: "actor",
        update: true
      });

      var temp = this;
      setInterval(function () {
        if (!temp.p.update) {
          temp.destroy();
        }
        temp.p.update = false;
      }, 10000);
    }
  });

  // LADDER CLASS
  Q.Sprite.extend("Ladder", {
    init: function(p) {
      this._super(p, { sheet: "ladder" });
    }
  });

  /***************************************************************************/
  /*                       MAIN MULTIPLAYER LOGIC                            */
  /***************************************************************************/

  // MULTIPLAYER SOCKET
  function setUp (stage) {
    socket.on("count", function (data) {
      UiPlayers.innerHTML = "Players: " + data["playerCount"];
    });

    socket.on("connected", function (data) {
      selfId = data["playerId"];
      player = new Q.Player({ playerId: selfId, x: 688, y: 976, socket: socket });
      stage.insert(player);
      stage.add("viewport").follow(player);
    });



    socket.on("updated", function (data) {
      var actor = players.filter(function (obj) {
          return obj.playerId == data["playerId"];
        })[0];
      if (actor) {
        actor.player.p.x = data["x"];
        actor.player.p.y = data["y"];
        actor.player.p.sheet = "actor";
        actor.player.p.update = true;
      }
      else {
        var temp = new Q.Actor({ playerId: data["playerId"], x: data["x"], y: data["y"], sheet: "actor" });
        players.push({ player: temp, playerId: data["playerId"] });
        stage.insert(temp);
      }
    });

  }

  /***************************************************************************/
  /*                            LEVEL SCENES                                 */
  /***************************************************************************/

  // LEVEL 1 SCENE
  Q.scene("level1", function (stage) {

    stage.collisionLayer(new Q.TileLayer({dataAsset: "/maps/maze1.json", sheet: "tiles" }));
    stage.insert(new Q.Ladder({ x: 688, y: 800 }));
    setUp(stage);

  });

  // LEVEL 2 SCENE
  Q.scene("level2", function (stage) {

    //var player = stage.insert(new Q.Player());
    stage.collisionLayer(new Q.TileLayer({dataAsset: "/maps/maze2.json", sheet: "tiles" }));
    stage.insert(new Q.Ladder({ x: 688, y: 800 }));
    setUp(stage);

  });

  // END GAME SCENE
  Q.scene("endGame",function(stage) {

    var container = stage.insert(new Q.UI.Container({
      x: Q.width/2, y: Q.height/2, fill: "rgba(0,0,0,0.5)"
    }));

    var button = container.insert(new Q.UI.Button({
      x: 0, y: 0, fill: "#CCCCCC", label: "Play Again" }))

    var label = container.insert(new Q.UI.Text({
      x:10, y: -10 - button.p.h, label: stage.options.label }));

    button.on("click",function() {
      Q.clearStages();
      Q.stageScene("level1");
    });

    container.fit(20);

  });

});
