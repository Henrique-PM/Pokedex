document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const pokemonId = urlParams.get('id');
    
    if (pokemonId) {
        loadPokemonDetails(pokemonId);
    }

    // Tab control
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('tab')) {
            const tabId = e.target.getAttribute('data-tab');
            switchTab(tabId);
        }
    });
});

async function loadPokemonDetails(pokemonId) {
    try {
        // Show loading state
        document.getElementById('pokemonDetail').innerHTML = `
            <div class="loading">
                <div class="spinner"></div>
                <p>Loading Pokémon data...</p>
            </div>
        `;

        // Fetch basic pokemon data
        const pokemonResponse = await fetch(`https://pokeapi.co/api/v2/pokemon/${pokemonId}`);
        if (!pokemonResponse.ok) throw new Error('Pokémon not found');
        const pokemon = await pokemonResponse.json();
        
        // Fetch species data for description and evolution chain
        const speciesResponse = await fetch(pokemon.species.url);
        const species = await speciesResponse.json();
        
        // Fetch evolution chain if available
        let evolutionChain = null;
        try {
            const evolutionResponse = await fetch(species.evolution_chain.url);
            evolutionChain = await evolutionResponse.json();
        } catch (e) {
            console.warn('Error loading evolution chain:', e);
        }
        
        // Display all the collected data
        displayPokemonDetails(pokemon, species, evolutionChain);
    } catch (error) {
        console.error('Error loading Pokémon details:', error);
        showErrorMessage();
    }
}

function displayPokemonDetails(pokemon, species, evolutionChain) {
    const types = pokemon.types.map(type => type.type.name);
    const [mainType] = types;
    const abilities = pokemon.abilities.map(a => a.ability.name.replace('-', ' '));
    
    // Format stats data
    const stats = pokemon.stats.map(stat => ({
        name: formatStatName(stat.stat.name),
        value: stat.base_stat
    }));
    
    // Create HTML structure
    const html = `
        <header class="pokemon-header ${mainType}">
            <button class="back-button" onclick="window.history.back()">
                <svg viewBox="0 0 24 24"><path d="M15.41 16.59L10.83 12l4.58-4.59L14 6l-6 6 6 6 1.41-1.41z"/></svg>
            </button>
            <div class="header-content">
                <h1 class="pokemon-name">${capitalizeFirstLetter(pokemon.name)}</h1>
                <span class="pokemon-number">#${String(pokemon.id).padStart(3, '0')}</span>
            </div>
        </header>

        <div class="pokemon-image-container">
            <div class="pokemon-image-wrapper">
                <img src="${getPokemonImage(pokemon)}" 
                     alt="${pokemon.name}" 
                     class="pokemon-image"
                     onerror="this.onerror=null;this.src='https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemon.id}.png'">
            </div>
        </div>

        <nav class="tabs">
            <button class="tab active" data-tab="about">About</button>
            <button class="tab" data-tab="stats">Base Stats</button>
            <button class="tab" data-tab="evolution">Evolution</button>
        </nav>

        <div class="tab-content">
            <div id="about" class="tab-pane active">
                <div class="type-badges">
                    ${types.map(type => `
                        <span class="type-badge ${type}">
                            ${capitalizeFirstLetter(type)}
                        </span>
                    `).join('')}
                </div>
                
                <div class="pokemon-description">
                    <p>${getPokemonDescription(species)}</p>
                </div>

                <div class="pokemon-details">
                    <div class="detail-row">
                        <span class="detail-label">Height</span>
                        <span class="detail-value">${(pokemon.height / 10).toFixed(1)} m</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Weight</span>
                        <span class="detail-value">${(pokemon.weight / 10).toFixed(1)} kg</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Abilities</span>
                        <span class="detail-value">${abilities.map(capitalizeFirstLetter).join(', ')}</span>
                    </div>
                </div>
            </div>

            <div id="stats" class="tab-pane">
                <div class="stats-container">
                    ${stats.map(stat => `
                        <div class="stat-row">
                            <span class="stat-name">${stat.name}</span>
                            <span class="stat-value">${stat.value}</span>
                            <div class="stat-bar">
                                <div class="stat-progress ${getStatClass(stat.value)}" 
                                     style="width: ${(stat.value / 255) * 100}%"></div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>

            <div id="evolution" class="tab-pane">
                ${renderEvolutionChain(parseEvolutionChain(evolutionChain?.chain || []))}
            </div>
        </div>
    `;
    
    document.getElementById('pokemonDetail').innerHTML = html;
    
    // Set CSS variable for primary color based on type
    document.documentElement.style.setProperty('--primary-color', `var(--${mainType})`);
}

// Helper functions
function getPokemonDescription(species) {
    const entry = species.flavor_text_entries?.find(e => e.language.name === 'en');
    return entry ? entry.flavor_text.replace(/[\n\f]/g, ' ') : 'No description available.';
}

function getStatClass(value) {
    if (value >= 100) return 'very-high';
    if (value >= 80) return 'high';
    if (value >= 50) return 'medium';
    return 'low';
}

function parseEvolutionChain(chain) {
    if (!chain) return [];
    
    const evolutions = [];
    let current = chain;
    
    do {
        const id = current.species.url.split('/').slice(-2, -1)[0];
        evolutions.push({
            id: parseInt(id),
            name: current.species.name,
            minLevel: current.evolution_details[0]?.min_level || null,
            trigger: current.evolution_details[0]?.trigger?.name || null
        });
        
        current = current.evolves_to[0];
    } while (current);
    
    return evolutions;
}

function renderEvolutionChain(chain) {
    if (chain.length <= 1) {
        return '<p class="no-evolution">This Pokémon does not evolve.</p>';
    }
    
    return `
        <div class="evolution-chain">
            ${chain.map((pokemon, index) => `
                <div class="evolution-stage">
                    <div class="evolution-image" onclick="window.location.href='pokemon-details.html?id=${pokemon.id}'">
                        <img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/dream-world/${pokemon.id}.svg" 
                             alt="${pokemon.name}"
                             onerror="this.onerror=null;this.src='https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemon.id}.png'">
                    </div>
                    <span class="evolution-name">${capitalizeFirstLetter(pokemon.name)}</span>
                    ${pokemon.minLevel ? `<span class="evolution-level">Lv. ${pokemon.minLevel}</span>` : ''}
                    ${index < chain.length - 1 ? '<div class="evolution-arrow">→</div>' : ''}
                </div>
            `).join('')}
        </div>
    `;
}

function switchTab(tabId) {
    // Remove active class from all tabs and panes
    document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));
    
    // Add active class to selected tab and pane
    document.querySelector(`.tab[data-tab="${tabId}"]`).classList.add('active');
    document.getElementById(tabId).classList.add('active');
}

function formatStatName(name) {
    return name.replace('-', ' ');
}

function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

function getPokemonImage(pokemon) {
    return pokemon.sprites.other['dream_world'].front_default || 
           pokemon.sprites.other.dream_world.front_default || 
           pokemon.sprites.front_default;
}

function showErrorMessage() {
    document.getElementById('pokemonDetail').innerHTML = `
        <div class="error-message">
            <h3>Oops!</h3>
            <p>Failed to load Pokémon details. Please try again later.</p>
            <button class="retry-button" onclick="window.location.reload()">Retry</button>
            <button class="back-button" onclick="window.history.back()">Go Back</button>
        </div>
    `;
}