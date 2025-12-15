// --- engine.js: Lógica de Reglas y Probabilidad ---
import { MathUtils } from './core.js';

export const Engine = {
    calculateChance: (attacker, defender, action, distGoal) => {
        let base = 50;
        
        if (action === 'SHOOT') {
            base += (attacker.stats.TIR - 50) * 0.5;
            if (distGoal > 40) base -= (distGoal - 40);
            else base += 10;
            if (defender) base -= (defender.stats.PAR - 50) * 0.6;
        } else if (action === 'PASS') {
            base += (attacker.stats.PAS - 50) * 0.6;
            if (defender) base -= (defender.stats.VIS - 50) * 0.3;
        } else if (action === 'DRIBBLE') {
            base += (attacker.stats.REG - 50) * 0.7;
            if (defender) base -= (defender.stats.CEN - 50) * 0.5;
        }

        base += MathUtils.randomInt(-10, 10); // Factor suerte
        return MathUtils.clamp(Math.floor(base), 5, 95);
    },

    resolveDuel: (ballPos, p1, p2) => {
        // Simple resolución de duelo por posesión
        // p1 es quien tocó primero o el dueño actual
        const score1 = (p1.stats.PRE + p1.stats.REG) / 2 + MathUtils.randomInt(0, 30);
        const score2 = (p2.stats.PRE + p2.stats.CEN) / 2 + MathUtils.randomInt(0, 30);
        return score1 >= score2 ? p1.id : p2.id;
    },
    
    getAiAction: (distToGoal) => {
        if (distToGoal < 30) return 'SHOOT';
        if (distToGoal < 60 && Math.random() > 0.4) return 'DRIBBLE';
        return 'PASS';
    }
};