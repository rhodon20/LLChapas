import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GamePhase, Team, MatchState, Vector2, ActionType, Player, PhysicsEntity, LeagueRow } from './types';
import { INITIAL_TEAMS, createTeam, TOTAL_TURNS, MINUTES_PER_TURN, generateRandomPlayer, generatePackPlayer } from './constants';
import { applyFriction, checkWallCollision, checkEntityCollision, resolveElasticCollision } from './utils/physics';
import Pitch from './components/Pitch';
import { ScoreBoard, ActionMenu, FeedbackOverlay } from './components/GameUI';
import PlayerCard from './components/PlayerCard';
import LeagueTable from './components/LeagueTable';
import { calculateSuccessChance, resolveAction } from './engine/core';
import { randomInt, getDistance } from './utils/math';

const App: React.FC = () => {
  // --- Global State ---
  const [phase, setPhase] = useState<GamePhase>('MENU');
  const [userTeam, setUserTeam] = useState<Team | null>(null);
  const [cpuTeam, setCpuTeam] = useState<Team | null>(null);
  
  // --- League State ---
  const [leagueStandings, setLeagueStandings] = useState<LeagueRow[]>([]);
  const GAMES_PER_SEASON = 10; // Reducido para testing, era 38

  // --- Match State ---
  const [matchState, setMatchState] = useState<MatchState | null>(null);
  const [feedback, setFeedback] = useState<{ msg: string, type: 'goal' | 'miss' | 'info' } | null>(null);
  
  // Physics & Loop Refs
  const requestRef = useRef<number>(0);
  const physicsStateRef = useRef<Record<string, PhysicsEntity>>({});
  const lastTimeRef = useRef<number>(0);
  
  // --- Career State ---
  const [careerTeam, setCareerTeam] = useState<Team | null>(null);
  const [packPlayers, setPackPlayers] = useState<Player[]>([]);
  const [selectedPackCandidate, setSelectedPackCandidate] = useState<Player | null>(null); // Jugador del sobre elegido
  const [showSeasonReward, setShowSeasonReward] = useState<boolean>(false);

  // --- Helper Functions ---
  const showFeedback = (msg: string, type: 'goal' | 'miss' | 'info', duration = 2000) => {
    setFeedback({ msg, type });
    setTimeout(() => setFeedback(null), duration);
  };

  // --- LEAGUE LOGIC ---
  const initLeague = (userTeam: Team) => {
    const teams = [userTeam, ...INITIAL_TEAMS];
    const rows: LeagueRow[] = teams.map(t => ({
        teamId: t.id,
        teamName: t.name,
        played: 0,
        won: 0,
        drawn: 0,
        lost: 0,
        gf: 0,
        ga: 0,
        points: 0
    }));
    setLeagueStandings(rows);
  };

  const simulateLeagueRound = (userHomeId: string, userAwayId: string) => {
      // 1. Update User Match
      // (This is done in updateLeague normally, but we need to run simulations for others)
      
      // 2. Simulate other matches
      setLeagueStandings(prev => {
          const newStandings = [...prev];
          const cpuTeams = newStandings.filter(t => t.teamId !== userHomeId && t.teamId !== userAwayId);
          
          // Pair them up randomly
          const shuffled = cpuTeams.sort(() => 0.5 - Math.random());
          for (let i = 0; i < shuffled.length; i += 2) {
              if (i + 1 >= shuffled.length) break;
              
              const t1 = shuffled[i];
              const t2 = shuffled[i+1];
              
              // Simulate score based on slight randomness
              const score1 = randomInt(0, 3);
              const score2 = randomInt(0, 3);

              // Update Team 1
              t1.played++;
              t1.gf += score1;
              t1.ga += score2;
              if (score1 > score2) { t1.won++; t1.points += 3; }
              else if (score1 === score2) { t1.drawn++; t1.points += 1; }
              else { t1.lost++; }

              // Update Team 2
              t2.played++;
              t2.gf += score2;
              t2.ga += score1;
              if (score2 > score1) { t2.won++; t2.points += 3; }
              else if (score2 === score1) { t2.drawn++; t2.points += 1; }
              else { t2.lost++; }
          }
          return newStandings;
      });
  };

  const updateLeague = (homeId: string, awayId: string, homeScore: number, awayScore: number) => {
      // First update user result
      setLeagueStandings(prev => prev.map(row => {
          if (row.teamId !== homeId && row.teamId !== awayId) return row;
          
          const isHome = row.teamId === homeId;
          const gf = isHome ? homeScore : awayScore;
          const ga = isHome ? awayScore : homeScore;
          
          let points = 0;
          if (gf > ga) points = 3;
          else if (gf === ga) points = 1;

          return {
              ...row,
              played: row.played + 1,
              gf: row.gf + gf,
              ga: row.ga + ga,
              points: row.points + points,
              won: gf > ga ? row.won + 1 : row.won,
              drawn: gf === ga ? row.drawn + 1 : row.drawn,
              lost: gf < ga ? row.lost + 1 : row.lost,
          };
      }));

      // Then simulate others
      simulateLeagueRound(homeId, awayId);
  };

  const checkSeasonEnd = () => {
      const userStats = leagueStandings.find(l => l.teamId === careerTeam?.id);
      if (userStats && userStats.played >= GAMES_PER_SEASON) {
          // Season End
          const sorted = [...leagueStandings].sort((a,b) => b.points - a.points);
          const position = sorted.findIndex(l => l.teamId === careerTeam?.id) + 1;
          
          if (position <= 3) {
              // Reward
              setShowSeasonReward(true);
          } else {
              setPhase('LEAGUE_TABLE'); // Just show table if failed
          }
          return true;
      }
      return false;
  };

  // --- MATCH INIT ---
  const initMatch = (home: Team, away: Team) => {
    // Entities Init
    const entities: Record<string, PhysicsEntity> = {};
    
    home.players.forEach((p, i) => {
       entities[p.id] = {
           id: p.id,
           position: { 
               x: p.position === 'POR' ? 50 : p.position === 'DEF' ? 30 + (i*40)%80 : 40 + (i*20)%40,
               y: p.position === 'POR' ? 92 : p.position === 'DEF' ? 75 : 55
           },
           velocity: { x: 0, y: 0 },
           mass: 10,
           radius: 2.5,
           isBall: false
       };
    });

    away.players.forEach((p, i) => {
        entities[p.id] = {
            id: p.id,
            position: { 
                x: p.position === 'POR' ? 50 : p.position === 'DEF' ? 30 + (i*40)%80 : 40 + (i*20)%40,
                y: p.position === 'POR' ? 8 : p.position === 'DEF' ? 25 : 45
            },
            velocity: { x: 0, y: 0 },
            mass: 10,
            radius: 2.5,
            isBall: false
        };
    });

    entities['ball'] = {
        id: 'ball',
        position: { x: 50, y: 50 },
        velocity: { x: 0, y: 0 },
        mass: 2,
        radius: 1.5,
        isBall: true
    };

    physicsStateRef.current = JSON.parse(JSON.stringify(entities));

    setMatchState({
      homeTeam: home,
      awayTeam: away,
      score: { home: 0, away: 0 },
      time: 0,
      turn: 1,
      possession: 'NEUTRAL',
      physicsEntities: entities,
      activePlayerId: null,
      interactingPlayerId: null,
      phase: 'TURN_START',
      isPostAction: false,
      lastActionLog: [],
      impacts: []
    });
    setPhase('MATCH');
    showFeedback("¡COMIENZO!", "info");
  };

  // --- RESOLVE DUEL LOGIC ---
  const resolvePossessionDuel = (p1Id: string, entities: Record<string, PhysicsEntity>, home: Team, away: Team): string => {
      // Find nearby opponent
      const p1 = [...home.players, ...away.players].find(p => p.id === p1Id);
      if (!p1) return p1Id;

      const ball = entities['ball'];
      const opponentTeam = home.players.some(p => p.id === p1Id) ? away : home;
      
      let nearestOpponent = null;
      let minDist = 10; // Duel radius
      
      opponentTeam.players.forEach(p => {
          const pEnt = entities[p.id];
          const dist = getDistance(ball.position, pEnt.position);
          if (dist < minDist) {
              minDist = dist;
              nearestOpponent = p;
          }
      });

      if (!nearestOpponent) return p1Id; // No duel, free ball

      // Duel! Stat check (Physical/Dribble vs Defense) + Random
      const p1Score = (p1.stats.PRE + p1.stats.REG) / 2 + randomInt(0, 30);
      const p2Score = (nearestOpponent.stats.PRE + nearestOpponent.stats.CEN) / 2 + randomInt(0, 30);
      
      if (p1Score >= p2Score) {
          showFeedback("¡Ganaste la posición!", "info");
          return p1Id;
      } else {
          showFeedback("¡Rival gana la posición!", "miss");
          return nearestOpponent.id;
      }
  };

  // --- CPU LOGIC: DECISIONS ---
  useEffect(() => {
    // 1. CPU Interaction (Standard Decision)
    if (matchState?.phase === 'CONTACT_RESOLUTION' && matchState.interactingPlayerId) {
        const isCpuPlayer = matchState.awayTeam.players.some(p => p.id === matchState.interactingPlayerId);
        if (isCpuPlayer) {
            setTimeout(() => performCpuActionResponse(), 1000);
        }
    }
  }, [matchState?.phase, matchState?.interactingPlayerId]);

  const performCpuActionResponse = () => {
      if (!matchState?.interactingPlayerId) return;
      const entities = physicsStateRef.current;
      const cpuId = matchState.interactingPlayerId;
      const cpuEntity = entities[cpuId];
      const ballEntity = entities['ball'];
      const distToGoal = 100 - cpuEntity.position.y;
      
      let action: 'SHOOT' | 'PASS' | 'DRIBBLE' = 'PASS';
      if (distToGoal < 30) action = 'SHOOT';
      else if (distToGoal < 60 && Math.random() > 0.6) action = 'DRIBBLE';

      if (action === 'SHOOT') {
          showFeedback("CPU PREPARA TIRO...", "info");
          setMatchState(prev => prev ? ({ ...prev, phase: 'DEFEND_SHOT' }) : null); // User must move GK
      } else if (action === 'DRIBBLE') {
          // Extra Move CPU
          const target = { x: 50, y: 100 };
          const dx = target.x - cpuEntity.position.x;
          const dy = target.y - cpuEntity.position.y;
          const mag = Math.sqrt(dx*dx + dy*dy);
          const vector = { x: (dx/mag)*2.5, y: (dy/mag)*2.5 };
          
          showFeedback("¡CPU REGATEA!", "info");
          cpuEntity.velocity = vector;
          ballEntity.velocity = vector; 
          setMatchState(prev => prev ? ({ ...prev, phase: 'SIMULATION', interactingPlayerId: null, isPostAction: true }) : null);

      } else {
          // Pass
          const teammates = matchState.awayTeam.players.filter(p => p.id !== cpuId);
          const receiver = teammates[randomInt(0, teammates.length-1)];
          const receiverEnt = entities[receiver.id];
          const dx = receiverEnt.position.x - ballEntity.position.x;
          const dy = receiverEnt.position.y - ballEntity.position.y;
          const mag = Math.sqrt(dx*dx + dy*dy);
          const vector = { x: (dx/mag)*3.5, y: (dy/mag)*3.5 };
          
          showFeedback("CPU Pasa", "info");
          ballEntity.velocity = vector;
          setMatchState(prev => prev ? ({ ...prev, phase: 'SIMULATION', interactingPlayerId: null, isPostAction: true }) : null);
      }
  };

  // --- PHYSICS LOOP ---
  const animate = (time: number) => {
      if (!matchState || matchState.phase !== 'SIMULATION') {
          requestRef.current = requestAnimationFrame(animate);
          return;
      }

      const deltaTime = time - lastTimeRef.current;
      lastTimeRef.current = time;
      
      const entities = physicsStateRef.current;
      const entityKeys = Object.keys(entities);
      let somethingMoving = false;
      const impacts: {x:number, y:number, id:string}[] = [];

      // 1. Move
      entityKeys.forEach(key => {
          const e = entities[key];
          if (Math.abs(e.velocity.x) > 0.01 || Math.abs(e.velocity.y) > 0.01) {
              somethingMoving = true;
              e.position.x += e.velocity.x;
              e.position.y += e.velocity.y;
              e.velocity = applyFriction(e.velocity);
              e.velocity = checkWallCollision(e);
          } else {
              e.velocity = { x: 0, y: 0 };
          }
      });

      // 2. Collisions
      for (let i = 0; i < entityKeys.length; i++) {
          for (let j = i + 1; j < entityKeys.length; j++) {
              const e1 = entities[entityKeys[i]];
              const e2 = entities[entityKeys[j]];
              
              if (checkEntityCollision(e1, e2)) {
                  const { v1, v2 } = resolveElasticCollision(e1, e2);
                  e1.velocity = v1;
                  e2.velocity = v2;
                  
                  impacts.push({ 
                      x: (e1.position.x + e2.position.x) / 2, 
                      y: (e1.position.y + e2.position.y) / 2, 
                      id: `${e1.id}-${e2.id}-${Date.now()}`
                  });

                  // LOGIC RESOLUTION (Only if not post-action move)
                  if (!matchState.isPostAction && (e1.isBall || e2.isBall)) {
                      const touchingPlayerId = e1.isBall ? e2.id : e1.id;
                      
                      // Check for Duel
                      const winnerId = resolvePossessionDuel(touchingPlayerId, entities, matchState.homeTeam, matchState.awayTeam);

                      setMatchState(prev => {
                          if (!prev) return null;
                          if (prev.phase === 'CONTACT_RESOLUTION') return prev; 
                          
                          return {
                              ...prev,
                              phase: 'CONTACT_RESOLUTION',
                              interactingPlayerId: winnerId,
                              physicsEntities: entities,
                              impacts: [...prev.impacts, ...impacts]
                          };
                      });
                      return; 
                  }
              }
          }
      }

      // 3. Goal Detection (Aligned with physics hole in wall)
      const ball = entities['ball'];
      if (ball.position.y < 2 && ball.position.x > 35 && ball.position.x < 65) {
          handleGoal(true); 
          return;
      }
      if (ball.position.y > 98 && ball.position.x > 35 && ball.position.x < 65) {
          handleGoal(false); 
          return;
      }

      setMatchState(prev => {
           if(!prev) return null;
           // If everything stopped, we advance turn
           if (!somethingMoving && prev.phase === 'SIMULATION') {
               const nextTurn = prev.turn + 1;
               const nextTime = prev.time + MINUTES_PER_TURN;

               // CHECK END GAME BY TIME
               if (nextTurn > TOTAL_TURNS) {
                    updateLeague(prev.homeTeam.id, prev.awayTeam.id, prev.score.home, prev.score.away);
                    return endGame({ ...prev, phase: 'END_GAME', score: prev.score });
               }

               return {
                   ...prev,
                   phase: 'TURN_START',
                   isPostAction: false,
                   turn: nextTurn,
                   time: nextTime,
                   physicsEntities: { ...entities },
                   activePlayerId: null,
                   impacts: impacts.length > 0 ? impacts : prev.impacts
               };
           }
           return {
               ...prev,
               physicsEntities: { ...entities },
               impacts: impacts.length > 0 ? impacts : prev.impacts
           }
      });
      
      requestRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(requestRef.current);
  }, [matchState?.phase]);

  const handleGoal = (userScored: boolean) => {
      setMatchState(prev => {
          if(!prev || prev.phase === 'GOAL') return prev; // Prevent double trigger
          
          const newScore = userScored ? { ...prev.score, home: prev.score.home + 1 } : { ...prev.score, away: prev.score.away + 1 };
          showFeedback("¡¡GOOOOOOL!!", "goal");
          setTimeout(() => resetPositionsAfterGoal(userScored, newScore), 3000);
          return { ...prev, score: newScore, phase: 'GOAL' };
      });
  };

  // --- USER INPUT ---
  const handleDragEnd = (start: Vector2, vector: Vector2) => {
    if (!matchState) return;

    // A. INITIAL TURN MOVE
    if (matchState.phase === 'TURN_START' && matchState.activePlayerId) {
        
        const userPlayer = physicsStateRef.current[matchState.activePlayerId];
        if (userPlayer) userPlayer.velocity = { x: vector.x * 2.5, y: vector.y * 2.5 };

        // CPU Move (Simultaneous)
        const cpuTeam = matchState.awayTeam;
        const ball = physicsStateRef.current['ball'];
        let bestCpuId = cpuTeam.players[0].id;
        let minDist = 9999;
        cpuTeam.players.forEach(p => {
            const dist = getDistance(physicsStateRef.current[p.id].position, ball.position);
            if (dist < minDist) { minDist = dist; bestCpuId = p.id; }
        });
        const cpuPlayer = physicsStateRef.current[bestCpuId];
        if (cpuPlayer) {
            const dx = ball.position.x - cpuPlayer.position.x;
            const dy = ball.position.y - cpuPlayer.position.y;
            const mag = Math.sqrt(dx*dx + dy*dy);
            const force = Math.min(2.5, mag * 0.15); 
            const err = (Math.random() - 0.5) * 5;
            cpuPlayer.velocity = { x: ((dx + err)/mag) * force, y: ((dy + err)/mag) * force };
        }
        setMatchState(prev => prev ? ({ ...prev, phase: 'SIMULATION', isPostAction: false }) : null);
    }
    
    // B. AIMING PASS / SHOT (USER)
    else if (matchState.phase === 'AIMING_PASS' || matchState.phase === 'AIMING_SHOT') {
        const ball = physicsStateRef.current['ball'];
        ball.velocity = { x: vector.x * 3.5, y: vector.y * 3.5 };
        
        // If Shot, CPU GK dives automatically
        if (matchState.phase === 'AIMING_SHOT') {
             // Find CPU GK
             const gk = matchState.awayTeam.players.find(p => p.position === 'POR');
             if (gk) {
                 const gkEnt = physicsStateRef.current[gk.id];
                 // Predict ball path roughly (Move towards Ball target X)
                 const targetX = ball.position.x + (ball.velocity.x * 10);
                 const dx = targetX - gkEnt.position.x;
                 const gkForce = Math.min(2, Math.abs(dx)*0.1);
                 gkEnt.velocity = { x: (dx > 0 ? 1 : -1) * gkForce, y: 0.5 }; // Dive side + slight fwd
             }
        }

        setMatchState(prev => prev ? ({ ...prev, phase: 'SIMULATION', interactingPlayerId: null, isPostAction: true }) : null);
    }

    // C. EXTRA MOVE (DRIBBLE)
    else if (matchState.phase === 'AIMING_EXTRA_MOVE' && matchState.interactingPlayerId) {
        const player = physicsStateRef.current[matchState.interactingPlayerId];
        const ball = physicsStateRef.current['ball'];
        const vel = { x: vector.x * 2, y: vector.y * 2 };
        
        player.velocity = vel;
        ball.velocity = vel; // Ball follows player
        
        setMatchState(prev => prev ? ({ ...prev, phase: 'SIMULATION', interactingPlayerId: null, isPostAction: true }) : null);
    }

    // D. DEFENDING SHOT (USER GK)
    else if (matchState.phase === 'DEFEND_SHOT') {
        // User dragged GK. Now CPU shoots.
        const gkId = matchState.homeTeam.players.find(p => p.position === 'POR')?.id;
        if (!gkId) return;
        const gkEnt = physicsStateRef.current[gkId];
        gkEnt.velocity = { x: vector.x * 2, y: vector.y * 2 }; // Dive user GK

        // CPU Shoots
        const ball = physicsStateRef.current['ball'];
        // Target Goal Center + Random
        const target = { x: 50 + (Math.random()-0.5)*20, y: 100 };
        const dx = target.x - ball.position.x;
        const dy = target.y - ball.position.y;
        const mag = Math.sqrt(dx*dx + dy*dy);
        ball.velocity = { x: (dx/mag)*3.5, y: (dy/mag)*3.5 };

        setMatchState(prev => prev ? ({ ...prev, phase: 'SIMULATION', interactingPlayerId: null, isPostAction: true }) : null);
    }
  };

  // --- ACTION SELECTION (USER) ---
  const handleActionSelect = (action: ActionType) => {
      if (!matchState || !matchState.interactingPlayerId) return;

      const player = (matchState.homeTeam.players.find(p => p.id === matchState.interactingPlayerId) || 
                     matchState.awayTeam.players.find(p => p.id === matchState.interactingPlayerId))!;
      const isHome = matchState.homeTeam.players.some(p => p.id === player.id);
      
      const opponentTeam = isHome ? matchState.awayTeam : matchState.homeTeam;
      let nearestOpponent = null;
      let minDist = 999;
      opponentTeam.players.forEach(p => {
          const dist = getDistance(physicsStateRef.current[player.id].position, physicsStateRef.current[p.id].position);
          if (dist < minDist) { minDist = dist; nearestOpponent = p; }
      });

      const distToGoal = isHome ? physicsStateRef.current[player.id].position.y : (100 - physicsStateRef.current[player.id].position.y);
      const { chance } = calculateSuccessChance(player, nearestOpponent, action, distToGoal, 0.9);
      const success = resolveAction(chance);

      // RESOLUTION
      if (success) {
          if (action === 'PASS') {
              showFeedback("¡Pase Ganado! ¡Apunta!", "info");
              setMatchState(prev => prev ? ({ ...prev, phase: 'AIMING_PASS' }) : null);
          } else if (action === 'SHOOT') {
              showFeedback("¡Tiro Libre! ¡Prepara cañón!", "info");
              setMatchState(prev => prev ? ({ ...prev, phase: 'AIMING_SHOT' }) : null);
          } else if (action === 'DRIBBLE' || action === 'DEFEND') {
              showFeedback("¡Regate! ¡Muévete!", "info");
              setMatchState(prev => prev ? ({ ...prev, phase: 'AIMING_EXTRA_MOVE' }) : null);
          }
      } else {
          showFeedback("Robo de balón / Fallo", "miss");
          physicsStateRef.current['ball'].velocity = { x: (Math.random()-0.5)*2, y: (Math.random()-0.5)*2 };
          setMatchState(prev => prev ? ({ ...prev, phase: 'SIMULATION', interactingPlayerId: null, isPostAction: true }) : null);
      }
  };

  const resetPositionsAfterGoal = (homeScored: boolean, score: {home:number, away:number}) => {
      const home = matchState!.homeTeam;
      const away = matchState!.awayTeam;
      const entities = physicsStateRef.current;
      
      home.players.forEach((p, i) => {
        entities[p.id].position = { x: p.position === 'POR' ? 50 : p.position === 'DEF' ? 30 + (i*40)%80 : 40 + (i*20)%40, y: p.position === 'POR' ? 92 : p.position === 'DEF' ? 75 : 55 };
        entities[p.id].velocity = { x: 0, y: 0 };
      });
      away.players.forEach((p, i) => {
        entities[p.id].position = { x: p.position === 'POR' ? 50 : p.position === 'DEF' ? 30 + (i*40)%80 : 40 + (i*20)%40, y: p.position === 'POR' ? 8 : p.position === 'DEF' ? 25 : 45 };
        entities[p.id].velocity = { x: 0, y: 0 };
      });
      entities['ball'].position = { x: 50, y: 50 };
      entities['ball'].velocity = { x: 0, y: 0 };

      setMatchState(prev => {
          if (!prev) return null;
          if (prev.turn >= TOTAL_TURNS) {
               updateLeague(home.id, away.id, score.home, score.away);
               return endGame({...prev, score});
          }
          return { ...prev, score, phase: 'TURN_START', interactingPlayerId: null, isPostAction: false };
      });
  };

  const endGame = (state: MatchState): MatchState => {
      if (careerTeam) {
           const isSeasonEnd = checkSeasonEnd();
           if (isSeasonEnd) {
                // Wait for rewards screen
                setTimeout(() => setPhase('CAREER_HUB'), 100); 
           } else {
               // Normal Match End -> Packs
               const p1 = generatePackPlayer(careerTeam.id);
               const p2 = generatePackPlayer(careerTeam.id);
               setPackPlayers([p1, p2]);
               setSelectedPackCandidate(null);
               setTimeout(() => setPhase('PACK_OPENING'), 2000);
           }
      } else {
          setTimeout(() => setPhase('MENU'), 3000);
      }
      return { ...state, phase: 'END_GAME' };
  };


  // --- RENDER ---
  return (
    <div className="w-full h-full min-h-screen bg-gray-900 select-none overflow-hidden">
      {phase === 'MENU' && (
        <div className="flex flex-col items-center justify-center h-screen bg-gradient-to-br from-gray-900 to-black text-white p-4">
          <h1 className="text-6xl font-black font-sport text-yellow-500 mb-2 tracking-tighter">LIGA RPG CHAPAS</h1>
          <button onClick={() => {
              setCareerTeam(null); // Clear previous career session if any
              setPhase('TEAM_SELECT');
          }} className="bg-white text-black font-bold py-4 px-8 rounded-xl mb-4">PARTIDO RÁPIDO</button>
          <button onClick={() => {
              const myTeam = createTeam('Mi Club', 'MIA', '#00ff00', '#000000', 65);
              setCareerTeam(myTeam);
              initLeague(myTeam);
              setPhase('CAREER_HUB');
          }} className="bg-gray-800 border font-bold py-4 px-8 rounded-xl">MODO CARRERA</button>
        </div>
      )}

      {phase === 'CAREER_HUB' && careerTeam && (
          <div className="flex flex-col h-screen bg-slate-900 text-white p-4">
             {showSeasonReward && (
                 <div className="absolute inset-0 z-50 bg-black/95 flex flex-col items-center justify-center animate-bounce-in">
                     <h1 className="text-5xl text-yellow-400 font-sport mb-4">¡FIN DE TEMPORADA!</h1>
                     <p className="text-white mb-8">¡Te has clasificado para Europa! Aquí tienes tu premio.</p>
                     <div onClick={() => {
                         const legend = generateRandomPlayer(careerTeam.id, 'DEL', 90, 99);
                         setPackPlayers([legend]);
                         setSelectedPackCandidate(null);
                         setPhase('PACK_OPENING');
                         setShowSeasonReward(false);
                         // Reset season
                         initLeague(careerTeam);
                     }}>
                         <div className="w-48 h-64 bg-gradient-to-tr from-yellow-600 to-yellow-200 rounded-xl shadow-2xl border-4 border-white flex items-center justify-center cursor-pointer hover:scale-105 transition-transform">
                             <span className="font-black text-3xl text-black">SOBRE LEYENDA</span>
                         </div>
                     </div>
                 </div>
             )}

             <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-sport">{careerTeam.name}</h1>
                <button onClick={() => setPhase('LEAGUE_TABLE')} className="text-yellow-400 font-bold border border-yellow-400 px-4 py-2 rounded">Ver Clasificación</button>
             </div>
             
             {/* Stats Season */}
             <div className="bg-black/40 p-4 rounded mb-4">
                 <p className="text-gray-400 text-sm">PROGRESO TEMPORADA</p>
                 <div className="w-full bg-gray-700 h-4 rounded-full mt-2">
                      <div className="bg-yellow-500 h-4 rounded-full" style={{ width: `${(leagueStandings.find(l=>l.teamId===careerTeam.id)?.played || 0) / GAMES_PER_SEASON * 100}%` }}></div>
                 </div>
             </div>

             <div className="flex gap-2 overflow-x-auto pb-4 mb-8 snap-x">
                {careerTeam.players.map(p => <div key={p.id} className="snap-center shrink-0"><PlayerCard player={p} size="md"/></div>)}
             </div>
             <button 
                onClick={() => {
                    // Pick a random team that is NOT the user team
                    const rivals = INITIAL_TEAMS;
                    const rival = rivals[randomInt(0, rivals.length -1)];
                    initMatch(careerTeam, rival);
                }}
                className="mt-auto bg-green-600 py-6 rounded-xl font-black text-2xl"
             >
                JUGAR JORNADA {leagueStandings.find(l => l.teamId === careerTeam.id)?.played! + 1}
             </button>
          </div>
      )}

      {phase === 'LEAGUE_TABLE' && (
          <LeagueTable standings={leagueStandings} onClose={() => setPhase('CAREER_HUB')} userTeamId={careerTeam?.id} />
      )}

      {phase === 'TEAM_SELECT' && (
           <div className="grid grid-cols-2 gap-4 p-4 h-screen overflow-auto bg-gray-900">
               {INITIAL_TEAMS.map(t => (
                   <div key={t.id} onClick={() => {
                       if (!userTeam) setUserTeam(t);
                       else if (!cpuTeam) { setCpuTeam(t); initMatch(userTeam, t); }
                   }} className="bg-gray-800 p-4 rounded text-white text-center cursor-pointer border border-transparent hover:border-yellow-500">
                       <div className="w-10 h-10 rounded-full mx-auto mb-2" style={{backgroundColor: t.primaryColor}}></div>
                       {t.name}
                   </div>
               ))}
           </div>
      )}

      {phase === 'MATCH' && matchState && (
        <div className="relative w-full h-screen flex flex-col">
          <ScoreBoard state={matchState} />
          
          <div className="flex-1 relative">
            <Pitch 
              state={matchState} 
              onPlayerSelect={(pid) => setMatchState({...matchState, activePlayerId: pid})}
              onDragEnd={handleDragEnd}
              onFieldClick={() => {}} // No used in drag mode
              isInteractive={true}
            />
            
            {matchState.phase === 'CONTACT_RESOLUTION' && matchState.interactingPlayerId && (
               (matchState.homeTeam.players.some(p => p.id === matchState.interactingPlayerId) ? (
                  <ActionMenu position="attack" onSelect={handleActionSelect} />
               ) : (
                  <div className="absolute bottom-10 left-0 right-0 text-center text-red-500 font-black text-2xl bg-black/50 py-2">TURNO RIVAL</div> 
               ))
            )}
          </div>
          
          {feedback && <FeedbackOverlay message={feedback.msg} type={feedback.type} />}
        </div>
      )}
      
      {phase === 'PACK_OPENING' && (
          <div className="fixed inset-0 bg-black/95 z-50 flex flex-col items-center justify-center p-4">
              {!selectedPackCandidate ? (
                  <>
                    <h2 className="text-yellow-400 font-sport text-4xl mb-8 text-center">NUEVOS FICHAJES<br/><span className="text-white text-lg font-sans">Elige uno para fichar</span></h2>
                    <div className="flex gap-4">
                        {packPlayers.map(p => (
                            <div key={p.id} onClick={() => setSelectedPackCandidate(p)}>
                                <PlayerCard player={p} size="lg" />
                            </div>
                        ))}
                    </div>
                  </>
              ) : (
                  <>
                     <h2 className="text-red-500 font-sport text-3xl mb-4 text-center">¿A QUIÉN SUSTITUYE?<br/><span className="text-white text-sm font-sans">Elige al jugador que abandonará el club</span></h2>
                     
                     <div className="flex items-center gap-4 mb-8">
                         <div className="text-center">
                             <p className="text-green-400 font-bold mb-2">ENTRA</p>
                             <PlayerCard player={selectedPackCandidate} size="md" />
                         </div>
                         <div className="text-4xl font-black">VS</div>
                     </div>

                     <div className="flex gap-2 overflow-x-auto w-full pb-4 px-4 snap-x">
                        {careerTeam?.players.map(p => (
                            <div key={p.id} className="snap-center shrink-0" onClick={() => {
                                if (careerTeam) {
                                    // FORCE POSITION INHERITANCE
                                    const finalizedPlayer = { ...selectedPackCandidate, position: p.position };

                                    const newSquad = careerTeam.players.filter(pl => pl.id !== p.id);
                                    newSquad.push(finalizedPlayer);
                                    setCareerTeam({...careerTeam, players: newSquad});
                                    setPhase('CAREER_HUB');
                                }
                            }}>
                                <PlayerCard player={p} size="sm" />
                                <button className="w-full bg-red-600 text-white text-xs font-bold py-1 mt-1 rounded">DESPEDIR</button>
                            </div>
                        ))}
                     </div>
                     <button onClick={() => setSelectedPackCandidate(null)} className="mt-4 text-gray-400 underline">Volver a los sobres</button>
                  </>
              )}
          </div>
      )}
    </div>
  );
};

export default App;