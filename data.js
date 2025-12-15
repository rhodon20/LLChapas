// --- data.js: Datos estáticos y generadores ---
import { MathUtils } from './core.js';

const firstNames = ['Juan', 'Pedro', 'Luis', 'Carlos', 'Dani', 'Leo', 'Cristiano', 'Kylian', 'Lamine', 'Vinicius', 'Nico', 'Zinedine', 'Iker'];
const lastNames = ['Garcia', 'Lopez', 'Martinez', 'Messi', 'Ronaldo', 'Mbappe', 'Yamal', 'Junior', 'Williams', 'Pedri', 'Gavi', 'Zidane'];

export const Data = {
    generatePlayer: (teamId, position, minR, maxR) => {
        const rating = MathUtils.randomInt(minR, maxR);
        const base = Math.floor(rating * 0.8);
        const v = () => MathUtils.randomInt(0, 20);

        // Stats simples
        const stats = {
            VEL: position === 'DEL' ? base + v() : base + v() - 10,
            PAS: position === 'DEF' ? base + v() + 5 : base + v(),
            TIR: position === 'DEL' ? base + v() + 10 : base + v() - 15,
            REG: position === 'DEL' ? base + v() + 5 : base + v() - 5,
            VIS: base + v(),
            PAR: position === 'POR' ? base + v() + 20 : 10,
            CEN: base + v(),
            PRE: base + v(),
        };

        // Clamp stats
        for(let k in stats) stats[k] = MathUtils.clamp(stats[k], 1, 99);

        return {
            id: MathUtils.generateId(),
            name: `${firstNames[MathUtils.randomInt(0, firstNames.length-1)]} ${lastNames[MathUtils.randomInt(0, lastNames.length-1)]}`,
            position,
            stats,
            rating,
            teamId,
            imageUrl: `https://picsum.photos/seed/${MathUtils.randomInt(0, 1000)}/200/300`
        };
    },

    createTeam: (name, shortName, color1, color2, avg) => {
        const tid = MathUtils.generateId();
        return {
            id: tid, name, shortName, primaryColor: color1, secondaryColor: color2,
            players: [
                Data.generatePlayer(tid, 'POR', avg-5, avg+5),
                Data.generatePlayer(tid, 'DEF', avg-5, avg+5),
                Data.generatePlayer(tid, 'DEF', avg-5, avg+5),
                Data.generatePlayer(tid, 'DEL', avg-5, avg+5),
                Data.generatePlayer(tid, 'DEL', avg-5, avg+5),
            ]
        };
    },
    
    generatePackPlayer: (teamId) => {
        const roll = Math.random() * 100;
        let minR, maxR;
        if (roll < 60) { minR = 65; maxR = 74; }
        else if (roll < 85) { minR = 75; maxR = 82; }
        else if (roll < 97) { minR = 83; maxR = 89; }
        else { minR = 90; maxR = 99; }
        
        const pos = ['POR','DEF','DEL'][MathUtils.randomInt(0,2)];
        return Data.generatePlayer(teamId, pos, minR, maxR);
    }
};

export const INITIAL_TEAMS = [
    Data.createTeam('Real Madrid', 'RMA', '#FFFFFF', '#1F2937', 88),
    Data.createTeam('FC Barcelona', 'BAR', '#1E3A8A', '#B91C1C', 87),
    Data.createTeam('Atlético Madrid', 'ATM', '#B91C1C', '#FFFFFF', 84),
    Data.createTeam('Valencia CF', 'VAL', '#FFFFFF', '#000000', 78),
    Data.createTeam('Sevilla FC', 'SEV', '#FFFFFF', '#DC2626', 79),
    Data.createTeam('Real Betis', 'BET', '#047857', '#FFFFFF', 78),
    Data.createTeam('Athletic Club', 'ATH', '#DC2626', '#FFFFFF', 81),
];