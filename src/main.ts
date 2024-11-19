// @deno-types="npm:@types/leaflet@^1.9.14"
import leaflet, { LatLng } from "leaflet";
import { Board, Cell } from "./board.ts";

// Style sheets
import "leaflet/dist/leaflet.css";
import "./style.css";

// Fix missing marker images
import "./leafletWorkaround.ts";

// Deterministic random number generator
import luck from "./luck.ts";

interface Cache {
  coins: Coin[];
  toMomento(cache: Cache): string;
  fromMomento(momento: string): Coin[];
}

interface Coin {
  cell: Cell;
  serial: number;
}

const HOME = leaflet.latLng(36.98949379578401, -122.06277128548504);
const ZOOM = 18;
const TILE_DEGREES = .0001;
const REACH_TILES = 8;
const CHANCE_PER_CELL = 0.1;

const InventoryChangeEvent = new Event("inventory-changed");

const APP_NAME = "Santa Cruz Geocoin";
const app = document.querySelector<HTMLDivElement>("#app")!;
const title = app.querySelector<HTMLDivElement>("#title")!;
const header = app.querySelector<HTMLDivElement>("#header")!;
const mapElem = app.querySelector<HTMLDivElement>("#map")!;
const footer = app.querySelector<HTMLDivElement>("#footer")!;

document.title = APP_NAME;
title.innerHTML = APP_NAME;

const map = leaflet.map(mapElem, {
  center: HOME,
  zoom: ZOOM,
  minZoom: ZOOM,
  maxZoom: ZOOM,
  zoomControl: false,
  scrollWheelZoom: false,
});

let playerLocation: LatLng = HOME;
const inventory: Cache = {
  coins: [],
  toMomento: cacheToMomento,
  fromMomento: cacheFromMomento,
};
const board: Board = new Board(TILE_DEGREES, REACH_TILES);

const stateDependentGroup = leaflet.layerGroup().addTo(map);

const homeMarker = leaflet.marker(HOME);
homeMarker.bindTooltip("Where it all started");
homeMarker.addTo(map);

function cellToLatLng(cell: Cell): LatLng {
  return new LatLng(cell.i * TILE_DEGREES, cell.j * TILE_DEGREES);
}

function cacheToMomento(cache: Cache) {
  return JSON.stringify(cache.coins);
}

function cacheFromMomento(momento: string): Coin[] {
  return JSON.parse(momento);
}

function getCoinCode(coin: Coin): string {
  return `${coin.cell.i}:${coin.cell.j}#${coin.serial}`;
}

function formatCacheString(cache: Cache): string {
  let outString: string = "<ol>";
  for (const coin of cache.coins) {
    outString += "<li>" + getCoinCode(coin) + "</li>";
  }
  outString += "<ol>";
  return outString;
}
//testing
function collect(coin: Coin): Coin {
  inventory.coins.push(coin);
  app.dispatchEvent(InventoryChangeEvent);
  return coin;
}

function deposit(): Coin | undefined {
  if (inventory.coins.length > 0) {
    const coin = inventory.coins.pop();
    app.dispatchEvent(InventoryChangeEvent);
    return coin;
  } else {
    return undefined;
  }
}

function initializeGrid(playerCell: leaflet.LatLng) {
  stateDependentGroup.clearLayers();
  const playerMarker = leaflet.marker(playerCell);
  playerMarker.bindTooltip("Current Location");
  playerMarker.addTo(stateDependentGroup);
  map.panTo(playerCell);
  for (const cell of board.getCellsNearPoint(playerCell)) {
    if (luck([cell.i, cell.j].toString()) < CHANCE_PER_CELL) {
      spawnCache(cell.i, cell.j);
    }
  }
}

leaflet
  .tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: ZOOM,
    attribution:
      '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  })
  .addTo(map);

function spawnCache(i: number, j: number) {
  const correspondingCell: Cell = { i: i, j: j };
  const coords: LatLng = cellToLatLng(correspondingCell);

  // Dot to represent cache
  const rect = leaflet.rectangle(board.getCellBounds(correspondingCell));
  rect.addTo(stateDependentGroup);

  const newCache: Cache = {
    coins: [],
    toMomento: cacheToMomento,
    fromMomento: cacheFromMomento,
  };
  const retrieveCache = board.loadCache(correspondingCell);
  if (retrieveCache) {
    newCache.coins = newCache.fromMomento(retrieveCache);
  } else {
    const coinsGenerated = Math.floor(
      Math.ceil(luck([i, j, "initialValue"].toString()) * 5),
    );
    for (let n = 0; n < coinsGenerated; n++) {
      //console.log({ cell : board.getCellForPoint(coords), serial: n })
      newCache.coins.push({ cell: board.getCellForPoint(coords), serial: n });
    }
  }

  // Handle interactions with the cache
  rect.bindPopup(() => {
    // The popup offers a description and button
    const popupDiv = document.createElement("div");
    popupDiv.innerHTML = `
                <div>There is a cache here at "${i * TILE_DEGREES},${
      j * TILE_DEGREES
    }".\n Coins: <span id="value">${formatCacheString(newCache)}</span></div>
                <button id="take">take a coin</button>
                <button id="give">give a coin</button>`;

    // Clicking the button decrements the cache's value and increments the player's points
    popupDiv
      .querySelector<HTMLButtonElement>("#take")!
      .addEventListener("click", () => {
        console.log("yoink");
        // deno-lint-ignore prefer-const
        let shinyCoin: Coin | undefined = newCache.coins.pop();
        if (shinyCoin) {
          collect(shinyCoin);
          popupDiv.querySelector<HTMLSpanElement>("#value")!.innerHTML =
            formatCacheString(newCache);
          board.saveCache(correspondingCell, newCache.toMomento(newCache));
        }
      });
    popupDiv
      .querySelector<HTMLButtonElement>("#give")!
      .addEventListener("click", () => {
        console.log("keepthechange");
        // deno-lint-ignore prefer-const
        let shinyCoin: Coin | undefined = deposit();
        if (shinyCoin) {
          newCache.coins.push(shinyCoin);
          popupDiv.querySelector<HTMLSpanElement>("#value")!.innerHTML =
            formatCacheString(newCache);
          board.saveCache(correspondingCell, newCache.toMomento(newCache));
        }
      });
    return popupDiv;
  });
}

function buttonMove(dir: Cell): void {
  playerLocation = new LatLng(
    playerLocation.lat + dir.i * TILE_DEGREES,
    playerLocation.lng + dir.j * TILE_DEGREES,
  );
  initializeGrid(playerLocation);
}

//TODO : Movement buttons added to the header;
function createButton(dir: Cell, icon: string) {
  const newButton = document.createElement("button");
  newButton.addEventListener("click", () => {
    buttonMove(dir);
  });
  newButton.innerHTML = icon;
  header.append(newButton);
}

createButton({ i: 1, j: 0 }, "UP");
createButton({ i: 0, j: -1 }, "LEFT");
createButton({ i: -1, j: 0 }, "DOWN");
createButton({ i: 0, j: 1 }, "RIGHT");

initializeGrid(HOME);

const footerInventory = document.createElement("div");
footerInventory.innerHTML = `Coins: ${formatCacheString(inventory)}`;
app.addEventListener("inventory-changed", () => {
  footerInventory.innerHTML = `Coins: ${formatCacheString(inventory)}`;
});
footer.append(footerInventory);
