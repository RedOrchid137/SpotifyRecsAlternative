const playlistID = "6mTXIiYg4ZmfOpxOTwoaou";
document.getElementById("prepPlaylists").addEventListener("click",performGenericHTTPRequest.bind(null,`http://localhost:3000/prepPlaylists/`,"GET"))
document.getElementById("generatePlaylist").addEventListener("click",performGenericHTTPRequest.bind(null,`http://localhost:3000/generatePlaylist/`,"GET"))
document.getElementById("emptyPlaylist").addEventListener("click",performGenericHTTPRequest.bind(null,`http://localhost:3000/emptyPlaylist/`,"GET"))



async function performGenericHTTPRequest(url, method){
    console.log(playlistID)
    var xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function() {
        if (this.readyState == 4 && this.status == 200) {
            console.log(this.response)
            return this.response;
        }
        else{
            return this.responseText
        }
    };
    xhttp.open(method, url+playlistID, true);
    xhttp.send();
}
