let map = L.map('map', {
  worldCopyJump: false,
  maxBounds: [
    [-85, -180],
    [85, 180]
  ],
  maxBoundsViscosity: 1.0,
  minZoom: 2,
  maxZoom: 6
}).setView([20, 0], 2);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors',
  noWrap: true
}).addTo(map);

let geojsonData;
let allLayer;
let currentFeature;
let currentMode = 'learn';

function pickRandomFeature(features) {
  return features[Math.floor(Math.random() * features.length)];
}

function showQuestion(feature) {
  document.getElementById('question').textContent =
    currentMode === 'quiz'
      ? 'Найди: ' + feature.properties.name
      : 'Нажмите на объект, чтобы узнать его название.';
  document.getElementById('feedback').textContent = '';
}

function clearMap() {
  if (allLayer) {
    allLayer.remove();
    allLayer = null;
  }
}

function renderLearnMode() {
  clearMap();
  showQuestion(null);

  allLayer = L.geoJSON(geojsonData, {
    style: { color: '#0077cc', weight: 1, fillOpacity: 0.2 },
    onEachFeature: function (feature, layer) {
      layer.on('click', () => {
        document.getElementById('feedback').textContent = `🌍 Это: ${feature.properties.name}`;
      });
    }
  }).addTo(map);
}

function renderQuizMode() {
  clearMap();
  currentFeature = pickRandomFeature(geojsonData.features);
  showQuestion(currentFeature);

  allLayer = L.geoJSON(geojsonData, {
    style: { color: '#999', weight: 1, fillOpacity: 0.1 }
  }).addTo(map);
}

function setMode(mode) {
  removeHighlightLayers();
  currentMode = mode;
  document.getElementById('feedback').textContent = '';
  if (mode === 'learn') {
    renderLearnMode();
  } else {
    renderQuizMode();
  }
}

function checkAnswer(e) {
  if (currentMode !== 'quiz' || !currentFeature) return;

  const pt = turf.point([e.latlng.lng, e.latlng.lat]);
  const poly = currentFeature.geometry;
  const match = turf.booleanPointInPolygon(pt, poly);

  document.getElementById('feedback').textContent = match
    ? '✅ Правильно!'
    : '❌ Неправильно. Попробуй ещё.';

  if (match) {
    L.geoJSON(currentFeature, {
      style: { color: 'green', weight: 3, fillOpacity: 0.4 }
    }).addTo(map);
  }
}

function removeHighlightLayers() {
  map.eachLayer(layer => {
    if (
      layer.feature &&
      layer.options &&
      layer.options.color === 'green'
    ) {
      map.removeLayer(layer);
    }
  });
}

document.getElementById('nextBtn').addEventListener('click', () => {
  removeHighlightLayers();
  if (currentMode === 'quiz') renderQuizMode();
});
map.on('click', checkAnswer);

fetch('features.geojson')
  .then(res => res.json())
  .then(data => {
    geojsonData = data;
    setMode('learn'); // стартовый режим
  });
