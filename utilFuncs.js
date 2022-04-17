const dotenv = require('dotenv');
dotenv.config();

var api = require("./app")

var SpotifyWebApi = require('spotify-web-api-node');
var spotifyApi = new SpotifyWebApi({
  clientId: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  redirectUri: process.env.REDIRECT_URI
});

async function generateNewPlaylist(){
    console.log("generating")
    var seed = await getSeedValues();
    console.log("seeding done")
    var seedTracks = seed[1]
    var seedArtists = seed[0]
    var tally = {}
    var lo = 0
    var hi = 2
    var tmp

    spotifyApi.setAccessToken(process.env.ACCESS_TOKEN)
    spotifyApi.setRefreshToken(process.env.REFRESH_TOKEN)
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
      console.clear()
      console.log("progress: "+Math.round(hi*100/(seedArtists.length/3),2)+"%")
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
    spotifyApi.setAccessToken(process.env.ACCESS_TOKEN)
    spotifyApi.setRefreshToken(process.env.REFRESH_TOKEN)
    await spotifyApi.addToMySavedTracks(trackList)
    .then(function(data) {
      console.log('Added track!');
    }, function(err) {
      console.log('Something went wrong!', err);
    });
  }
  
  async function getSeedValues(){
    spotifyApi.setAccessToken(process.env.ACCESS_TOKEN)
    spotifyApi.setRefreshToken(process.env.REFRESH_TOKEN)
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
    var keys = items.map(
      (e) => { return e[0] });
    
    return keys
  } 
  
  async function eliminateOldTracks(tracklist){
    spotifyApi.setAccessToken(process.env.ACCESS_TOKEN)
    spotifyApi.setRefreshToken(process.env.REFRESH_TOKEN)

    console.log("eliminating")
    var convertedList = []
    tracklist.forEach(track=>{
      convertedList.push(track)
    })
  
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
    spotifyApi.setAccessToken(process.env.ACCESS_TOKEN)
    spotifyApi.setRefreshToken(process.env.REFRESH_TOKEN)
    console.log("emptying")
    var playListTracks = []
    do{
      var tracks  = await spotifyApi.getPlaylistTracks(playlistID,{limit:limit,offset:offset})
      .then((success)=>{
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
      var repeats = playListTracks.length/100-1
      var last = playListTracks%100
      for (let index = 0; index < repeats; index++) {
        spotifyApi.removeTracksFromPlaylist(playlistID,playListTracks.splice(index*100,index*100+100)).then(success=>{
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
    return
  }

module.exports = {emptyPlaylist,eliminateOldTracks,getSeedValues,sort_object,addToSavedTracks,generateNewPlaylist}