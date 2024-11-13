// @deno-types="npm:@types/leaflet@^1.9.14"
import leaflet from "leaflet";

// Style sheets
import "leaflet/dist/leaflet.css";
import "./style.css";

// Fix missing marker images
import "./leafletWorkaround.ts";

// Deterministic random number generator
import luck from "./luck.ts";

const HOME = leaflet.latLng(36.98949379578401, -122.06277128548504);
const HOMECELL: Cell = { i: 0, j: 0 };
const ZOOM = 18;
const TILE_DEGREES = .0001;
const REACH_TILES = 8;
const CHANCE_PER_CELL = 0.1;

interface Cell {
  i: number;
  j: number;
}

interface Cache {
  coins: Coin[];
}

interface Coin {
  cell: Cell;
  serial: number;
}

const InventoryChangeEvent = new Event("inventory-changed");

const APP_NAME = "Santa Cruz Geocoin";
const app = document.querySelector<HTMLDivElement>("#app")!;
const title = app.querySelector<HTMLDivElement>("#title")!;
const header = app.querySelector<HTMLDivElement>("#header")!;
const mapElem = app.querySelector<HTMLDivElement>("#map")!;
const footer = app.querySelector<HTMLDivElement>("#footer")!;

let coins: number = 0;

function CellToLatLng(cell: Cell): Cell {
  return {
    i: cell.i * TILE_DEGREES + HOME.lat,
    j: cell.j * TILE_DEGREES + HOME.lng,
  };
}

// function CellToOrderedPair(cell : Cell) : number[]{
//   return [cell.i, cell.j];
// }

// function CellEquals(cellA : Cell, cellB : Cell) : boolean{
//   return (cellA.i == cellB.i && cellA.j == cellB.j);
// }

function ManhattanDistance(cellA: Cell, cellB: Cell): number {
  return Math.abs(cellA.i - cellB.i) + Math.abs(cellA.j - cellB.j);
}

// deno-lint-ignore no-unused-vars
function Collect(coin: Coin, cell: Cell): Coin {
  coins += 1;
  app.dispatchEvent(InventoryChangeEvent);
  return coin;
}

function Deposit(coin: Coin, cell: Cell): Coin | undefined {
  if (coins > 0) {
    coin.cell = cell;
    coins -= 1;
    app.dispatchEvent(InventoryChangeEvent);
    return coin;
  } else {
    return undefined;
  }
}

document.title = APP_NAME;
title.innerHTML = APP_NAME;

function alertButFunct() {
  alert("you clicked the button");
}

const alertButton = document.createElement("button");
alertButton.innerHTML = "ALERT";
alertButton.addEventListener("click", alertButFunct);
header.append(alertButton);

const map = leaflet.map(mapElem, {
  center: HOME,
  zoom: ZOOM,
  minZoom: ZOOM - 2,
  maxZoom: ZOOM + 2,
  zoomControl: false,
  scrollWheelZoom: false,
});

leaflet
  .tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: ZOOM,
    attribution:
      '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  })
  .addTo(map);

const playerMarker = leaflet.marker(HOME);
playerMarker.bindTooltip("Where it all started");
playerMarker.addTo(map);

function spawnCache(i: number, j: number) {
  // deno-lint-ignore prefer-const
  let c: Cell = CellToLatLng({ i: i, j: j });

  // Dot to represent cache
  const rect = leaflet.circle(leaflet.latLng(c.i, c.j), { radius: 3 });
  rect.addTo(map);

  // Handle interactions with the cache
  rect.bindPopup(() => {
    // Each cache has a random point value, mutable by the player
    // deno-lint-ignore prefer-const
    let newCache: Cache = { coins: [] };
    // deno-lint-ignore prefer-const
    let coinsGenerated = Math.floor(
      luck([i, j, "initialValue"].toString()) * 5,
    );
    for (let i = 0; i < coinsGenerated; i++) {
      newCache.coins.push({ cell: { i: i, j: j }, serial: 0 });
    }

    // The popup offers a description and button
    const popupDiv = document.createElement("div");
    popupDiv.innerHTML = `
                <div>There is a cache here at "${i},${j}". It has <span id="value">${coinsGenerated}</span> coins.</div>
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
          Collect(shinyCoin, { i: i, j: j });
          popupDiv.querySelector<HTMLSpanElement>("#value")!.innerHTML =
            newCache.coins.length.toString();
        }
      });
    popupDiv
      .querySelector<HTMLButtonElement>("#give")!
      .addEventListener("click", () => {
        console.log("keepthechange");
        // deno-lint-ignore prefer-const
        let shinyCoin: Coin | undefined = Deposit({
          cell: { i: i, j: j },
          serial: 0,
        }, { i: i, j: j });
        if (shinyCoin) {
          newCache.coins.push(shinyCoin);
          popupDiv.querySelector<HTMLSpanElement>("#value")!.innerHTML =
            newCache.coins.length.toString();
        }
      });
    return popupDiv;
  });
}

//spawn caches with 10% chance per tile if they are within 8 tiles' Manhattan Distance
for (let i = -REACH_TILES; i < REACH_TILES; i++) {
  for (let j = -REACH_TILES; j < REACH_TILES; j++) {
    if (
      luck([i, j].toString()) < CHANCE_PER_CELL &&
      ManhattanDistance(HOMECELL, { i: i, j: j }) <= REACH_TILES
    ) {
      spawnCache(i, j);
    }
  }
}

const footerInventory = document.createElement("div");
footerInventory.innerHTML = `Coins: ${coins};`;
app.addEventListener("inventory-changed", () => {
  footerInventory.innerHTML = `Coins: ${coins};`;
});
footer.append(footerInventory);
