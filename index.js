const express = require("express");
const server = express()
const cors = require("cors")
const querystring = require('querystring');
const encodeFormData = require("./helperFunctions/encodedFormData.js")
const PORT = process.env.PORT || 9000
const fetch = require('node-fetch');
server.use(express.json());
server.use(express.urlencoded({extended: true}));
server.use(cors());

const client_id = '3b8c8f4d22f4418faa475baaf1a77ad6'
const client_secret = 'dbb2f5c916814100a9c1da1bea2dede2'
const redirect_uri = 'http://localhost:9000/token'
let token = null
let refresh_token = null
let userId = ''
let playlistId = ''
let tracks = []


server.get('/login',(req, res) =>{
    const scopes = "user-read-private,user-read-email,playlist-modify-public";

    res.redirect('https://accounts.spotify.com/authorize?'+ 
    querystring.stringify({
        response_type: 'code',
        client_id: client_id,
        scope: scopes,
        redirect_uri: redirect_uri,
    }));
    
});


server.get('/token', async (req, res) =>{
    const code = req.query.code || null;
    
    const body= {
        grant_type: "authorization_code",
        code :code,
        redirect_uri: redirect_uri,
        client_id: client_id,
        client_secret: client_secret

    }
    
    await fetch("https://accounts.spotify.com/api/token", {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "Accept": "application/json"
        },
        body: encodeFormData(body)
    })
    .then(res => res.json())
    
    .then(data =>{
        token = data.access_token
        refresh_token = data.refresh_token
        fetch("https://api.spotify.com/v1/me", {
        headers:{
            "Authorization": `Bearer ${token}`
        }
    })
    .then(res => res.text())
    .then(data =>{
        data=JSON.parse(data)
        userId = data.id
        info = {"country": data.country,
                "display_name": data.display_name,
                "email": data.email,
                "id": data.id}
        info= querystring.stringify(info)
        res.redirect(`http://localhost:3000/user:${info}`)
        
    })
    
})
    
})

////////// Search for Artists////////

server.post('/artist', async (req, res)=>{
    const artists = req.body.artists;
    if(artists){
        await fetch(`https://api.spotify.com/v1/search?query=${artists}&type=artist&limit=1&market=from_token`,{
            headers:{
                "Authorization": `Bearer ${token}`
            }
        })
        .then(res=>res.json())
        .then(data =>{
            res.json({
                name: data.artists.items[0].name,
                images: data.artists.items[0].images[2].url,
                id: data.artists.items[0].id
            })
            .end()
            
        })
    
    }
})

///////Make a Playlist, Get songs, add to playlist//////

server.post("/playlist", async (req, res)=>{
    const name = req.body.name
    let body = {
        "name": name,
        "description": "Created using QuickList"
    }
    await fetch(`https://api.spotify.com/v1/users/${userId}/playlists`,{
        method: "POST",
        headers:{
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
        },
        body:JSON.stringify(body)
    })
    .then(res => res.json())
    .then(data =>{
        console.log("testing id", data["id"])
        playlistId = data["id"]
        res.end()
    })

    
    .catch(err=>{
        console.log(err)
    })

})

///////get songs//////
server.post("/topTracks", async (req, res) =>{
    tracks = []
    const id = req.body.id
    await fetch(`https://api.spotify.com/v1/artists/${id}/top-tracks?country=from_token`,{
        headers:{
            "Authorization": `Bearer ${token}`
        },
    })
    .then(res=>res.json())
    .then(data =>{
        let temp_tracks = data["tracks"]
        for(let i=0; i<10; i++){
            //console.log(temp_tracks[i].uri)
            tracks.push(temp_tracks[i].uri)
        }
    })
    
    await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
        method: "POST",
        headers:{
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
        },
        body:JSON.stringify({"uris":tracks})
    })
    .then(res = res.json())
    .then(data =>{
        console.log(data)
    })
    .catch(err => console.log(err))
})

server.listen(PORT, ()=>{
    console.log(`On Port ${PORT}`)
})