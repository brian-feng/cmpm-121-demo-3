// @deno-types="npm:@types/leaflet@^1.9.14"
import leaflet from "leaflet";
import { Board } from "./board.ts";

// Style sheets
import "leaflet/dist/leaflet.css";
import "./style.css";

// Fix missing marker images
import "./leafletWorkaround.ts";

// Deterministic random number generator
import luck from "./luck.ts";

// Location of our classroom (as identified on Google Maps)
const OAKES_CLASSROOM = leaflet.latLng(36.98949379578401, -122.06277128548504);

// Tunable gameplay parameters
const GAMEPLAY_ZOOM_LEVEL = 19;
const TILE_DEGREES = 1e-4;
const NEIGHBORHOOD_SIZE = 8;
const CACHE_SPAWN_PROBABILITY = 0.1;

// Create the map (element with id "map" is defined in index.html)
const map = leaflet.map(document.getElementById("map")!, {
  center: OAKES_CLASSROOM,
  zoom: GAMEPLAY_ZOOM_LEVEL,
  minZoom: GAMEPLAY_ZOOM_LEVEL,
  maxZoom: GAMEPLAY_ZOOM_LEVEL,
  zoomControl: false,
  scrollWheelZoom: false,
});

// Populate the map with a background tile layer
leaflet
  .tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution:
      '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  })
  .addTo(map);

// Add a marker to represent the player
const playerMarker = leaflet.marker(OAKES_CLASSROOM);
playerMarker.bindTooltip("That's you!");
playerMarker.addTo(map);

// Display App Title
const title = document.querySelector<HTMLDivElement>("#title")!;
title.innerHTML = "Geocoin Carrier";
title.style.marginLeft = "10px";
title.style.font = "bold 54px sans-serif";

const origin = OAKES_CLASSROOM;

// Display the player's points
const statusPanel = document.querySelector<HTMLDivElement>("#statusPanel")!; // element `statusPanel` is defined in index.html
statusPanel.innerHTML = "No points yet...";
statusPanel.style.font = "bold 24px sans-serif";

interface Coin {
  i: number;
  j: number;
  serial: number;
}

function roundNumber(value: number): number {
  // for numerical representation of position
  return Math.floor(value * 10000);
}

function generateLatLong(i: number, j: number) {
  return [
    roundNumber(origin.lat + i * TILE_DEGREES),
    roundNumber(origin.lng + j * TILE_DEGREES),
  ];
}

function regenerateText(
  coins: Coin[],
  popupDiv: HTMLDivElement,
  i: number,
  j: number,
) {
  const [lat, lng] = generateLatLong(i, j);
  // Set up the text for the cache
  let text = `<div><b>Cache "${lat}:${lng}".</b></div>
							<br></br>
							<div>Coins: 
									<ul>`;
  for (let k = 0; k < coins.length; k++) {
    text += `<li>Coin ${
      Math.floor((origin.lat + coins[k].i * TILE_DEGREES) * 10000)
    }:${Math.floor((origin.lng + coins[k].j * TILE_DEGREES) * 10000)} #${
      coins[k].serial
    }</li>`;
  }
  text += `       </ul>
							</div>
					<button id="take">Take Coin</button>
					<button id="deposit">Deposit Coin</button>`;
  popupDiv.innerHTML = text;
}

function generateCoins(i: number, j: number) {
  const [lat, lng] = generateLatLong(i, j);

  const pointValue = Math.floor(
    luck([i, j, "initialValue"].toString()) * 100,
  );

  const coins: Coin[] = [];
  for (let k = 0; k < 3; k++) {
    if (pointValue > k * 33) {
      coins.push({ i: lat, j: lng, serial: k + 1 });
    }
  }

  if (coinCache.get([lat, lng].toString()) == null) {
    coinCache.set([lat, lng].toString(), coins);
  }
}

// holds the currently spawned coin caches
const board = new Board(TILE_DEGREES, NEIGHBORHOOD_SIZE);

// player's coin inventory
const playerCoins: Coin[] = [];
const coinCache: Map<string, Coin[]> = new Map<string, Coin[]>();

// Add caches to the map by cell numbers
function spawnCache(i: number, j: number) {
  const [lat, lng] = generateLatLong(i, j);
  // Convert cell numbers into lat/lng bounds
  const bounds = leaflet.latLngBounds([
    [origin.lat + i * TILE_DEGREES, origin.lng + j * TILE_DEGREES],
    [origin.lat + (i + 1) * TILE_DEGREES, origin.lng + (j + 1) * TILE_DEGREES],
  ]);

  generateCoins(i, j);

  // Add a rectangle to the map to represent the cache
  const rect = leaflet.rectangle(bounds);
  rect.addTo(map);

  // Handle interactions with the cache
  rect.bindPopup(() => {
    const popupDiv = document.createElement("div");
    regenerateText(coinCache.get([lat, lng].toString())!, popupDiv, i, j);

    // Clicking the take button decrements the cache's value and increments the player's coins
    popupDiv
      .querySelector<HTMLButtonElement>(`#take`)!
      .addEventListener("click", () => {
        if (coinCache.get([lat, lng].toString())!.length > 0) {
          console.log(coinCache.get([lat, lng].toString())!);
          playerCoins.push(
            coinCache.get(
              [lat, lng].toString(),
            )![coinCache.get([lat, lng].toString())!.length - 1],
          );
          coinCache.get([lat, lng].toString())!.pop();
          statusPanel.innerHTML = `${playerCoins.length} coins accumulated`;
          rect.closePopup();
        }
      });

    // Clicking the deposit button increments the cache's value and decrements the player's coins
    popupDiv
      .querySelector<HTMLButtonElement>(`#deposit`)!
      .addEventListener("click", () => {
        if (playerCoins.length > 0) {
          coinCache.get([lat, lng].toString())!.push(
            playerCoins[playerCoins.length - 1],
          );
          playerCoins.pop();
          statusPanel.innerHTML = `${playerCoins.length} coins accumulated`;
          rect.closePopup();
        }
      });

    return popupDiv;
  });
}

for (let i = -NEIGHBORHOOD_SIZE; i < NEIGHBORHOOD_SIZE; i++) {
  for (let j = -NEIGHBORHOOD_SIZE; j < NEIGHBORHOOD_SIZE; j++) {
    if (luck([i, j].toString()) < CACHE_SPAWN_PROBABILITY) {
      board.addCell(i, j);
      spawnCache(i, j);
    }
  }
}
