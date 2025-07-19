const pokemonContainer = document.getElementById('pokemon-container');
const generateBtn      = document.getElementById('generate-btn');
const searchForm       = document.getElementById('search-form');
const searchInput      = document.getElementById('search-input');
const searchError      = document.getElementById('search-error');
const recentSearches   = document.getElementById('recent-searches');
const favoritesBtn     = document.getElementById('favorites-btn');
const favoritesModal   = document.getElementById('favorites-modal');
const closeFavorites   = document.getElementById('close-favorites');
const favoritesList    = document.getElementById('favorites-list');
const noFavorites      = document.getElementById('no-favorites');

// --- Auto-suggest dropdown ---
let allPokemonList = [];
const suggestBox = document.createElement('ul');
suggestBox.id = 'suggest-box';
suggestBox.setAttribute('role', 'listbox');
suggestBox.className =
  'absolute left-0 right-0 top-full mt-1 z-30 bg-white border border-blue-300 rounded-xl shadow-lg max-h-56 overflow-y-auto hidden';
searchInput.parentNode.appendChild(suggestBox);

let activeSuggestIndex = -1;

async function fetchAllPokemonNames() {
  if (allPokemonList.length) return allPokemonList;
  const res = await fetch('https://pokeapi.co/api/v2/pokemon?limit=1025');
  const data = await res.json();
  allPokemonList = data.results.map((p, i) => ({
    name: p.name,
    id: i + 1
  }));
  return allPokemonList;
}

searchInput.addEventListener('input', async () => {
  const query = searchInput.value.trim().toLowerCase();
  if (!query) {
    suggestBox.innerHTML = '';
    suggestBox.classList.add('hidden');
    searchInput.setAttribute('aria-expanded', 'false');
    return;
  }
  const list = await fetchAllPokemonNames();
  const matches = list.filter(p =>
    p.name.startsWith(query) || String(p.id).startsWith(query)
  ).slice(0, 10);

  if (matches.length) {
    suggestBox.innerHTML = matches.map((p, i) =>
      `<li class="suggest-item" tabindex="-1" role="option" aria-selected="false" id="suggest-${i}" data-id="${p.id}" data-name="${p.name}">
        <span class="suggest-id">#${p.id}</span>
        <span class="suggest-name">${capitalize(p.name)}</span>
      </li>`
    ).join('');
    suggestBox.classList.remove('hidden');
    searchInput.setAttribute('aria-expanded', 'true');
    activeSuggestIndex = -1;
  } else {
    suggestBox.innerHTML = '';
    suggestBox.classList.add('hidden');
    searchInput.setAttribute('aria-expanded', 'false');
  }
});

searchInput.addEventListener('keydown', (e) => {
  const items = suggestBox.querySelectorAll('.suggest-item');
  if (suggestBox.classList.contains('hidden') || !items.length) return;

  if (e.key === 'ArrowDown') {
    e.preventDefault();
    activeSuggestIndex = (activeSuggestIndex + 1) % items.length;
    updateSuggestActive(items);
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    activeSuggestIndex = (activeSuggestIndex - 1 + items.length) % items.length;
    updateSuggestActive(items);
  } else if (e.key === 'Enter') {
    if (activeSuggestIndex >= 0 && items[activeSuggestIndex]) {
      e.preventDefault();
      items[activeSuggestIndex].click();
    }
  } else if (e.key === 'Escape') {
    suggestBox.classList.add('hidden');
    searchInput.setAttribute('aria-expanded', 'false');
  }
});

function updateSuggestActive(items) {
  items.forEach((item, i) => {
    if (i === activeSuggestIndex) {
      item.setAttribute('aria-selected', 'true');
      item.classList.add('ring', 'ring-blue-300');
      item.focus();
      searchInput.setAttribute('aria-activedescendant', item.id);
    } else {
      item.setAttribute('aria-selected', 'false');
      item.classList.remove('ring', 'ring-blue-300');
    }
  });
}

suggestBox.addEventListener('mousedown', (e) => {
  const li = e.target.closest('li');
  if (li) {
    searchInput.value = li.dataset.name;
    suggestBox.classList.add('hidden');
    searchInput.setAttribute('aria-expanded', 'false');
    handlePokemon(li.dataset.name);
    addRecentSearch(li.dataset.name, li.dataset.id);
  }
});

document.addEventListener('click', (e) => {
  if (!suggestBox.contains(e.target) && e.target !== searchInput) {
    suggestBox.classList.add('hidden');
    searchInput.setAttribute('aria-expanded', 'false');
  }
});

// --- Type color mapping ---
const typeColors = {
  normal:    'poke-type-normal',
  fire:      'poke-type-fire',
  water:     'poke-type-water',
  electric:  'poke-type-electric',
  grass:     'poke-type-grass',
  ice:       'poke-type-ice',
  fighting:  'poke-type-fighting',
  poison:    'poke-type-poison',
  ground:    'poke-type-ground',
  flying:    'poke-type-flying',
  psychic:   'poke-type-psychic',
  bug:       'poke-type-bug',
  rock:      'poke-type-rock',
  ghost:     'poke-type-ghost',
  dragon:    'poke-type-dragon',
  dark:      'poke-type-dark',
  steel:     'poke-type-steel',
  fairy:     'poke-type-fairy'
};

const typeBadge = (type) =>
  `<span class="poke-type-badge ${typeColors[type] || 'poke-type-normal'}">${type.charAt(0).toUpperCase() + type.slice(1)}</span>`;

const abilityBadge = (ability) =>
  `<span class="poke-ability-badge">${ability}</span>`;

const statBar = ({ name, value }) => {
  const width = Math.min(value, 150) / 1.5;
  return `
    <div class="poke-stat-bar">
      <span class="poke-stat-name">${name.replace('-', ' ').toUpperCase()}</span>
      <div class="poke-stat-bar-bg">
        <div class="poke-stat-bar-fill" style="width:${width}%"></div>
      </div>
      <span class="poke-stat-value">${value}</span>
    </div>
  `;
};

// Caching
const cache = new Map();
async function fetchWithCache(url) {
  if (cache.has(url)) return cache.get(url);
  const res  = await fetch(url);
  if (!res.ok) throw new Error(res.statusText);
  const data = await res.json();
  cache.set(url, data);
  return data;
}

function getGenerationName(url) {
  const id    = url.match(/generation\/(\d+)/)[1];
  const names = {
    '1': 'Generation I',
    '2': 'Generation II',
    '3': 'Generation III',
    '4': 'Generation IV',
    '5': 'Generation V',
    '6': 'Generation VI',
    '7': 'Generation VII',
    '8': 'Generation VIII',
    '9': 'Generation IX'
  };
  return names[id] || 'Unknown';
}

function renderPokemon(pokemon, species) {
    const types       = pokemon.types.map(t => typeBadge(t.type.name)).join('');
    const abilities   = pokemon.abilities
        .map(a => abilityBadge(capitalize(a.ability.name)))
        .join('');
    const statsHtml   = pokemon.stats.map(s => statBar({ name: s.stat.name, value: s.base_stat })).join('');
    const entry       = species.flavor_text_entries.find(e => e.language.name === 'en') || {};
    const description = (entry.flavor_text || '').replace(/\f|\n/g, ' ').trim() || 'No description available.';
    const generation  = getGenerationName(species.generation.url);

    const isFav = isFavorite(pokemon.id);

    pokemonContainer.innerHTML = `
        <div class="pokemon-card">
            <div class="flex items-center justify-between mb-2">
                <h2>
                    <span>${capitalize(pokemon.name)}</span>
                    <span class="poke-id">#${pokemon.id}</span>
                </h2>
                <button id="fav-toggle" aria-label="Favorite" class="text-3xl ${isFav ? 'text-pink-500' : 'text-gray-300'} hover:text-pink-500 transition">
                  &#10084;
                </button>
            </div>
            <div class="poke-imgs">
                <img src="${pokemon.sprites.front_default}"
                         alt="${pokemon.name}"
                         decoding="async" />
                ${pokemon.sprites.front_shiny
                    ? `<img src="${pokemon.sprites.front_shiny}"
                                    alt="Shiny ${pokemon.name}"
                                    decoding="async" />`
                    : ''}
            </div>
            <div class="poke-types">${types}</div>
            <div class="poke-abilities">
                <span class="font-semibold">Abilities:</span> ${abilities}
            </div>
            <div class="mb-2">
                <span class="font-semibold text-blue-700">Height:</span> ${(pokemon.height/10).toFixed(1)} m
                <span class="font-semibold text-blue-700 ml-4">Weight:</span> ${(pokemon.weight/10).toFixed(1)} kg
            </div>
            <div class="mb-2">
                <span class="font-semibold text-blue-700">Generation:</span> ${generation}
            </div>
            <div class="poke-stats">
                <h3 class="font-semibold mb-1 text-blue-700">Base Stats</h3>
                ${statsHtml}
            </div>
            <div class="poke-description">
                <strong>Description:</strong> ${description}
            </div>
        </div>
    `;

    document.getElementById('fav-toggle').onclick = () => {
      toggleFavorite(pokemon.id, pokemon.name);
      renderPokemon(pokemon, species);
    };
}

function showLoading() {
  pokemonContainer.innerHTML = `
    <div class="flex justify-center items-center h-full" role="status">
      <svg class="animate-spin h-10 w-10 text-blue-500" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
      </svg>
      <span class="sr-only">Loading...</span>
    </div>
  `;
}

async function handlePokemon(query) {
  const idOrName = query.trim().toLowerCase();
  if (!idOrName) return;

  showLoading();
  searchError.classList.add('hidden');

  try {
    const poke    = await fetchWithCache(`https://pokeapi.co/api/v2/pokemon/${idOrName}`);
    const species = await fetchWithCache(`https://pokeapi.co/api/v2/pokemon-species/${poke.id}`);
    renderPokemon(poke, species);
    addRecentSearch(poke.name, poke.id);
  } catch {
    pokemonContainer.innerHTML = `
      <div class="text-pink-500 font-bold text-center py-8 text-lg">
        Couldn't find that Pokémon.
      </div>
    `;
    searchError.textContent = 'No Pokémon found with that name or ID.';
    searchError.classList.remove('hidden');
  }
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// --- Recent Searches ---
function getRecentSearches() {
  return JSON.parse(localStorage.getItem('recentSearches') || '[]');
}
function addRecentSearch(name, id) {
  let recent = getRecentSearches();
  recent = recent.filter(p => p.id !== id);
  recent.unshift({ name, id });
  if (recent.length > 5) recent = recent.slice(0, 5);
  localStorage.setItem('recentSearches', JSON.stringify(recent));
  renderRecentSearches();
}
function renderRecentSearches() {
  const recent = getRecentSearches();
  recentSearches.innerHTML = recent.map(p =>
    `<button class="bg-gradient-to-r from-pink-200 via-blue-200 to-purple-200 text-blue-700 px-2 py-1 rounded text-xs font-semibold hover:bg-blue-200 transition"
      data-id="${p.id}" data-name="${p.name}" aria-label="Recent: ${capitalize(p.name)}">
      #${p.id} ${capitalize(p.name)}
    </button>`
  ).join('');
}
recentSearches.addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-id]');
  if (btn) {
    searchInput.value = btn.dataset.name;
    handlePokemon(btn.dataset.name);
  }
});
renderRecentSearches();

// --- Favorites ---
function getFavorites() {
  return JSON.parse(localStorage.getItem('favorites') || '[]');
}
function isFavorite(id) {
  return getFavorites().some(f => f.id == id);
}
function toggleFavorite(id, name) {
  let favs = getFavorites();
  if (isFavorite(id)) {
    favs = favs.filter(f => f.id != id);
  } else {
    favs.push({ id, name });
  }
  localStorage.setItem('favorites', JSON.stringify(favs));
}
function renderFavorites() {
  const favs = getFavorites();
  favoritesList.innerHTML = favs.map(f =>
    `<li>
      <button class="bg-gradient-to-r from-pink-200 via-blue-200 to-purple-200 text-pink-700 px-2 py-1 rounded text-xs font-semibold hover:bg-pink-200 transition"
        data-id="${f.id}" data-name="${f.name}">
        #${f.id} ${capitalize(f.name)}
      </button>
    </li>`
  ).join('');
  noFavorites.classList.toggle('hidden', favs.length > 0);
}
favoritesList.addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-id]');
  if (btn) {
    favoritesModal.classList.add('hidden');
    searchInput.value = btn.dataset.name;
    handlePokemon(btn.dataset.name);
  }
});
favoritesBtn.addEventListener('click', () => {
  renderFavorites();
  favoritesModal.classList.remove('hidden');
});
closeFavorites.addEventListener('click', () => {
  favoritesModal.classList.add('hidden');
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    favoritesModal.classList.add('hidden');
  }
});

// --- Main actions ---
generateBtn.addEventListener('click', () => {
  const randomId = Math.floor(Math.random() * 1025) + 1;
  handlePokemon(String(randomId));
});

searchForm.addEventListener('submit', (e) => {
  e.preventDefault();
  handlePokemon(searchInput.value);
});

// Load a random Pokémon on first load
handlePokemon(String(Math.floor(Math.random() * 1025) + 1));