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
let selectedListItem = null;

const DELAY_MS = 3000; // задержка перед следующим вопросом
let quizQueue = [];
let currentIndex = 0;
let correctAnswers = 0;
let mistakes = 0;
let attemptCount = 0;

// Список тем: название → файл
const themes = {
  "Исследования внутренних частей материков": "research_internal_continents_with_geom.geojson",
  "Русские путешественники": "russian_explorers_with_geom.geojson",
  "Географические открытия Древности": "ancient_discoveries_with_geom.geojson",
  "Географические открытия Средневековья": "medieval_discoveries_with_geom.geojson"
};


function shuffleArray(array) {
  const arr = array.slice(); // копия исходного массива
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}


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
      else if (currentMode === 'quiz') renderQuizMode();
      else if (currentMode === 'hardQuiz') renderHardQuizMode(); 
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
const hardBtn = document.getElementById('hardQuizBtn');
const nextBtn = document.getElementById('nextBtn');

function pickRandomFeature(features) {
  return features[Math.floor(Math.random() * features.length)];
}

function startQuiz() {
  clearMap();
  removeHighlightLayers();
  toggleObjectList(false);

  quizQueue = shuffleArray([...geojsonData.features]);
  currentIndex = 0;
  correctAnswers = 0;
  mistakes = 0;
  attemptCount = 0;

  renderNextQuizQuestion();
}

function renderNextQuizQuestion() {
  clearMap();
  removeHighlightLayers();
  document.getElementById('feedback').textContent = '';
  nextBtn.style.display = 'none';
  answeredCorrectly = false;
  attemptCount = 0;

  if (currentIndex >= quizQueue.length) {
    document.getElementById('question').textContent =
      `✅ Квиз завершён! Правильных: ${correctAnswers}, Ошибок: ${mistakes}`;
    return;
  }

  currentFeature = quizQueue[currentIndex];
  showQuestion(currentFeature);

  if (currentMode === 'quiz') {
    renderQuizLayer();
  } else if (currentMode === 'hardQuiz') {
    allLayer = null; // без отображения
  }
}

function renderQuizLayer() {
  const clickLayer = L.geoJSON(geojsonData, {
    style: {
      color: 'transparent',
      weight: 15,
      opacity: 0
    },
    pointToLayer: function (feature, latlng) {
      return L.circleMarker(latlng, {
        radius: 15,
        color: 'transparent',
        fillOpacity: 0,
        weight: 15,
        interactive: true
      });
    },
    interactive: true,
  });

  const visualLayer = L.geoJSON(geojsonData, {
    style: {
      color: '#999',
      weight: 1,
      fillOpacity: 0.1
    },
    pointToLayer: function (feature, latlng) {
      return L.circleMarker(latlng, {
        radius: 6,
        color: '#999',
        fillColor: '#999',
        fillOpacity: 0.6,
        interactive: false
      });
    },
    interactive: false
  });

  allLayer = L.layerGroup([clickLayer, visualLayer]).addTo(map);
}


function showQuestion(feature) {
  answeredCorrectly = false;
  const questionEl = document.getElementById('question');
  if (currentMode === 'quiz' || currentMode === 'hardQuiz') {
    questionEl.textContent = 'Найди: ' + feature.properties.name;
  } else {
    questionEl.textContent = 'Нажмите на объект, чтобы узнать информацию о нём.';
  }
  document.getElementById('feedback').innerHTML = '';
}

function clearMap() {
  document.getElementById('loading-overlay').style.display = 'none';
  if (allLayer) {
    allLayer.eachLayer(layer => map.removeLayer(layer));
    map.removeLayer(allLayer);
    allLayer = null;
  }
}

function handleFeatureClick(feature, layer) {
  layer.on('click', () => {
    document.getElementById('question').textContent = '';
    const name = feature.properties.name;
    const desc = feature.properties.description || 'Описание отсутствует';
    document.getElementById('feedback').innerHTML = `<h3>${name}</h3><p>${desc}</p>`;

    // выделить в списке
    if (selectedListItem) {
      selectedListItem.classList.remove('selected');
    }
    const div = objectListElements.get(name);
    if (div) {
      div.classList.add('selected');
      selectedListItem = div;
      div.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  });
}

function renderLearnMode() {
  clearMap();
  showQuestion(null);
  nextBtn.style.display = 'none';

  const clickLayer = L.geoJSON(geojsonData, {
    style: {
      color: 'transparent',
      weight: 15,
      opacity: 0
    },
    onEachFeature: handleFeatureClick
  });

  const visualLayer = L.geoJSON(geojsonData, {
    style: {
      color: '#0077cc',
      weight: 1,
      fillOpacity: 0.2
    },
    onEachFeature: (feature, layer) => {
      handleFeatureClick(feature, layer);  // 👈 добавляем сюда тоже
      const popupContent = `<strong>${feature.properties.name}</strong>`;
      layer.bindPopup(popupContent);
    }
  });

  toggleObjectList(true);
  selectedListItem = null;
  renderObjectList(geojsonData.features);

  allLayer = L.layerGroup([clickLayer, visualLayer]).addTo(map);
}

const objectListElements = new Map();

function renderObjectList(features) {
  objectListElements.clear();
  const container = document.getElementById('objectList');
  container.innerHTML = '';
  selectedListItem = null;

  features.forEach((feature, idx) => {
    const name = feature.properties.name || `Без названия ${idx}`;
    const div = document.createElement('div');
    objectListElements.set(name, div);
    div.textContent = name;
    div.className = 'object-item';
    div.style.cursor = feature.geometry ? 'pointer' : 'default';
    div.style.padding = '4px 0';
    div.style.borderBottom = '1px solid #eee';

    // если нет geometry — делаем серым и курсивом
    if (!feature.geometry) {
      div.style.fontStyle = 'italic';
      div.style.color = '#888';
    } else {
      // только если geometry есть — добавляем клик
      div.addEventListener('click', () => {
        if (selectedListItem) {
          selectedListItem.classList.remove('selected');
        }
        selectedListItem = div;
        selectedListItem.classList.add('selected');
        showFeatureOnMap(feature, 'green', true, true);
      });
    }

    container.appendChild(div);
  });
}

function toggleObjectList(visible) {
  const list = document.getElementById('objectList');
  if (list) {
    list.style.display = visible ? 'block' : 'none';
  }
}


function showFeatureOnMap(feature, color, zoom, showDescription) {
  removeHighlightLayers();
  document.getElementById('question').textContent = '';

  const geomType = feature.geometry.type;

  const layer = L.geoJSON(feature, {
    style: {
      color,
      weight: 3,
      fillOpacity: 0.4,
      className: 'highlight-correct'
    },
    pointToLayer: (feature, latlng) =>
      color === 'green'
        ? L.circleMarker(latlng, { radius: 8, color: 'green' })
        : L.circleMarker(latlng, { radius: 8, color: 'red' })
  }).addTo(map);

  if (zoom) {
    try {
      const bounds = layer.getBounds();
      if (bounds.isValid()) map.fitBounds(bounds, { maxZoom: 7 });
    } catch (err) {
      console.warn('[focusFeature] Ошибка при позиционировании:', err);
    }
  }

  // if (geomType === 'Point') {
  //   const coords = feature.geometry.coordinates;
  //   L.circleMarker([coords[1], coords[0]], {
  //     radius: 8,
  //     color: 'green',
  //     fillColor: 'green',
  //     fillOpacity: 0.6,
  //     className: 'highlight-correct'
  //   }).addTo(map);

  //   // Центрируемся на точке
  //   map.setView([coords[1], coords[0]], 6); // масштаб можно подстроить    
  // } else {
  //   layer = L.geoJSON(feature, {
  //     style: {
  //       color: 'green',
  //       weight: 3,
  //       fillOpacity: 0.4,
  //       className: 'highlight-correct'
  //     }
  //   }).addTo(map);

  //   try {
  //     map.fitBounds(layer.getBounds(), { padding: [20, 20] });
  //   } catch (err) {
  //     console.warn("Не удалось позиционироваться на объект:", err);
  //   }    
  // }

  if (showDescription) {
    // Обновим левую панель
    const name = feature.properties.name;
    const desc = feature.properties.description || 'Описание отсутствует';
    document.getElementById('feedback').innerHTML = `<h3>${name}</h3><p>${desc}</p>`;
  }
}

function renderQuizMode() {
  currentMode = 'quiz';
  startQuiz();
}

function renderHardQuizMode() {
  currentMode = 'hardQuiz';
  startQuiz();
}

function removeHighlightLayers() {
  map.eachLayer(layer => {
    if (layer.options && (
        layer.options.color === 'green' ||
        layer.options.className === 'highlight-correct')) {
      map.removeLayer(layer);
    }
  });
}

// Global mode switch
function setMode(mode) {
  removeHighlightLayers();
  currentMode = mode;
  document.getElementById('feedback').innerHTML = '';
  // highlight active button
  learnBtn.classList.toggle('active', mode === 'learn');
  quizBtn.classList.toggle('active', mode === 'quiz');
  hardBtn.classList.toggle('active', mode === 'hardQuiz');

  if (mode === 'learn') {
    renderLearnMode();
  } else if (mode === 'quiz') {
    renderQuizMode();
  } else if (mode === 'hardQuiz') {
    renderHardQuizMode(); // 👈 новая функция
  }

  toggleObjectList(mode === 'learn'); // показываем список только в обучении
}

window.setMode = setMode;

function checkAnswer(e) {
  if (currentMode !== 'quiz' && currentMode !== 'hardQuiz') return;

  if (!currentFeature || !currentFeature.geometry) return;

  const feedbackEl = document.getElementById('feedback');
  let match = false;

  const geom = currentFeature.geometry;
  const pt = map.latLngToLayerPoint(e.latlng);
  const clickPoint = turf.point([e.latlng.lng, e.latlng.lat]);
  const threshold = 15;

  try {
    match = checkGeometry(geom, pt, clickPoint, threshold);
  } catch (err) {
    console.warn('[checkAnswer] Ошибка при анализе геометрии:', err);
  }

  if (match) {
    answeredCorrectly = true;
    correctAnswers++;
    feedbackEl.textContent = '✅ Правильно! ' + currentFeature.properties.name + '\nПереход к следующему вопросу...';
    document.getElementById('loading-overlay').style.display = 'flex';

    showFeatureOnMap(currentFeature, 'green', false);

    document.getElementById('loading-overlay').style.display = 'flex';
    setTimeout(() => {
      currentIndex++;
      renderNextQuizQuestion();
    }, DELAY_MS);

  } else {
    mistakes++;
    attemptCount++;
    removeHighlightLayers();

    if (attemptCount >= 3) {
      feedbackEl.textContent = `❌ Неверно. Правильный ответ: ${currentFeature.properties.name}` + '\nПереход к следующему вопросу...';
      showFeatureOnMap(currentFeature, 'red', true);

      document.getElementById('loading-overlay').style.display = 'flex';
      setTimeout(() => {
        currentIndex++;
        renderNextQuizQuestion();
      }, DELAY_MS);
    } else {
      feedbackEl.textContent = `❌ Неправильно. Осталось попыток: ${3 - attemptCount}`;
    }
  }
}

function checkGeometry(geom, pixelPoint, geoPoint, threshold) {
  if (!geom || !geom.type) return false;

  const type = geom.type;

  if (type === 'GeometryCollection' && Array.isArray(geom.geometries)) {
    for (const g of geom.geometries) {
      if (checkGeometry(g, pixelPoint, geoPoint, threshold)) {
        return true;
      }
    }
    return false;
  }

  if (type === 'Polygon' || type === 'MultiPolygon') {
    return turf.booleanPointInPolygon(geoPoint, geom);
  }

  if (type === 'LineString' || type === 'MultiLineString') {
    const lines = type === 'LineString' ? [geom.coordinates] : geom.coordinates;

    for (const coords of lines) {
      if (!Array.isArray(coords) || coords.length < 2 || !Array.isArray(coords[0])) continue;

      for (let i = 0; i < coords.length - 1; i++) {
        const a = map.latLngToLayerPoint(L.latLng(coords[i][1], coords[i][0]));
        const b = map.latLngToLayerPoint(L.latLng(coords[i + 1][1], coords[i + 1][0]));
        const dist = pointToSegmentDistance(pixelPoint, a, b);
        if (dist < threshold) return true;
      }
    }
    return false;
  }

  if (type === 'Point') {
    const coords = geom.coordinates;
    const markerPt = map.latLngToLayerPoint(L.latLng(coords[1], coords[0]));
    const dist = pixelPoint.distanceTo(markerPt);
    return dist < threshold;
  }

  return false;
}



function pointToSegmentDistance(p, a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;

  if (dx === 0 && dy === 0) {
    return Math.hypot(p.x - a.x, p.y - a.y);
  }

  const t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy);
  const tClamped = Math.max(0, Math.min(1, t));
  const proj = {
    x: a.x + tClamped * dx,
    y: a.y + tClamped * dy
  };

  return Math.hypot(p.x - proj.x, p.y - proj.y);
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

// Next question button
document.getElementById('nextBtn').addEventListener('click', () => {
  removeHighlightLayers();
  if (currentMode === 'quiz') {
    renderQuizMode();
  } else if (currentMode === 'hardQuiz') {
    renderHardQuizMode();
  }
});

// Map click for answer checking
map.on('click', function (e) {
  if (currentMode === 'quiz'|| currentMode === 'hardQuiz' ) {
    checkAnswer(e);  // передаём null как "не попал никуда"
  }
});
