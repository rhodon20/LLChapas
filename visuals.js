// --- visuals.js: Generadores de HTML y Actualización del DOM ---

// Función auxiliar para renderizar cartas
const renderCard = (p, size='md') => {
    const sz = size==='sm'?'w-16 h-24 text-[8px]':size==='md'?'w-24 h-36 text-[10px]':'w-48 h-72 text-sm';
    const bg = p.rating>=85?'bg-yellow-500':p.rating>=75?'bg-gray-300':'bg-orange-700';
    return `
    <div class="relative ${sz} ${bg} rounded shadow border border-yellow-200 overflow-hidden select-none flex-shrink-0 team-card-visual" data-id="${p.id}">
         <div class="absolute inset-0 card-shine"></div>
         <div class="relative z-10 flex flex-col h-full p-1 text-black font-bold">
            <div class="flex justify-between leading-none">
                <span class="text-lg">${p.rating}</span>
                <span class="opacity-70">${p.position}</span>
            </div>
            <div class="flex-1 flex justify-center items-center my-1">
                <img src="${p.imageUrl}" class="w-full h-full object-cover rounded-full border border-white/50">
            </div>
            <div class="text-center truncate uppercase text-[0.8em] border-t border-black/10 pt-0.5">${p.name}</div>
         </div>
    </div>`;
};

export const Visuals = {
    // --- HTML GENERATORS ---
    
    renderMenu: () => `
        <div class="flex flex-col items-center justify-center h-screen bg-gradient-to-br from-gray-900 to-black text-white p-4">
            <h1 class="text-6xl font-black font-sport text-yellow-500 mb-2 tracking-tighter text-center">LIGA RPG CHAPAS</h1>
            <p class="mb-8 text-gray-400">Edición Modular</p>
            <button id="btn-quick" class="bg-white text-black font-bold py-4 px-8 rounded-xl mb-4 hover:scale-105 transition-transform w-64 shadow-lg">PARTIDO RÁPIDO</button>
            <button id="btn-career" class="bg-gray-800 border border-gray-600 font-bold py-4 px-8 rounded-xl hover:scale-105 transition-transform w-64 shadow-lg">MODO CARRERA</button>
        </div>
    `,

    renderTeamSelect: (teams) => `
        <div class="h-screen bg-gray-900 p-4 overflow-y-auto">
            <h2 class="text-center text-3xl text-yellow-500 mb-6 font-sport">SELECCIONA EQUIPO</h2>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4 pb-20">
                ${teams.map(t => `
                    <div data-id="${t.id}" class="team-card bg-gray-800 p-4 rounded-xl text-white text-center cursor-pointer border-2 border-transparent hover:border-yellow-500 transition-all active:scale-95 shadow-lg">
                        <div class="w-12 h-12 rounded-full mx-auto mb-2 shadow-md border-2 border-white/20" style="background-color: ${t.primaryColor}"></div>
                        <div class="font-bold font-sport text-lg tracking-wide">${t.name}</div>
                        <div class="text-xs text-gray-400 mt-1">AVG: ${Math.floor(t.players.reduce((a,b)=>a+b.rating,0)/t.players.length)}</div>
                    </div>
                `).join('')}
            </div>
            <button id="btn-back" class="fixed bottom-4 left-4 right-4 md:w-auto md:left-4 md:right-auto bg-red-600 hover:bg-red-500 text-white py-3 px-8 rounded-full font-bold shadow-lg z-50">VOLVER</button>
        </div>
    `,

    renderHub: (team, nextMatchNum) => `
        <div class="flex flex-col h-screen bg-slate-900 text-white p-4">
            <div class="flex justify-between items-center mb-6">
                <div>
                    <h1 class="text-3xl font-sport text-yellow-400 leading-none">${team.name}</h1>
                    <span class="text-xs text-gray-400">JORNADA ${nextMatchNum}</span>
                </div>
                <button id="btn-table" class="bg-gray-800 text-white border border-gray-600 px-4 py-2 rounded text-xs hover:bg-gray-700">CLASIFICACIÓN</button>
            </div>
            
            <div class="flex-1 overflow-y-auto mb-4 bg-black/20 rounded-xl p-4 border border-white/5">
                 <h3 class="text-gray-400 mb-3 text-sm font-bold uppercase tracking-wider">Plantilla Titular</h3>
                 <div class="flex flex-wrap gap-3 justify-center">
                    ${team.players.map(p => renderCard(p, 'sm')).join('')}
                 </div>
            </div>

            <button id="btn-play" class="bg-gradient-to-r from-green-600 to-green-500 py-6 rounded-xl font-black text-2xl w-full shadow-lg active:scale-95 border-b-4 border-green-800 uppercase tracking-widest text-shadow">
                Jugar Partido
            </button>
        </div>
    `,

    renderMatchUI: (home, away) => `
        <div id="match-ui" class="absolute inset-0 pointer-events-none z-40 font-sans">
            <!-- Scoreboard -->
            <div class="absolute top-4 left-4 bg-black/90 text-white px-4 py-2 rounded-lg shadow-xl flex items-center gap-3 border border-white/10">
                <div class="font-bold text-lg font-sport text-gray-300 w-8 text-center">${home.shortName}</div>
                <div id="score-display" class="bg-yellow-600 text-black px-3 py-1 rounded text-2xl font-black font-sport min-w-[3rem] text-center">0 - 0</div>
                <div class="font-bold text-lg font-sport text-gray-300 w-8 text-center">${away.shortName}</div>
                <div class="w-px h-8 bg-gray-600 mx-2"></div>
                <div id="time-display" class="text-lg font-mono text-yellow-400">0'</div>
            </div>
            
            <!-- Feedback Overlay -->
            <div id="feedback" class="hidden absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-50 transition-opacity duration-200">
                <h1 id="feedback-text" class="text-6xl md:text-8xl font-black font-sport text-white animate-shake rotate-2 drop-shadow-[0_4px_0_#000]">GOL</h1>
            </div>
            
            <!-- Action Menu -->
            <div id="action-menu" class="hidden absolute bottom-8 left-0 right-0 px-4 pointer-events-auto z-50 flex justify-center">
                <div class="bg-black/90 p-4 rounded-2xl border border-white/20 shadow-2xl w-full max-w-md backdrop-blur-md">
                    <h3 class="text-yellow-400 mb-3 font-bold text-center uppercase tracking-widest text-sm" id="action-title">ELIGE TU JUGADA</h3>
                    <div class="flex gap-3 w-full" id="action-buttons"></div>
                </div>
            </div>
        </div>
        
        <!-- Pitch Container -->
        <div id="pitch-container" class="w-full h-full bg-[#2d6934] relative overflow-hidden perspective-field touch-none pointer-events-auto shadow-inner">
            <!-- Grass Texture -->
            <div class="absolute inset-0 opacity-10 pointer-events-none mix-blend-overlay" 
                 style="background-image: url('https://www.transparenttextures.com/patterns/grass.png'), repeating-linear-gradient(0deg, transparent, transparent 10%, #000 10%, #000 20%)">
            </div>
            
            <!-- Field Lines -->
            <div class="absolute inset-4 border-2 border-white/60 rounded-lg pointer-events-none"></div>
            <div class="absolute top-1/2 left-4 right-4 h-0.5 bg-white/60 transform -translate-y-1/2 pointer-events-none"></div>
            <div class="absolute top-1/2 left-1/2 w-32 h-32 border-2 border-white/60 rounded-full transform -translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>
            
            <!-- Goals -->
            <div class="absolute top-0 left-1/2 transform -translate-x-1/2 w-[30%] h-4 bg-white/10 border-x-2 border-b-2 border-white/60 pointer-events-none rounded-b-md backdrop-blur-sm"></div>
            <div class="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-[30%] h-4 bg-white/10 border-x-2 border-t-2 border-white/60 pointer-events-none rounded-t-md backdrop-blur-sm"></div>
            
            <!-- Entities Layer -->
            <div id="entities-layer" class="absolute inset-0"></div>
            
            <!-- Drag Arrow UI -->
            <svg id="drag-arrow" class="absolute inset-0 pointer-events-none hidden z-30 filter drop-shadow-md">
                <defs>
                    <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                        <polygon points="0 0, 10 3.5, 0 7" fill="#fbbf24" />
                    </marker>
                </defs>
                <line id="arrow-line" x1="0" y1="0" x2="0" y2="0" stroke="#fbbf24" stroke-width="4" stroke-linecap="round" stroke-dasharray="8,4" marker-end="url(#arrowhead)" />
            </svg>
        </div>
    `,

    // Exponer renderCard para uso interno
    renderCard,

    // --- DOM UPDATES ---
    
    initEntities: (container, playersHome, playersAway) => {
        container.innerHTML = '';
        
        const createToken = (p, isHome) => {
            const el = document.createElement('div');
            el.className = 'absolute w-10 h-10 md:w-12 md:h-12 rounded-full border-2 shadow-lg bg-gray-800 overflow-hidden transform -translate-x-1/2 -translate-y-1/2 flex items-center justify-center transition-transform will-change-transform z-10';
            el.style.borderColor = isHome ? '#60a5fa' : '#ef4444'; // blue-400 : red-500
            el.style.boxShadow = `0 4px 6px -1px rgba(0, 0, 0, 0.5), 0 0 0 2px ${isHome ? 'rgba(59, 130, 246, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`;
            
            el.id = `ent-${p.id}`;
            el.dataset.id = p.id;
            
            // Imagen del jugador
            el.innerHTML = `
                <img src="${p.imageUrl}" class="w-full h-full object-cover pointer-events-none select-none">
                <div class="name-tag hidden absolute -bottom-6 left-1/2 transform -translate-x-1/2 bg-black/90 text-white text-[9px] px-2 py-0.5 rounded-full whitespace-nowrap pointer-events-none border border-white/20 z-50">${p.name}</div>
            `;
            return el;
        };

        playersHome.forEach(p => container.appendChild(createToken(p, true)));
        playersAway.forEach(p => container.appendChild(createToken(p, false)));

        // Pelota
        const ball = document.createElement('div');
        ball.id = 'ent-ball';
        ball.className = 'absolute w-4 h-4 md:w-5 md:h-5 bg-white rounded-full border border-gray-300 shadow-xl transform -translate-x-1/2 -translate-y-1/2 z-20 flex items-center justify-center';
        ball.innerHTML = '<div class="w-full h-full rounded-full bg-[radial-gradient(circle_at_30%_30%,#fff_10%,#ddd_60%,#333_100%)]"></div>';
        container.appendChild(ball);
    },

    updatePositions: (entities, activeId) => {
        for (const key in entities) {
            const ent = entities[key];
            const el = document.getElementById(`ent-${ent.id}`);
            if (el) {
                // Actualizar posición con CSS (Mejor rendimiento que innerHTML)
                el.style.left = `${ent.position.x}%`;
                el.style.top = `${ent.position.y}%`;
                
                // Efectos visuales para jugador activo
                if (ent.id === activeId) {
                    el.style.borderColor = '#facc15'; // Amarillo intenso
                    el.style.zIndex = '30';
                    el.style.transform = 'translate(-50%, -50%) scale(1.15)';
                    el.style.boxShadow = '0 0 15px rgba(250, 204, 21, 0.6)';
                    el.querySelector('.name-tag')?.classList.remove('hidden');
                } else if (key !== 'ball') {
                    // Resetear estilos
                    el.style.zIndex = '10';
                    el.style.transform = 'translate(-50%, -50%) scale(1.0)';
                    el.style.boxShadow = ''; 
                    // Nota: Aquí se pierde el color original al resetear, en una versión pro usaríamos clases CSS toggleables.
                    el.style.borderColor = ''; 
                    el.querySelector('.name-tag')?.classList.add('hidden');
                }
            }
        }
    },

    showFeedback: (msg, type) => {
        const fb = document.getElementById('feedback');
        const txt = document.getElementById('feedback-text');
        if(!fb || !txt) return;

        txt.innerText = msg;
        // Colores dinámicos
        const colors = type === 'goal' ? 'text-yellow-400 drop-shadow-[0_0_10px_rgba(250,204,21,0.8)]' : 
                       type === 'miss' ? 'text-red-500 drop-shadow-[0_0_10px_rgba(239,68,68,0.8)]' : 
                       'text-white';
                       
        txt.className = `text-5xl md:text-8xl font-black font-sport animate-shake rotate-2 ${colors}`;
        
        fb.classList.remove('hidden');
        
        // Ocultar automáticamente
        if(window.feedbackTimeout) clearTimeout(window.feedbackTimeout);
        window.feedbackTimeout = setTimeout(() => {
            fb.classList.add('hidden');
        }, 1500);
    },

    toggleActionMenu: (show, actions, onSelect) => {
        const menu = document.getElementById('action-menu');
        const container = document.getElementById('action-buttons');
        if(!menu || !container) return;

        if(!show) {
            menu.classList.add('hidden');
            return;
        }

        container.innerHTML = '';
        actions.forEach(act => {
            const btn = document.createElement('button');
            btn.className = `${act.color} flex-1 text-white font-bold py-4 rounded-xl text-sm shadow-lg hover:brightness-110 active:scale-95 transition-all border-b-4 border-black/20 flex flex-col items-center justify-center gap-1`;
            
            const icon = act.type === 'SHOOT' ? '⚽' : act.type === 'PASS' ? '👟' : '⚡';
            
            btn.innerHTML = `<span class="text-2xl">${icon}</span><span>${act.label}</span>`;
            btn.onclick = () => onSelect(act.type);
            container.appendChild(btn);
        });
        menu.classList.remove('hidden');
    }
};