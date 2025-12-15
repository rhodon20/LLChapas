// --- main.js: Controlador Principal ---
import { Data, INITIAL_TEAMS } from './data.js';
import { Visuals } from './visuals.js';
import { Physics, Vector, MathUtils } from './core.js';
import { Engine } from './engine.js';

// Constantes de juego
const TOTAL_TURNS = 18;
const MINUTES_PER_TURN = 5;

const App = {
    state: {
        phase: 'MENU', // MENU, SELECT, HUB, MATCH
        teams: INITIAL_TEAMS,
        userTeam: null,
        cpuTeam: null,
        match: null, // Estado del partido activo
        career: null, // Estado de la carrera (puntos, partidos jugados)
        leagueStandings: [] 
    },

    init: () => {
        console.log("Iniciando La Liga RPG...");
        App.render();
    },

    render: () => {
        const app = document.getElementById('app');
        if (!app) return;
        
        if (App.state.phase === 'MENU') {
            app.innerHTML = Visuals.renderMenu();
            // Attach Events
            document.getElementById('btn-quick').onclick = () => { App.state.phase = 'SELECT'; App.render(); };
            document.getElementById('btn-career').onclick = () => App.startCareer();
        } 
        else if (App.state.phase === 'SELECT') {
            app.innerHTML = Visuals.renderTeamSelect(App.state.teams);
            // Event delegation for team cards
            document.querySelectorAll('.team-card').forEach(el => {
                el.onclick = () => {
                    const tid = el.dataset.id;
                    const team = App.state.teams.find(t => t.id === tid);
                    // Rival aleatorio distinto al elegido
                    const rival = App.state.teams.find(t => t.id !== tid);
                    App.startMatch(team, rival); 
                };
            });
            document.getElementById('btn-back').onclick = () => { App.state.phase = 'MENU'; App.render(); };
        }
        else if (App.state.phase === 'HUB') {
            app.innerHTML = Visuals.renderHub(App.state.userTeam, App.state.career.played + 1);
            
            document.getElementById('btn-play').onclick = () => {
                // Rival aleatorio
                const possibleRivals = App.state.teams.filter(t => t.id !== App.state.userTeam.id);
                const rival = possibleRivals[MathUtils.randomInt(0, possibleRivals.length - 1)];
                App.startMatch(App.state.userTeam, rival);
            };
            document.getElementById('btn-table').onclick = () => { alert("Tabla (TODO)"); };
        }
        else if (App.state.phase === 'MATCH') {
            app.innerHTML = Visuals.renderMatchUI(App.state.match.home, App.state.match.away);
            Visuals.initEntities(document.getElementById('entities-layer'), App.state.match.home.players, App.state.match.away.players);
            MatchController.start();
        }
    },

    startCareer: () => {
        const myTeam = Data.createTeam('Mi Club', 'MIA', '#00ff00', '#000000', 65);
        App.state.userTeam = myTeam;
        App.state.career = { played: 0, points: 0 };
        App.state.teams = [myTeam, ...INITIAL_TEAMS];
        App.state.phase = 'HUB';
        App.render();
    },

    startMatch: (home, away) => {
        App.state.match = {
            home, away,
            score: { home: 0, away: 0 },
            time: 0,
            turn: 1,
            entities: {},
            phase: 'TURN_START', // TURN_START, AIMING, SIMULATION, CONTACT, GOAL
            activePlayer: null, // ID del jugador seleccionado
            interactingId: null // ID del jugador resolviendo una acción
        };
        
        // Crear entidades físicas para el partido
        const createEnt = (p, x, y, teamId) => ({ 
            id: p.id, 
            teamId: teamId,
            position: {x, y}, 
            velocity: {x:0, y:0}, 
            mass: 10, 
            radius: 2.5, 
            isBall: false,
            stats: p.stats 
        });
        
        // Posiciones iniciales
        home.players.forEach((p, i) => {
            const pos = p.position === 'POR' ? {x:50,y:92} : p.position === 'DEF' ? {x:30+(i*40)%80, y:75} : {x:40+(i*20)%40, y:55};
            App.state.match.entities[p.id] = createEnt(p, pos.x, pos.y, home.id);
        });
        away.players.forEach((p, i) => {
            const pos = p.position === 'POR' ? {x:50,y:8} : p.position === 'DEF' ? {x:30+(i*40)%80, y:25} : {x:40+(i*20)%40, y:45};
            App.state.match.entities[p.id] = createEnt(p, pos.x, pos.y, away.id);
        });
        App.state.match.entities['ball'] = { 
            id: 'ball', 
            position: {x:50, y:50}, 
            velocity: {x:0, y:0}, 
            mass: 2, 
            radius: 1.5, 
            isBall: true 
        };

        App.state.phase = 'MATCH';
        App.render();
    },

    endMatch: () => {
        MatchController.stop();
        if (App.state.career) {
            App.state.career.played++;
            App.state.phase = 'HUB';
        } else {
            App.state.phase = 'MENU';
        }
        App.render();
    }
};

const MatchController = {
    loopId: null,
    dragStart: null,

    start: () => {
        MatchController.setupEvents();
        Visuals.showFeedback("¡COMIENZO!", "info");
        MatchController.loopId = requestAnimationFrame(MatchController.loop);
    },

    stop: () => {
        if(MatchController.loopId) cancelAnimationFrame(MatchController.loopId);
    },

    setupEvents: () => {
        const pitch = document.getElementById('pitch-container');
        if (!pitch) return;
        
        pitch.onpointerdown = (e) => {
            const rect = pitch.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            // Coordenadas relativas 0-100
            const clickPos = { x: (x/rect.width)*100, y: (y/rect.height)*100 };
            let clickedId = null;
            
            // Detectar click en entidades
            Object.values(App.state.match.entities).forEach(ent => {
                if(Vector.dist(ent.position, clickPos) < 4) { // Margen de click
                    clickedId = ent.id;
                }
            });

            const state = App.state.match;
            const userPlayers = state.home.players;

            // Lógica de selección según fase
            if (state.phase === 'TURN_START') {
                const isMine = userPlayers.some(p => p.id === clickedId);
                if (isMine && clickedId !== 'ball') {
                    state.activePlayer = clickedId;
                    MatchController.dragStart = { x, y }; // Iniciar arrastre visual
                    Visuals.updatePositions(state.entities, state.activePlayer);
                }
            } else if (['AIMING_PASS', 'AIMING_SHOOT'].includes(state.phase)) {
                MatchController.dragStart = { x, y };
            } else if (state.phase === 'AIMING_DRIBBLE') {
                MatchController.dragStart = { x, y };
            }
        };

        pitch.onpointermove = (e) => {
            if (!MatchController.dragStart) return;
            const arrow = document.getElementById('arrow-line');
            const svg = document.getElementById('drag-arrow');
            if(!arrow || !svg) return;
            
            const rect = pitch.getBoundingClientRect();
            const currentX = e.clientX - rect.left;
            const currentY = e.clientY - rect.top;

            svg.classList.remove('hidden');
            arrow.setAttribute('x1', MatchController.dragStart.x);
            arrow.setAttribute('y1', MatchController.dragStart.y);
            arrow.setAttribute('x2', currentX);
            arrow.setAttribute('y2', currentY);
        };

        pitch.onpointerup = (e) => {
            if (!MatchController.dragStart) return;
            const dragArrow = document.getElementById('drag-arrow');
            if(dragArrow) dragArrow.classList.add('hidden');
            
            const rect = pitch.getBoundingClientRect();
            const endX = e.clientX - rect.left;
            const endY = e.clientY - rect.top;
            
            const vec = { 
                x: (MatchController.dragStart.x - endX) / (rect.width/6), 
                y: (MatchController.dragStart.y - endY) / (rect.height/8)
            };

            if (Math.abs(vec.x) > 0.05 || Math.abs(vec.y) > 0.05) {
                MatchController.handleInput(vec);
            }
            
            MatchController.dragStart = null;
        };
    },

    handleInput: (vec) => {
        const state = App.state.match;
        const ents = state.entities;

        if (state.phase === 'TURN_START' && state.activePlayer) {
            ents[state.activePlayer].velocity = Vector.mult(vec, 2.0);
            
            // IA Simplificada: Mover un rival hacia la pelota
            const ball = ents['ball'];
            const cpuTeam = App.state.match.away;
            let bestCpuId = cpuTeam.players[0].id;
            let minDist = 999;
            
            cpuTeam.players.forEach(p => {
                const d = Vector.dist(ents[p.id].position, ball.position);
                if(d < minDist) { minDist = d; bestCpuId = p.id; }
            });
            
            const cpuEnt = ents[bestCpuId];
            const dir = Vector.normalize(Vector.sub(ball.position, cpuEnt.position));
            cpuEnt.velocity = Vector.mult(dir, 1.8); 

            state.phase = 'SIMULATION';
            state.activePlayer = null;
        } 
        else if (['AIMING_PASS','AIMING_SHOOT'].includes(state.phase)) {
            ents['ball'].velocity = Vector.mult(vec, 3.5);
            state.phase = 'SIMULATION';
            state.interactingId = null;
            Visuals.toggleActionMenu(false);
        }
        else if (state.phase === 'AIMING_DRIBBLE' && state.interactingId) {
            const p = ents[state.interactingId];
            const v = Vector.mult(vec, 2.0);
            p.velocity = v;
            ents['ball'].velocity = v;
            state.phase = 'SIMULATION';
            state.interactingId = null;
            Visuals.toggleActionMenu(false);
        }
    },

    handleAction: (type) => {
        const state = App.state.match;
        
        if (type === 'PASS') {
            Visuals.showFeedback("¡PASE! Apunta...", "info");
            state.phase = 'AIMING_PASS';
        } else if (type === 'SHOOT') {
            Visuals.showFeedback("¡TIRO! ¡Revienta!", "info");
            state.phase = 'AIMING_SHOOT';
        } else if (type === 'DRIBBLE') {
            Visuals.showFeedback("¡REGATE! Escápate...", "info");
            state.phase = 'AIMING_DRIBBLE';
        }
        
        Visuals.toggleActionMenu(false);
    },

    loop: () => {
        const state = App.state.match;
        if (!state) return;

        // UI Updates
        document.getElementById('score-display').innerText = `${state.score.home} - ${state.score.away}`;
        document.getElementById('time-display').innerText = `${state.time}'`;

        if (state.phase === 'SIMULATION') {
            let moving = false;
            const ents = Object.values(state.entities);

            // 1. Movimiento y Física
            ents.forEach(e => {
                if (Math.abs(e.velocity.x) > 0.01 || Math.abs(e.velocity.y) > 0.01) {
                    moving = true;
                    e.position = Vector.add(e.position, e.velocity);
                    e.velocity = Physics.applyFriction(e.velocity);
                    const bounced = Physics.checkWallCollision(e);
                    if (bounced.x !== e.velocity.x || bounced.y !== e.velocity.y) e.velocity = bounced;
                } else {
                    e.velocity = {x:0, y:0};
                }
            });

            // 2. Colisiones
            for(let i=0; i<ents.length; i++){
                for(let j=i+1; j<ents.length; j++){
                    if(Physics.checkCollision(ents[i], ents[j])) {
                        Physics.resolveCollision(ents[i], ents[j]);
                        
                        // Lógica de Evento con Pelota
                        if (ents[i].isBall || ents[j].isBall) {
                            const player = ents[i].isBall ? ents[j] : ents[i];
                            const isUser = App.state.userTeam.players.some(p => p.id === player.id);
                            
                            if (Math.abs(player.velocity.x) > 0.05 || Math.abs(ents['ball'].velocity.x) > 0.05) {
                                if (state.activePlayer !== 'BUSY') {
                                    if (isUser) {
                                        state.phase = 'DECISION';
                                        state.interactingId = player.id;
                                        ents.forEach(e => e.velocity = {x:0, y:0}); // Stop
                                        Visuals.toggleActionMenu(true, [
                                            {label: 'PASE', type:'PASS', color:'bg-blue-600'},
                                            {label: 'TIRO', type:'SHOOT', color:'bg-red-600'},
                                            {label: 'REGATE', type:'DRIBBLE', color:'bg-green-600'}
                                        ], MatchController.handleAction);
                                        return; 
                                    } else {
                                        // IA Simple
                                        state.interactingId = player.id;
                                        if (player.position.y > 70) {
                                             Visuals.showFeedback("CPU Tira", "miss");
                                             state.phase = 'AIMING_SHOOT';
                                             ents['ball'].velocity = {x: (Math.random()-0.5)*2, y: 3}; 
                                             state.phase = 'SIMULATION';
                                        } else {
                                             Visuals.showFeedback("CPU Pasa", "info");
                                             ents['ball'].velocity = {x: (Math.random()-0.5)*4, y: 3};
                                             state.phase = 'SIMULATION';
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }

            // 3. Goles
            const ball = ents.find(e => e.id === 'ball');
            // Portería CPU (Arriba)
            if (ball.position.y < 2 && ball.position.x > 35 && ball.position.x < 65) {
                state.score.home++;
                Visuals.showFeedback("¡GOLAZO!", "goal");
                MatchController.resetPositions();
                return;
            }
            // Portería Usuario (Abajo)
            if (ball.position.y > 98 && ball.position.x > 35 && ball.position.x < 65) {
                state.score.away++;
                Visuals.showFeedback("GOL RIVAL...", "miss");
                MatchController.resetPositions();
                return;
            }

            // 4. Fin de turno
            if (!moving) {
                state.turn++;
                state.time += MINUTES_PER_TURN;
                if (state.turn > TOTAL_TURNS) {
                    Visuals.showFeedback("FIN DEL PARTIDO", "info");
                    setTimeout(App.endMatch, 2000);
                    return;
                }
                state.phase = 'TURN_START';
                Visuals.showFeedback(`Turno ${state.turn}`, "info");
            }
        }

        Visuals.updatePositions(state.entities, state.activePlayer);
        MatchController.loopId = requestAnimationFrame(MatchController.loop);
    },

    resetPositions: () => {
        const state = App.state.match;
        state.phase = 'GOAL';
        setTimeout(() => {
            const ents = state.entities;
            Object.values(ents).forEach(e => {
                e.velocity = {x:0, y:0};
                if(e.id === 'ball') { e.position = {x:50,y:50}; return; }
                
                if(e.teamId === state.home.id) {
                    e.position.y = (e.stats.PAR ? 92 : 55 + Math.random()*20);
                    e.position.x = 20 + Math.random()*60;
                } else {
                    e.position.y = (e.stats.PAR ? 8 : 45 - Math.random()*20);
                    e.position.x = 20 + Math.random()*60;
                }
            });
            state.phase = 'TURN_START';
        }, 2000);
    }
};

window.onload = App.init;