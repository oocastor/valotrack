const fetch = require('node-fetch');
const express = require('express');
const app = express();
const fs = require('fs');

app.set("views", "public");
app.set('view engine', 'ejs');

app.use(express.static(__dirname + '/public'));

updateIntervalInHours = 3;
searchedUsers = [];

if (fs.existsSync("data.json")) {
    rawdata = fs.readFileSync('data.json');
    searchedUsers = JSON.parse(rawdata);
}

app.use("/", async (req, res) => {
    if(req.query.user == undefined || req.query.user == "" || req.query.tag == undefined || req.query.tag == "") res.render("index.ejs", {searched: false, data: {}})
    else {
        res.render("index.ejs", {searched: true, data: await getData(req.query.user, req.query.tag) || false});
    }
});

async function getData (user, tag, save = true) {
    try {
        const response = await fetch(`https://api.henrikdev.xyz/valorant/v3/matches/eu/${user}/${tag}?size=99`, {
            method: 'GET',
            headers: {}
        });
        const res = await response.json();
        if(res.status != undefined && res.status == "200") {
            if(searchedUsers.find(f=>f.name === user && f.tag === tag)) data = searchedUsers.find(f=>f.name === user && f.tag === tag)
            else data = {name: user, tag: tag, cardUrl: "", lvl: 0, ki: 0, de: 0, kds: [], maps: []};
            m = [];
            res.data.forEach(e => {
                e.players.all_players.forEach(d => {
                    if(d.name === user && !data.maps.find(q=>q.id===e.metadata.matchid)) {
                        if(d.assets.card.small !== data.cardUrl) data.cardUrl = d.assets.card.small;
                        if(data.lvl < d.level) data.lvl = d.level;
                        data.ki += d.stats.kills;
                        data.de += d.stats.deaths;
                        data.kds.push(Math.round((d.stats.kills/(d.stats.deaths == 0 ? 1 : d.stats.deaths)) * 100) / 100);
                        m.push({id: e.metadata.matchid, name: e.metadata.map, tier: d.currenttier_patched, mode: e.metadata.mode, k: d.stats.kills, d: d.stats.deaths, won: d.team === "Red" && e.teams.red.has_won || d.team === "Blue" && !e.teams.red.has_won});
                    }
                });
            });
            q = 0;
            data.kds.forEach(e => q += e);
            data.maps = m.concat(data.maps);
            if(!searchedUsers.find(f=>f.name === user && f.tag === tag)) searchedUsers.push(data);
            if(save) fs.writeFileSync("data.json", JSON.stringify(searchedUsers));
            return {name: user, tag: tag, tier: data.maps.filter(f=>f.tier !== "Unrated")[0] !== undefined ? data.maps.filter(f=>f.tier !== "Unrated")[0].tier : "-", cardUrl: data.cardUrl, lvl: data.lvl, winrate: !isNaN(data.maps.filter(f=>f.won).length/data.maps.length*100) ? Math.round(data.maps.filter(f=>f.won).length/data.maps.length*100) : 0, oKD: (Math.round((data.ki/(data.de == 0 ? 1 : data.de)) * 100) / 100), aKD: (Math.round((q/data.kds.length) * 100) / 100), maps: data.maps};
        }
    } catch (e) {
        console.log(e);
    }
}

setInterval(() => {
    searchedUsers.forEach(e=>getData(e.name, e.tag, true));
    fs.writeFileSync("data.json", JSON.stringify(searchedUsers));
}, updateIntervalInHours * 1000 * 60 * 60);

app.listen(7775, () => {
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