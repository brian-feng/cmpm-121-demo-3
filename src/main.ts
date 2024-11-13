// @deno-types="npm:@types/leaflet@^1.9.14"
import leaflet from "leaflet";

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

// Display the player's points
let playerPoints = 0;
const statusPanel = document.querySelector<HTMLDivElement>("#statusPanel")!; // element `statusPanel` is defined in index.html
statusPanel.innerHTML = "No points yet...";
statusPanel.style.font = "bold 24px sans-serif";

// Add caches to the map by cell numbers
function spawnCache(i: number, j: number) {
  // Convert cell numbers into lat/lng bounds
  const origin = OAKES_CLASSROOM;
  const bounds = leaflet.latLngBounds([
    [origin.lat + i * TILE_DEGREES, origin.lng + j * TILE_DEGREES],
    [origin.lat + (i + 1) * TILE_DEGREES, origin.lng + (j + 1) * TILE_DEGREES],
  ]);

  // Add a rectangle to the map to represent the cache
  const rect = leaflet.rectangle(bounds);
  rect.addTo(map);

  // Handle interactions with the cache
  rect.bindPopup(() => {
    // Each cache has a random point value, mutable by the player
    const pointValue = Math.floor(
      luck([i, j, "initialValue"].toString()) * 100,
    );

    const popupDiv = document.createElement("div");
    // Base text for the cache
    const coins: string[] = [
      `<li>Coin "${Math.floor((origin.lat + i * TILE_DEGREES) * 10000)}:${
        Math.floor((origin.lng + j * TILE_DEGREES) * 10000)
      } #1 
        <button id="take1">Take</button></li>`,
    ];
    // Add additional coins based on the cache's value
    for (let i = 0; i < 3; i++) {
      if (pointValue > i * 33) {
        coins.push(
          `<li>Coin "${Math.floor((origin.lat + i * TILE_DEGREES) * 10000)}:${
            Math.floor((origin.lng + j * TILE_DEGREES) * 10000)
          } #${i + 2}
            <button id="take${i + 2}">Take</button></li>`,
        );
      }
    }
    // Set up the text for the cache
    let text = `<div><b>Cache "${
      Math.floor((origin.lat + i * TILE_DEGREES) * 10000)
    }:${Math.floor((origin.lng + j * TILE_DEGREES) * 10000)}".</b></div>
                <br></br>
                <div>Inventory: 
                    <ul>`;
    for (let i = 0; i < coins.length; i++) {
      text += coins[i];
    }
    text += `       </ul>
                </div>`;
    popupDiv.innerHTML = text;

    // Clicking the button decrements the cache's value and increments the player's points
    for (let i = 1; i < coins.length + 1; i++) {
      popupDiv
        .querySelector<HTMLButtonElement>(`#take${i}`)!
        .addEventListener("click", () => {
          popupDiv.querySelector<HTMLButtonElement>(`#take${i}`)!.disabled =
            true;
          playerPoints++;
          statusPanel.innerHTML = `${playerPoints} points accumulated`;
          let status = true;
          for (let i = 1; i < coins.length + 1; i++) {
            if (
              popupDiv.querySelector<HTMLButtonElement>(`#take${i}`)!
                .disabled == false
            ) {
              status = false;
            }
          }
          if (status) {
            rect.remove();
          }
        });
    }
    return popupDiv;
  });
}

// Look around the player's neighborhood for caches to spawn
for (let i = -NEIGHBORHOOD_SIZE; i < NEIGHBORHOOD_SIZE; i++) {
  for (let j = -NEIGHBORHOOD_SIZE; j < NEIGHBORHOOD_SIZE; j++) {
    // If location i,j is lucky enough, spawn a cache!
    if (luck([i, j].toString()) < CACHE_SPAWN_PROBABILITY) {
      spawnCache(i, j);
    }
  }
}
