const fetch = require('node-fetch');
const fs = require('fs');
const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);
const moment = require("moment");

app.set("views", "public");
app.set('view engine', 'ejs');

app.use(express.static(__dirname + '/public'));

adminTkn = "temp";
updateIntervalInHours = 3;
searchedUsers = [];

if (fs.existsSync("data.json")) {
    rawdata = fs.readFileSync('data.json');
    searchedUsers = JSON.parse(rawdata);
}

io.on('connection', (socket) => {
    socket.on("usageReport", (tkn) => {
        if(tkn === adminTkn) socket.emit("getUsageReport", searchedUsers);
    })
});

app.get("/", async (req, res) => {
    if(req.query.user == undefined || req.query.user == "" || req.query.tag == undefined || req.query.tag == "") res.render("index.ejs", {searched: false, data: {}})
    else res.render("index/index.ejs", {searched: true, data: await getData(req.query.user, req.query.tag, true) || false});
});

app.get("/admin", (req, res) => {
    res.render("admin/admin.ejs");
});

async function getData (name, tag, byUser, save = true) {
    userData = await getRank(name, tag);
    if(userData) {
        search = searchedUsers.find(f=>f.name === userData.name && f.tag === userData.tag);
        if(search != undefined) obj = search;
        else obj = {date: "", name: userData.name, tag: userData.tag, cardUrl: "", lvl: 0, ki: 0, de: 0, kds: [], kdsSum: 0, maps: []};
        obj = await getMatches(obj);
        console.log(obj);
        if(obj != false) {
            if(byUser) obj.date = moment().format("YYYY-MM-DD");
            if(!searchedUsers.find(f=>f.name === userData.name && f.tag === userData.tag)) searchedUsers.push(obj);
            if(save) fs.writeFileSync("data.json", JSON.stringify(searchedUsers));
            return {name: userData.name, tag: userData.tag, tier: userData.rank, cardUrl: obj.cardUrl, lvl: obj.lvl, winrate: !isNaN(obj.maps.filter(f=>f.won).length/obj.maps.length*100) ? Math.round(obj.maps.filter(f=>f.won).length/obj.maps.length*100) : 0, oKD: (Math.round((obj.ki/(obj.de == 0 ? 1 : obj.de)) * 100) / 100), aKD: (Math.round((obj.kdsSum/obj.kds.length) * 100) / 100), maps: obj.maps};
        }
    }        
}

async function getRank (name, tag) {
    try {
        const response = await fetch(`https://api.henrikdev.xyz/valorant/v1/mmr-history/eu/${name}/${tag}`, {
            method: 'GET',
            headers: {}
        });
        const res = await response.json();
        if(res.status == "200") return {name: res.name, tag: res.tag, rank: (res.data[0].currenttierpatched == undefined ? "none" : res.data[0].currenttierpatched)};
        else return false
    } catch (e) {
        console.log(e);
    }
}

async function getMatches(obj) {
    try {
        const response = await fetch(`https://api.henrikdev.xyz/valorant/v3/matches/eu/${obj.name}/${obj.tag}?size=99`, {
            method: 'GET',
            headers: {}
        });
        const res = await response.json();
        if(res.status == "200") {
            m = [];
            res.data.forEach(e => {
                e.players.all_players.forEach(d => {
                    if(d.name === obj.name && !obj.maps.find(q=>q.id===e.metadata.matchid)) {
                        //change card url and level by newest match
                        if(res.data.indexOf(e) == 0) {
                            obj.cardUrl = d.assets.card.small;
                            obj.lvl = d.level;
                        }
                        obj.ki += d.stats.kills;
                        obj.de += d.stats.deaths;
                        obj.kds.push(Math.round((d.stats.kills/(d.stats.deaths == 0 ? 1 : d.stats.deaths)) * 100) / 100);
                        m.push({id: e.metadata.matchid, name: e.metadata.map, mode: e.metadata.mode, k: d.stats.kills, d: d.stats.deaths, won: d.team === "Red" && e.teams.red.has_won || d.team === "Blue" && !e.teams.red.has_won});
                    }
                });
            });
            obj.kdsSum = obj.kds.reduce((a,b) => a+b,0);
            obj.maps = m.concat(obj.maps);
            return obj;
        } else return false;
    } catch (e) {
        console.log(e);
    }
}

setInterval(() => {
    searchedUsers.forEach(e=>getData(e.name, e.tag, false, true));
    fs.writeFileSync("data.json", JSON.stringify(searchedUsers));
}, updateIntervalInHours * 1000 * 60 * 60);

http.listen(7775, () => {
    console.log("Server up and running on Port 7775");
});

//test run
if(process.argv.includes("--test")) {
    data = getData("Innecesari0", "2113", false);
    setTimeout(() => {
        console.log(data.name == undefined ? "Cannot fetch data, something is wrong!" : "Fetched Data for: "+data.name+" - Everything is working fine!");
        process.exit(data.name == undefined ? 1 : 0);
    }, 5000);
}

function fixList () {
    searchedUsers.forEach(e => {
        e.name = e.name.toLowerCase();
    });
}