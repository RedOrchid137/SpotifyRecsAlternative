var authURL;

var xhttp = new XMLHttpRequest();
xhttp.onreadystatechange = function() {
    if (this.readyState == 4 && this.status == 200) {
    authURL = xhttp.responseText;
    console.log(authURL)
    location.replace(authURL);
    }
};
xhttp.open("GET", "http://localhost:3000/getAuthURL", true);
xhttp.send();


