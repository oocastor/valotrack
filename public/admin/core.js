socket = io();

function usageReport () {
    i = document.querySelector("#i").value;
    if(i != "") socket.emit("usageReport", i);
}

socket.on("getUsageReport", (data) => {
    document.querySelector("#search").style.display = "none";
    document.querySelector("#main").style.display = "flex";
    temp = "";
    data = data.sort((a,b) => a.date > b.date ? -1 : 1);
    data.forEach(e => {
        el = `
        <div class="item">
            <h2>${e.name} <span>#${e.tag}</span></h2>
            <p>${e.date != undefined ? e.date : "none"}</p>
        </div>
        `;
        temp += el;
    });
    document.querySelector(".list").innerHTML = temp;
    document.querySelector(".list_length").innerHTML = data.length;
});

document.addEventListener("keydown", (e) => {
    if(e.keyCode === 13) usageReport();
});