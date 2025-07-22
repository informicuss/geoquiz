// app.js
let map = L.map('map', {
  attributionControl: false,
  worldCopyJump: false,
  maxBounds: [[-85, -180], [85, 180]],
  maxBoundsViscosity: 1.0,
  minZoom: 2,
  maxZoom: 6
}).setView([20, 0], 2);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '',
  noWrap: true
}).addTo(map);

let geojsonData;
let allLayer;
let currentFeature;
let currentMode = 'learn';

// Cache mode buttons and next button
const learnBtn = document.querySelector('#modeSwitch button:nth-child(1)');
const quizBtn = document.querySelector('#modeSwitch button:nth-child(2)');
const nextBtn = document.getElementById('nextBtn');

function pickRandomFeature(features) {
  return features[Math.floor(Math.random() * features.length)];
}

function showQuestion(feature) {
  const questionEl = document.getElementById('question');
  if (currentMode === 'quiz') {
    questionEl.textContent = 'Найди: ' + feature.properties.name;
  } else {
    questionEl.textContent = 'Нажмите на объект, чтобы узнать информацию о нём.';
  }
  document.getElementById('feedback').innerHTML = '';
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
  // hide next button in learn mode
  nextBtn.style.display = 'none';

  allLayer = L.geoJSON(geojsonData, {
    style: { color: '#0077cc', weight: 1, fillOpacity: 0.2 },
    onEachFeature: function (feature, layer) {
      layer.on('click', () => {
        const name = feature.properties.name;
        const desc = feature.properties.description || 'Описание отсутствует';
        document.getElementById('feedback').innerHTML = `<h3>${name}</h3><p>${desc}</p>`;
      });
      const popupContent = `<strong>${feature.properties.name}</strong>`;
      layer.bindPopup(popupContent);
    }
  }).addTo(map);
}

function renderQuizMode() {
  clearMap();
  currentFeature = pickRandomFeature(geojsonData.features);
  showQuestion(currentFeature);
  // show next button in quiz mode
  nextBtn.style.display = 'inline-block';

  allLayer = L.geoJSON(geojsonData, {
    style: { color: '#999', weight: 1, fillOpacity: 0.1 }
  }).addTo(map);
}

// Global mode switch
function setMode(mode) {
  removeHighlightLayers();
  currentMode = mode;
  document.getElementById('feedback').innerHTML = '';
  // highlight active button
  learnBtn.classList.toggle('active', mode === 'learn');
  quizBtn.classList.toggle('active', mode === 'quiz');

  if (mode === 'learn') renderLearnMode();
  else renderQuizMode();
}
window.setMode = setMode;

function checkAnswer(e) {
  if (currentMode !== 'quiz' || !currentFeature) return;

  const pt = turf.point([e.latlng.lng, e.latlng.lat]);
  const poly = currentFeature.geometry;
  const match = turf.booleanPointInPolygon(pt, poly);

  document.getElementById('feedback').textContent = match
    ? '✅ Правильно! Название: ' + currentFeature.properties.name
    : '❌ Неправильно. Попробуй ещё.';

  if (match) {
    L.geoJSON(currentFeature, {
      style: { color: 'green', weight: 3, fillOpacity: 0.4 }
    }).addTo(map);
  }
}

function removeHighlightLayers() {
  map.eachLayer(layer => {
    if (layer.feature && layer.options && layer.options.color === 'green') {
      map.removeLayer(layer);
    }
  });
}

// Load GeoJSON by topic
function loadGeoJSONForTopic(topic) {
  fetch(`${topic}.geojson`)
    .then(res => {
      if (!res.ok) throw new Error(`Не удалось загрузить ${topic}.geojson`);
      return res.json();
    })
    .then(data => {
      geojsonData = data;
      setMode('learn');
    })
    .catch(error => {
      console.error(error);
      alert('Ошибка при загрузке данных темы.');
    });
}

// Start quiz called from HTML
window.startQuiz = function() {
  const select = document.getElementById('topic-select');
  const topic = select ? select.value : null;
  if (!topic) {
    alert('Пожалуйста, выберите тему.');
    return;
  }
  loadGeoJSONForTopic(topic);
};

// Next question button
document.getElementById('nextBtn').addEventListener('click', () => {
  removeHighlightLayers();
  if (currentMode === 'quiz') renderQuizMode();
});

// Map click for answer checking
map.on('click', checkAnswer);
