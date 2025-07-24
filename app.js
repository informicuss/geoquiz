// app.js

// Определяем, это мобильное устройство?
const isMobile = window.innerWidth <= 768;

let map = L.map('map', {
  attributionControl: false,
  worldCopyJump: false,
  // maxBounds: [[-85, -180], [85, 180]],
  // maxBoundsViscosity: 1.0,
  minZoom: isMobile ? 1 : 2,
  maxZoom: 8
}).fitWorld().setView([0, 0], 2);

// L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
L.tileLayer('https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png', {
  attribution: '',
  noWrap: true
}).addTo(map);


let geojsonData;
let allLayer;
let currentFeature;
let currentMode = 'learn';

// Список тем: название → файл
const themes = {
  "Исследования внутренних частей материков": "research_internal_continents_with_geom.geojson",
  "Русские путешественники": "russian_explorers_with_geom.geojson",
  "Географические открытия Древности": "ancient_discoveries_with_geom.geojson",
  "Географические открытия Средневековья": "medieval_discoveries_with_geom.geojson"
};

// Заполняем селектор тем и навешиваем обработчик
function populateThemeSelector() {
  const select = document.getElementById('themeSelect');
  Object.keys(themes).forEach(themeName => {
    const opt = document.createElement('option');
    opt.value = themes[themeName];
    opt.text = themeName;
    select.appendChild(opt);
  });
  select.addEventListener('change', () => {
    const file = select.value;
    document.getElementById('themeName').textContent = select.options[select.selectedIndex].text;
    loadGeoJSON(file);
  });
}

// Загрузка GeoJSON и отрисовка
function loadGeoJSON(url) {
  fetch(url)
    .then(res => res.json())
    .then(data => {
      geojsonData = data;
      removeHighlightLayers();
      if (currentMode === 'learn') renderLearnMode();
      else renderQuizMode();
    })
    .catch(err => {
      console.error("Ошибка загрузки", url, err);
      document.getElementById('question').textContent = "Не удалось загрузить данные темы.";
    });
}

// При старте страницы
document.addEventListener('DOMContentLoaded', () => {
  populateThemeSelector();
  // Выбираем первую тему по умолчанию
  const select = document.getElementById('themeSelect');
  select.selectedIndex = 0;
  document.getElementById('themeName').textContent = select.options[0].text;
  loadGeoJSON(select.value);
});

// вместо простого fitWorld в window.load делаем:
window.addEventListener('load', () => {
  // пересчитаем размеры
  map.invalidateSize(true);

  // найдём размеры контейнера
  const mapDiv = document.getElementById('map');
  const w = mapDiv.clientWidth;
  const h = mapDiv.clientHeight;

  // сколько тайлов нужно по ширине/высоте
  const tilesX = w / 256;
  const tilesY = h / 256;

  // логарифм по основанию 2 даёт нужный зум
  const zoomX = Math.log2(tilesX);
  const zoomY = Math.log2(tilesY);

  // берём потолок, чтобы покрыть и по ширине, и по высоте
  let startZoom = Math.ceil(Math.max(zoomX, zoomY));

  // не выходим за пределы настроенных min/max
  startZoom = Math.min(startZoom, map.getMaxZoom());
  startZoom = Math.max(startZoom, map.getMinZoom());

  // устанавливаем
  map.setView([0, 0], startZoom);
});

// при ресайзе просто пересчитываем контейнер
window.addEventListener('resize', () => map.invalidateSize(true));

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
        // 1) Скрываем инструкцию:
        document.getElementById('question').textContent = '';
        // 2) Показываем инфо по объекту:
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
  // Загружаем GeoJSON из текущей директории
  const url = `${topic}.geojson`;
  fetch(url)
    .then(res => {
      if (!res.ok) throw new Error(`Не удалось загрузить ${url}`);
      return res.json();
    })
    .then(data => {
      geojsonData = data;
      setMode('learn');
    })
    .catch(error => {
      console.error(error);
      alert('Ошибка при загрузке данных темы: ' + error.message);
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
