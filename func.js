// ==========================================
// ACCESSIBILITY — Early Apply (runs before DOM, prevents flash)
// ==========================================
const A11Y_KEY = 'a11y_settings_v1';
const TEXT_STEP = 0.1;
const TEXT_MIN = 0.7;
const TEXT_MAX = 1.8;

function getA11ySettings() {
  try {
    return JSON.parse(localStorage.getItem(A11Y_KEY)) || { scale: 1, flags: {} };
  } catch { return { scale: 1, flags: {} }; }
}
function saveA11ySettings(s) {
  localStorage.setItem(A11Y_KEY, JSON.stringify(s));
}

function applyA11ySettings() {
  const s = getA11ySettings();
  const html = document.documentElement;

  // Apply text scale
  html.style.fontSize = (100 * (s.scale || 1)) + '%';

  // Apply flag-based classes to HTML element for CSS selectors
  html.classList.toggle('grayscale', !!s.flags['grayscale']);
  html.classList.toggle('high-contrast', !!s.flags['high-contrast']);
  html.classList.toggle('negative-contrast', !!s.flags['negative-contrast']);
  html.classList.toggle('underline-links', !!s.flags['underline-links']);
  html.classList.toggle('readable-font', !!s.flags['readable-font']);

  // Also apply to body for backward compatibility
  if (document.body) {
    ['grayscale','high-contrast','negative-contrast','underline-links','readable-font'].forEach(f => {
      document.body.classList.toggle('a11y-' + f, !!s.flags[f]);
    });
  }
}

function syncA11yButtonStates() {
  const s = getA11ySettings();
  document.querySelectorAll('.access-option').forEach(btn => {
    const a = btn.dataset.action;
    if (['grayscale','high-contrast','negative-contrast','underline-links','readable-font'].includes(a)) {
      btn.classList.toggle('active', !!s.flags[a]);
    }
  });
}

function handleA11yAction(action) {
  const s = getA11ySettings();
  s.flags = s.flags || {};
  s.scale = s.scale || 1;
  switch (action) {
    case 'increase-text':
      s.scale = Math.min(TEXT_MAX, +(s.scale + TEXT_STEP).toFixed(2)); break;
    case 'decrease-text':
      s.scale = Math.max(TEXT_MIN, +(s.scale - TEXT_STEP).toFixed(2)); break;
    case 'reset':
      localStorage.removeItem(A11Y_KEY);
      applyA11ySettings();
      return;
    default:
      s.flags[action] = !s.flags[action];
  }
  saveA11ySettings(s);
  applyA11ySettings();
}

// Immediately restore saved accessibility settings on every page load
applyA11ySettings();

// ==========================================
let festivalsData = [];
let currentIndex = 0;

// ==========================================
// NEWS SLIDER AUTO-ROTATE & DOTS SYNC
// ==========================================
const newsSlider = document.getElementById('newsSlider');
const newsDots = document.getElementById('newsDots');
let newsSliderIndex = 0;
let newsAutoPlayInterval = null;

function initNewsSlider() {
  if (!newsSlider) return;

  const slides = newsSlider.querySelectorAll('.news-slide');
  const dots = newsDots.querySelectorAll('.dot');
  const slideCount = slides.length;

  if (slideCount === 0) return;

  // Function to scroll to a specific slide
  function goToSlide(index) {
    newsSliderIndex = index % slideCount;
    const slideWidth = newsSlider.clientWidth;
    newsSlider.scrollLeft = newsSliderIndex * slideWidth;
    updateDots();
  }

  // Update dot active state
  function updateDots() {
    dots.forEach((dot, i) => {
      dot.classList.toggle('active', i === newsSliderIndex);
    });
  }

  // Make dots clickable
  dots.forEach((dot, i) => {
    dot.addEventListener('click', () => {
      goToSlide(i);
      resetAutoPlay();
    });
  });

  // Detect manual scroll and update dots
  let scrollTimeout;
  newsSlider.addEventListener('scroll', () => {
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(() => {
      const slideWidth = newsSlider.clientWidth;
      newsSliderIndex = Math.round(newsSlider.scrollLeft / slideWidth);
      updateDots();
    }, 100);
  });

  // Auto-play: move to next slide every 4 seconds
  function autoPlay() {
    newsAutoPlayInterval = setInterval(() => {
      newsSliderIndex = (newsSliderIndex + 1) % slideCount;
      const slideWidth = newsSlider.clientWidth;
      newsSlider.scrollLeft = newsSliderIndex * slideWidth;
      updateDots();
    }, 4000);
  }

  function resetAutoPlay() {
    clearInterval(newsAutoPlayInterval);
    autoPlay();
  }

  // Pause auto-play on hover
  newsSlider.addEventListener('mouseenter', () => {
    clearInterval(newsAutoPlayInterval);
  });

  newsSlider.addEventListener('mouseleave', () => {
    autoPlay();
  });

  autoPlay();
  updateDots();
}

// Initialize news slider when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initNewsSlider);
} else {
  initNewsSlider();
}


// ==========================================
// CAROUSEL FUNCTIONALITY (home page)
// ==========================================


// DOM Target Layout nodes — only available on home page
const track = document.getElementById('carouselTrack');
const currentNumEl = document.getElementById('currentNum');
const totalNumEl = document.getElementById('totalNum');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');


// Load items asynchronously from JSON
async function fetchFestivals() {
    if (!track) return; // not on home page
    try {
        const response = await fetch('tempat.json');
        if (!response.ok) throw new Error("Network response error status");
        
        festivalsData = await response.json();
        
        if (festivalsData.length > 0) {
            renderCarouselCards();
            updateCarouselView();
        }
    } catch (error) {
        console.error("Failed to load JSON properties:", error);
    }
}

// Generate image cards programmatically inside the row track
function renderCarouselCards() {
    track.innerHTML = '';
    
    festivalsData.forEach((item) => {
        const slide = document.createElement('div');
        slide.classList.add('festival-slide');
        
        slide.innerHTML = `
            <img src="${item.image}" alt="${item.name}" class="slide-img">
            <div class="slide-overlay">
                <span class="slide-category">${item.category} • ${item.state}</span>
                <h3 class="slide-title">${item.name}</h3>
            </div>
        `;
        track.appendChild(slide);
    });

    // Format total length count to double digits (e.g., "09", "10")
    totalNumEl.textContent = String(Math.min(festivalsData.length, 10)).padStart(2, '0');
}


// Handle layout track translations shifts
function updateCarouselView() {
    // Determine target dimensions based on layout width card metrics
    if (festivalsData.length === 0) return;

    const firstCard = document.querySelector('.festival-slide');
    const cardWidth = firstCard ? firstCard.getBoundingClientRect().width : 0;
    const gapWidth = 20; // Matches CSS gap declaration

    // Slide the wrapper container over leftwards
    const shiftAmount = currentIndex * (cardWidth + gapWidth);
    track.style.transform = `translateX(-${shiftAmount}px)`;

    // Sync numeric interface increments (e.g. 01, 02)
    currentNumEl.textContent = String(currentIndex + 1).padStart(2, '0');

    // Toggle button availabilities at boundary loops
    const maxIndex = Math.min(festivalsData.length, 10) - 1;
    prevBtn.disabled = currentIndex === 0;
    nextBtn.disabled = currentIndex === maxIndex;
}

// Event Bindings — only attach if elements exist (home page)
if (prevBtn) {
    prevBtn.addEventListener('click', () => {
        if (currentIndex > 0) {
            currentIndex--;
            updateCarouselView();
        }
    });
}

if (nextBtn) {
    nextBtn.addEventListener('click', () => {
        const maxIndex = Math.min(festivalsData.length, 10) - 1;
        if (currentIndex < maxIndex) {
            currentIndex++;
            updateCarouselView();
        }
    });
}

// Window resize safety handler to recalculate element dimensions dynamically
window.addEventListener('resize', () => { if (track) updateCarouselView(); });

// Boot Application
fetchFestivals();
const url = "destinations.json";




// ==========================================
// WEATHER INTEGRATION — Using destination coordinates from JSON
// ==========================================
const WMO_CODES = {
  0: "Clear sky", 1: "Mainly clear", 2: "Partly cloudy", 3: "Overcast",
  45: "Foggy", 48: "Icy fog",
  51: "Light drizzle", 53: "Drizzle", 55: "Heavy drizzle",
  61: "Light rain", 63: "Rain", 65: "Heavy rain",
  71: "Light snow", 73: "Snow", 75: "Heavy snow",
  80: "Rain showers", 81: "Showers", 82: "Heavy showers",
  95: "Thunderstorm", 96: "Thunderstorm", 99: "Thunderstorm"
};


async function getCurrentWeather(latitude, longitude, cacheId) {
  // Get weather using coordinates from destination JSON
  // Keep it lightweight and never block page JS if weather fails.
  if (!latitude || !longitude) return null;

  const cacheKey = `weather_om_${cacheId}`;
  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < 30 * 60 * 1000) return data;
    }
  } catch (e) {}



  //get API key from OpenWeather
  const WEATHER_API_KEY = '7d558f670b455e4481bc99f539c7e571';

  try {
    // Use coordinates from destination with OpenWeather
    const apiUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${WEATHER_API_KEY}&units=metric`;
    const res = await fetch(apiUrl);
    if (!res.ok) throw new Error('API error');
    const json = await res.json();

    const weather = {
      temp: Math.round(json.main?.temp ?? 0),
      description: json.weather?.[0]?.description
        ? json.weather[0].description
        : 'Unknown',
      // Keep a compatible field name for existing emoji function.
      weathercode: json.weather?.[0]?.id ?? null
    };

    try {
      localStorage.setItem(cacheKey, JSON.stringify({ data: weather, timestamp: Date.now() }));
    } catch (e) {}

    return weather;
  } catch (error) {
    console.error('Weather fetch failed:', error);
    return null;
  }
}


function getWeatherEmoji(code) {
  // OpenWeather API codes
  if (code === 800) return "☀️";           // Clear sky
  if (code === 801 || code === 802) return "⛅";  // Few clouds, scattered clouds
  if (code === 803 || code === 804) return "☁️";  // Broken clouds, overcast
  if (code >= 200 && code <= 232) return "⛈️";   // Thunderstorm
  if (code >= 300 && code <= 321) return "🌧️";   // Drizzle
  if (code >= 500 && code <= 531) return "🌧️";   // Rain
  if (code >= 600 && code <= 622) return "❄️";   // Snow
  if (code >= 700 && code <= 781) return "🌫️";   // Atmosphere/fog
  return "🌤️";
}

function updateWeather(latitude, longitude, cacheId, element) {
  getCurrentWeather(latitude, longitude, cacheId).then(weather => {
    if (weather) {
      element.innerHTML = `
        <div class="weather-current">
          <span class="weather-emoji">${getWeatherEmoji(weather.weathercode)}</span>
          <span class="weather-temp">${weather.temp}°C</span>
          <span class="weather-desc">${weather.description}</span>
        </div>
      `;
    } else {
      element.innerHTML = '<div class="weather-current weather-error">Weather unavailable</div>';
    }
  });
}

// ==========================================
// DESTINATIONS PAGE
// ==========================================
if (document.getElementById("destinations")) {
  fetch(url)
    .then(res => {
      if (!res.ok) throw new Error(`Failed to load destinations.json: HTTP ${res.status}`);
      return res.json();
    })
    .then(data => {
      console.log("Destinations loaded:", data.length, "items");
      // Populate state filter dropdown
      const states = [...new Set(data.map(d => d.state))].sort();
      const stateFilter = document.getElementById("stateFilter");
      states.forEach(state => {
        const opt = document.createElement("option");
        opt.value = state;
        opt.textContent = state;
        stateFilter.appendChild(opt);
      });

      // Read ?state= param from URL and pre-set filter
      const params = new URLSearchParams(window.location.search);
      const preState = params.get("state");
      if (preState) {
        stateFilter.value = preState;
      }

      function applySort(dataset, sortValue) {
        const sorted = [...dataset];
        switch (sortValue) {
          case "name-asc": sorted.sort((a, b) => a.name.localeCompare(b.name)); break;
          case "name-desc": sorted.sort((a, b) => b.name.localeCompare(a.name)); break;
          case "price-asc": sorted.sort((a, b) => a.price - b.price); break;
          case "price-desc": sorted.sort((a, b) => b.price - a.price); break;
        }
        return sorted;
      }

      function applyFilters() {
        const searchTerm = document.getElementById("search").value.toLowerCase();
        const category = document.getElementById("categoryFilter").value;
        const state = document.getElementById("stateFilter").value;
        const price = document.getElementById("priceFilter").value;
        const sortValue = document.getElementById("sortSelect").value;

        let filtered = data.filter(d => {
          const matchesSearch =
            d.name.toLowerCase().includes(searchTerm) ||
            d.state.toLowerCase().includes(searchTerm) ||
            d.category.toLowerCase().includes(searchTerm);
          const matchesCategory = category === "all" || d.category === category;
          const matchesState = state === "all" || d.state === state;
          const matchesPrice =
            price === "all" ||
            (price === "free" && d.price === 0) ||
            (price === "paid" && d.price > 0);
          return matchesSearch && matchesCategory && matchesState && matchesPrice;
        });

        filtered = applySort(filtered, sortValue);
        renderDestinations(filtered);
      }

      function renderDestinations(dataset) {
        if (dataset.length === 0) {
          document.getElementById("destinations").innerHTML =
            '<p class="empty-msg">No destinations match your filters.</p>';
          return;
        }

        let html = '<div class="card-container">';
        dataset.forEach(d => {
          html += `
            <div class="card clickable-card" data-state="${d.state}" data-id="${d.id}" data-latitude="${d.latitude}" data-longitude="${d.longitude}" onclick="viewDetails(${d.id})" style="cursor:pointer;">
              <img src="${d.image}" alt="${d.name}" onerror="this.src='https://via.placeholder.com/800x400?text=${encodeURIComponent(d.name)}'">
              <div class="card-content">
                <span class="state-badge">${d.state}</span>
                <span class="category-badge cat-${d.category.toLowerCase()}">${d.category}</span>
                <div class="weather-placeholder"></div>
                <h3>${d.name}</h3>
                <p>RM ${d.price === 0 ? 'Free' : d.price}</p>
              </div>
            </div>
          `;
        });
        html += '</div>';

        document.getElementById("destinations").innerHTML = html;

        setTimeout(() => {
          document.querySelectorAll('#destinations .weather-placeholder').forEach(placeholder => {
            const card = placeholder.closest('.card');
            const state = card.dataset.state;
            const latitude = card.dataset.latitude;
            const longitude = card.dataset.longitude;
            const destId = card.dataset.id;
            updateWeather(latitude, longitude, destId, placeholder);
          });
        }, 100);
      }

      applyFilters();

      document.getElementById("search").addEventListener("keyup", applyFilters);
      document.getElementById("sortSelect").addEventListener("change", applyFilters);
      document.getElementById("categoryFilter").addEventListener("change", applyFilters);
      document.getElementById("stateFilter").addEventListener("change", applyFilters);
      document.getElementById("priceFilter").addEventListener("change", applyFilters);
      document.getElementById("resetBtn").addEventListener("click", () => {
        document.getElementById("search").value = "";
        document.getElementById("sortSelect").value = "name-asc";
        document.getElementById("categoryFilter").value = "all";
        document.getElementById("stateFilter").value = "all";
        document.getElementById("priceFilter").value = "all";
        // Remove ?state= from URL
        history.replaceState({}, '', 'destinations.html');
        applyFilters();
      });
    })
    .catch(err => {
      console.error("Error loading destinations:", err);
      document.getElementById("destinations").innerHTML = '<p class="empty-msg">Error loading destinations. Please refresh the page.</p>';
    });
}

// ==========================================
// VIEW DETAILS
// ==========================================
function viewDetails(id) {
  localStorage.setItem("selectedId", id);
  window.location = "details.html";
}

// ==========================================
// DETAILS PAGE
// ==========================================
if (document.getElementById("details")) {
  let id = localStorage.getItem("selectedId");
  fetch(url)
    .then(res => res.json())
    .then(data => {
      let item = data.find(d => d.id == id);
      if (!item) {
        document.getElementById("details").innerHTML = `
          <div class="details-content">
            <h2>Destination not found</h2>
            <a href="destinations.html" class="btn-secondary">Back to Destinations</a>
          </div>
        `;
        return;
      }

      // Google Maps embed (no API key needed for embed)
      const mapHtml = (item.latitude && item.longitude) ? `
        <div class="location-map">
          <h3>📍 Location</h3>
          <iframe
            width="100%"
            height="350"
            frameborder="0"
            style="border:0; border-radius: 8px;"
            allowfullscreen
            loading="lazy"
            referrerpolicy="no-referrer-when-downgrade"
            src="https://maps.google.com/maps?q=${item.latitude},${item.longitude}&z=15&output=embed">
          </iframe>
          <a href="https://www.google.com/maps?q=${item.latitude},${item.longitude}" target="_blank" class="map-link">Open in Google Maps ↗</a>
        </div>
      ` : '';

      document.getElementById("details").innerHTML = `
        <img src="${item.image}" alt="${item.name}" onerror="this.src='https://via.placeholder.com/800x400?text=${encodeURIComponent(item.name)}'">
        <div class="details-content">
          <h2>${item.name}</h2>
          <div class="badges">
            <span class="badge-state">${item.state}</span>
            <span class="badge-category cat-${item.category.toLowerCase()}">${item.category}</span>
            <span class="badge-price">${item.price === 0 ? 'Free Entry' : 'RM ' + item.price}</span>
          </div>
          <div class="detail-weather" id="detailWeather">
            <span style="color:#8b7355;font-size:0.85rem;">Loading weather...</span>
          </div>
          <p>${item.description}</p>
          ${mapHtml}
          <div class="btn-group">
            <button class="btn-primary" onclick="addToFavorites()">Add to My Trip</button>
            <a href="destinations.html" class="btn-secondary">Back</a>
          </div>
        </div>
      `;

      localStorage.setItem("currentItem", JSON.stringify(item));

      // Load weather on details page
      updateWeather(item.latitude, item.longitude, item.id, document.getElementById("detailWeather"));
    });
}

// ==========================================
// ADD TO FAVORITES
// ==========================================
function addToFavorites() {
  let item = JSON.parse(localStorage.getItem("currentItem"));
  let fav = JSON.parse(localStorage.getItem("favorites")) || [];
  const exists = fav.some(f => f.id === item.id);
  if (exists) {
    alert("This destination is already in your trip!");
    return;
  }
  fav.push(item);
  localStorage.setItem("favorites", JSON.stringify(fav));
  alert("Added to My Trip!");
}

// ==========================================
// FAVORITES PAGE
// ==========================================
function renderFavorites() {
  const favContainer = document.getElementById("favorites");
  const totalBar = document.getElementById("total");
  if (!favContainer) return;

  let fav = JSON.parse(localStorage.getItem("favorites")) || [];
  let html = "";
  let total = 0;
  if (fav.length === 0) {
    html = '<p class="empty-msg">Your trip is empty. Start adding destinations!</p>';
  } else {
    html = '<div class="card-container">';
    fav.forEach(d => {
      total += d.price;
      html += `
        <div class="card">
          <img src="${d.image}" alt="${d.name}" onerror="this.src='https://via.placeholder.com/800x400?text=${encodeURIComponent(d.name)}'">
          <div class="card-content">
            <span class="state-badge">${d.state}</span>
            <span class="category-badge">${d.category}</span>
            <h3>${d.name}</h3>
            <p>RM ${d.price === 0 ? 'Free' : d.price}</p>
            <button onclick="removeFavorite(${d.id})">Remove</button>
          </div>
        </div>
      `;
    });
    html += '</div>';
  }
  favContainer.innerHTML = html;
  if (totalBar) totalBar.innerText = "Total Budget: RM " + total;
}

if (document.getElementById("favorites")) {
  renderFavorites();
  // Re-render when user navigates back to this page (bfcache)
  window.addEventListener("pageshow", renderFavorites);
}

// ==========================================
// REMOVE FROM FAVORITES
// ==========================================
function removeFavorite(id) {
  let fav = JSON.parse(localStorage.getItem("favorites")) || [];
  fav = fav.filter(d => d.id !== id);
  localStorage.setItem("favorites", JSON.stringify(fav));
  location.reload();
}

// ==========================================
// CLEAR ALL FAVORITES
// ==========================================
function clearAllFavorites() {
  const fav = JSON.parse(localStorage.getItem("favorites")) || [];
  if (fav.length === 0) {
    alert("Your trip is already empty!");
    return;
  }
  if (confirm("Are you sure you want to clear all destinations from your trip?")) {
    localStorage.removeItem("favorites");
    location.reload();
  }
}

// ==========================================
// SITE CHROME — Hamburger + Accessibility (injected on every page)
// ==========================================
(function initSiteChrome() {
  const header = document.querySelector('header');
  if (!header) return;

  // --- Hamburger button (top-left) ---
  if (!header.querySelector('.hamburger-btn')) {
    const hamburger = document.createElement('button');
    hamburger.className = 'hamburger-btn';
    hamburger.setAttribute('aria-label', 'Toggle menu');
    hamburger.innerHTML = '<span></span><span></span><span></span>';
    header.insertBefore(hamburger, header.firstChild);
    hamburger.addEventListener('click', (e) => {
      e.stopPropagation();
      const nav = header.querySelector('nav');
      if (nav) nav.classList.toggle('mobile-open');
      hamburger.classList.toggle('active');
    });
  }

  // --- Accessibility container (right side) ---
  if (!header.querySelector('.accessibility-container')) {
    const container = document.createElement('div');
    container.className = 'accessibility-container';
    container.innerHTML = `
      <button class="accessibility-btn" id="accessibilityBtn" aria-label="Accessibility Tools">
        <svg class="accessibility-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="11" fill="#1e40af" stroke="white" stroke-width="1"/>
          <circle cx="12" cy="6.5" r="1.5" fill="white"/>
          <path d="M 11 9 L 11 14 M 12 9 L 12 14 M 8.5 11 L 15.5 11" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
          <path d="M 9 15 L 11 18 L 11 20 M 15 15 L 13 18 L 13 20" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
      </button>
      <div class="accessibility-dropdown" id="accessibilityDropdown">
        <div class="dropdown-header">Accessibility Tools</div>
        <button class="access-option" data-action="increase-text"><span class="option-icon">🔍</span> Increase Text</button>
        <button class="access-option" data-action="decrease-text"><span class="option-icon">🔎</span> Decrease Text</button>
        <button class="access-option" data-action="grayscale"><span class="option-icon">⊞</span> Grayscale</button>
        <button class="access-option" data-action="high-contrast"><span class="option-icon">◑</span> High Contrast</button>
        <button class="access-option" data-action="negative-contrast"><span class="option-icon">◐</span> Negative Contrast</button>
        <button class="access-option" data-action="underline-links"><span class="option-icon">🔗</span> Links Underline</button>
        <button class="access-option" data-action="readable-font"><span class="option-icon">A</span> Readable Font</button>
        <div class="dropdown-divider"></div>
        <button class="access-option reset-btn" data-action="reset"><span class="option-icon">↻</span> Reset</button>
      </div>
    `;
    header.appendChild(container);
  }

  // --- Set active nav link based on current page ---
  const currentPage = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  header.querySelectorAll('nav a').forEach(a => {
    const href = (a.getAttribute('href') || '').toLowerCase();
    if (href === currentPage || (currentPage === '' && href === 'index.html')) {
      a.classList.add('active');
    } else {
      a.classList.remove('active');
    }
  });

  // --- Accessibility dropdown toggle + actions ---
  const accBtn = header.querySelector('#accessibilityBtn');
  const accDropdown = header.querySelector('#accessibilityDropdown');
  accBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    accDropdown.classList.toggle('active');
  });
  document.addEventListener('click', (e) => {
    if (!accDropdown.contains(e.target) && !accBtn.contains(e.target)) {
      accDropdown.classList.remove('active');
    }
  });

  // Restore saved settings (re-apply now that body exists, to set body classes too)
  applyA11ySettings();

  accDropdown.querySelectorAll('.access-option').forEach(btn => {
    btn.addEventListener('click', () => {
      handleA11yAction(btn.dataset.action);
      syncA11yButtonStates();
    });
  });
  syncA11yButtonStates();
})();

// ==========================================
// ACCESSIBILITY ACTIONS — defined at top of file (search "Early Apply")

// ==========================================
// TOP PICK DESTINATIONS (home page)
// ==========================================
if (document.getElementById('topPicks')) {
  fetch('destinations.json')
    .then(res => res.json())
    .then(data => {
      // Get 6 random destinations
      const shuffled = data.sort(() => Math.random() - 0.5);
      const picks = shuffled.slice(0, 6);
      let html = '<div class="card-container">';
      picks.forEach(d => {
        html += `
          <div class="card clickable-card" onclick="viewDetails(${d.id})" style="cursor:pointer;">
            <img src="${d.image}" alt="${d.name}" onerror="this.src='https://via.placeholder.com/800x400?text=${encodeURIComponent(d.name)}'">
            <div class="card-content">
              <span class="state-badge">${d.state}</span>
              <span class="category-badge cat-${d.category.toLowerCase()}">${d.category}</span>
              <h3>${d.name}</h3>
              <p>RM ${d.price === 0 ? 'Free' : d.price}</p>
            </div>
          </div>
        `;
      });
      html += '</div>';
      document.getElementById('topPicks').innerHTML = html;
    });
}