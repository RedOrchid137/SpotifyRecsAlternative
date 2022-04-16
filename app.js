var express = require("express");
var app = express();
const PORT = 3000;


//Authorization
var scopes = ['user-read-private', 'user-read-email','playlist-modify-public','playlist-modify-public','user-library-modify','playlist-read-private','user-library-read']
var state = 'test'
var code;
var SpotifyWebApi = require('spotify-web-api-node');
var spotifyApi = new SpotifyWebApi({
  clientId: 'b41e145cab024589a197928a1e77033b',
  clientSecret: '3858da11e85a4ea1a1b46cdeea723c9e',
  redirectUri: 'http://localhost:3000/returncode'
});

const DISCOVER_ID = "6mTXIiYg4ZmfOpxOTwoaou"


app.use(express.static(__dirname))

app.get("/returncode",(req,res)=>{
  var retstate = req.query.state;
  if(state==retstate){
    console.log("Code: "+req.query.code)
    code = req.query.code;
    spotifyApi.authorizationCodeGrant(code).then(
      function(data) {
        console.log('The token expires in ' + data.body['expires_in']);
        console.log('The access token is ' + data.body['access_token']);
        console.log('The refresh token is ' + data.body['refresh_token']);
    
        // Set the access token on the API object to use it in later calls
        spotifyApi.setAccessToken(data.body['access_token']);
        spotifyApi.setRefreshToken(data.body['refresh_token']);
      },
      function(err) {
        console.log('Something went wrong!', err);
      }
    );
    res.redirect('/')
  }

})
app.get("/getAuthURL",(req,res)=>{
  var authorizeURL = spotifyApi.createAuthorizeURL(scopes, state);

  if(authorizeURL){
    res.send(authorizeURL)
  }
  else{
    res.status(403).send();
  }
})

app.use((req,res,next)=>{
  if(code){
    next();
  }
  else{
    res.sendFile("/client/auth.html",{root:__dirname})
  }
})

app.get("/",(req,res)=>{
  res.sendFile("/client/index.html",{root:__dirname})
})

app.get("/prepPlaylists",async (req,res)=>{
  
  var uPlaylists = await spotifyApi.getUserPlaylists().then(success=>{
    return success.body;
  },error=>{
    console.log(error)
  })

  uPlaylists.items.forEach(async playlist => 
    {
      var curPL = await spotifyApi.getPlaylistTracks(playlist.id).then(function(data) {
        return data.body;
      }, function(err) {
        console.log('Something went wrong!', err);
      });

      var trackList = []
      await curPL.items.forEach(track=>{
        trackList.push(track.track.id)
      })

      if(trackList.length>50){
        var repeats = trackList.length/50-1
        var last = trackList.length%50
        for (let i = 0; i < repeats; i++) {
          await addToSavedTracks(trackList.slice(i*50,i*50+50))
        }
        if(last!=0){
          await addToSavedTracks(trackList.slice(repeats*50,repeats*50+last))
        }
      }
      else{
        await addToSavedTracks(trackList)
      }
});
})

app.get("/generatePlaylist/:id",async (req,res)=>{
  var generatedIDS = await generateNewPlaylist();
  var discoverAnytime = []
  generatedIDS.forEach(trackID=>{
    discoverAnytime.push("spotify:track:"+trackID) 
  })

  await spotifyApi.addTracksToPlaylist(req.params.id,discoverAnytime)
  console.log("Done")
})

app.get("/emptyPlaylist/:id",async(req,res)=>{
  await emptyPlaylist(req.params.id,50,0)
})

app.listen(PORT,()=>{console.log(`app listening on port ${PORT}`)})


async function generateNewPlaylist(){
  console.log("generating")
  var seed = await getSeedValues();
  console.log("seeding done")
  var seedTracks = seed[1]
  var seedArtists = seed[0]
  tally = {}
  var lo = 0
  var hi = 2
  var tmp
  do{
    await spotifyApi.getRecommendations({
      seed_artists:seedArtists.slice(lo,hi),
      seed_tracks:seedTracks.slice(lo,hi),
      limit:10
    }).then(data=>{
      data.body.tracks.forEach(track=>{
        if(!tally[track.id]){
          tally[track.id] = 1
        }
        else{
          tally[track.id] += 1
        }
      })
    },error=>{
      console.log("error. ",error)
    })
    tmp = hi;
    hi += 2;
    lo = tmp;
  }
  while(hi<seedArtists.length/3)
  console.log("generated")
  trackIDS = await sort_object(tally)
  var finalList = await eliminateOldTracks(trackIDS);
  return finalList;
}


async function addToSavedTracks(trackList){
  await spotifyApi.addToMySavedTracks(trackList)
  .then(function(data) {
    console.log('Added track!');
  }, function(err) {
    console.log('Something went wrong!', err);
  });
}

async function getSeedValues(){
  console.log("seeding")
  var seedArtists = []
  var seedTracks = []
  var seedGenres = []
  var checkedAlbums = []
  var limit = 50;
  var offset = 0;
  do{
    var tracks  = await spotifyApi.getMySavedTracks({limit:limit,offset:offset})
    .then((success)=>{
      return success.body.items
    },error=>{
      console.log(error)
    })
    tracks.forEach(track=>{
      seedTracks.push(track.track.id)
      track.track.artists.forEach(artist=>{
        if(!seedArtists.includes(artist.id)){
          seedArtists.push(artist.id)
        }
      })
    })
    offset+=limit;
    
  }
  while(tracks.length>0);
  console.log("seeding done")
  seedArtists = shuffleArray(seedArtists)
  seedTracks = shuffleArray(seedTracks)
  return [seedArtists,seedTracks]
}

function sort_object(obj) {
  console.log("sorting")
  var items = Object.keys(obj).map(
    (key) => { return [key, obj[key]] });
  items.sort(
    (first, second) => { return second[1] - first[1] }
  );
  console.log(items)
  var keys = items.map(
    (e) => { return e[0] });
  
  return keys
} 

async function eliminateOldTracks(tracklist){
  console.log("eliminating")
  var convertedList = []
  tracklist.forEach(track=>{
    convertedList.push(track)
  })
  console.log(convertedList)

  var finaltrackList = []
  let i = 0
  while (finaltrackList.length<50&&i<convertedList.length){
    var curBool = await spotifyApi.containsMySavedTracks([convertedList[i]]).then(data=>{
      return data.body[0]
    },error=>{
      console.log("error: ",error)
    })
    if(!curBool){
      finaltrackList.push(convertedList[i])
    }
    i++;
  }
  return finaltrackList; 
}

function shuffleArray(array){
  retarr = array
  for (let i = retarr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = retarr[i];
    retarr[i] = retarr[j];
    retarr[j] = temp;
  }
  return retarr
}

async function emptyPlaylist(playlistID,limit,offset){
  var playListTracks = []
  do{
    var tracks  = await spotifyApi.getPlaylistTracks(playlistID,{limit:limit,offset:offset})
    .then((success)=>{
      console.log(success.body.items)
      return success.body.items
    },error=>{
      console.log(error)
    })
    tracks.forEach(track=>{
      playListTracks.push(
        {
          "uri":"spotify:track:"+track.track.id
        })
    })
    offset+=limit;
  }
  while(tracks.length>0);

  if(playListTracks.length>100){
    var repeats = playListTracks.length/100
    var last = playListTracks%100
    for (let index = 0; index < repeats; index++) {
      spotifyApi.removeTracksFromPlaylist(playlistID,playListTracks.splice(index*100,index*100+100)).then(success=>{
        console.log("playlist successfully cleared")
      },error=>{
        console.log("error: ",error)
      })
    }
    spotifyApi.removeTracksFromPlaylist(playlistID,playListTracks.splice(repeats*100,repeats*100+last)).then(success=>{
      console.log("playlist successfully cleared")
    },error=>{
      console.log("error: ",error)
    })
    return
  }
  spotifyApi.removeTracksFromPlaylist(playlistID,playListTracks).then(success=>{
    console.log("playlist successfully cleared")
  },error=>{
    console.log("error: ",error)
  })
}