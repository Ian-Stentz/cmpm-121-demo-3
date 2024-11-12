// @deno-types="npm:@types/leaflet@^1.9.14"
import leaflet from "leaflet";

// Style sheets
import "leaflet/dist/leaflet.css";
import "./style.css";

// Fix missing marker images
import "./leafletWorkaround.ts";

// Deterministic random number generator
import luck from "./luck.ts";

const APP_NAME = "Santa Cruz Geocoin";
const app = document.querySelector<HTMLDivElement>("#app")!;
const title = app.querySelector<HTMLDivElement>("#title")!;
const header = app.querySelector<HTMLDivElement>("#header")!;
const map = app.querySelector<HTMLDivElement>("#map")!;
const footer = app.querySelector<HTMLDivElement>("#footer")!;


document.title = APP_NAME;
title.innerHTML = APP_NAME;

function alertButFunct() {
  alert("you clicked the button");
}

const alertButton = document.createElement("button");
alertButton.innerHTML = "ALERT";
alertButton.addEventListener("click", alertButFunct);
header.append(alertButton);
