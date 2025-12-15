// --- core.js: Matemáticas y Física Pura ---

export const Vector = {
    add: (v1, v2) => ({ x: v1.x + v2.x, y: v1.y + v2.y }),
    sub: (v1, v2) => ({ x: v1.x - v2.x, y: v1.y - v2.y }),
    mult: (v, s) => ({ x: v.x * s, y: v.y * s }),
    mag: (v) => Math.sqrt(v.x * v.x + v.y * v.y),
    normalize: (v) => {
        const m = Math.sqrt(v.x * v.x + v.y * v.y);
        return m === 0 ? { x: 0, y: 0 } : { x: v.x / m, y: v.y / m };
    },
    dist: (v1, v2) => Math.sqrt(Math.pow(v2.x - v1.x, 2) + Math.pow(v2.y - v1.y, 2))
};

export const MathUtils = {
    randomInt: (min, max) => Math.floor(Math.random() * (max - min + 1)) + min,
    generateId: () => Math.random().toString(36).substr(2, 9),
    clamp: (val, min, max) => Math.min(Math.max(val, min), max)
};

// Configuración Física
const FRICTION = 0.96;
const WALL_DAMPING = 0.7;

export const Physics = {
    applyFriction: (vel) => ({ x: vel.x * FRICTION, y: vel.y * FRICTION }),
    
    checkWallCollision: (entity) => {
        let vx = entity.velocity.x;
        let vy = entity.velocity.y;
        let px = entity.position.x;
        let py = entity.position.y;
        const r = entity.radius > 0 ? 2 : 2; // Margen visual

        // Paredes Laterales
        if (px < r) { px = r; vx = -vx * WALL_DAMPING; }
        if (px > 100 - r) { px = 100 - r; vx = -vx * WALL_DAMPING; }

        const inGoalZone = px > 35 && px < 65;

        // Pared Superior (Y=0) - Portería CPU
        if (py < r) {
            if (entity.isBall && inGoalZone) { /* Gol entra */ }
            else { py = r; vy = -vy * WALL_DAMPING; }
        }

        // Pared Inferior (Y=100) - Portería Usuario
        if (py > 100 - r) {
            if (entity.isBall && inGoalZone) { /* Gol entra */ }
            else { py = 100 - r; vy = -vy * WALL_DAMPING; }
        }

        entity.position = { x: px, y: py };
        return { x: vx, y: vy };
    },

    checkCollision: (e1, e2) => {
        const d = Vector.dist(e1.position, e2.position);
        return d < 5; // Radio de colisión simplificado (2.5 + 2.5)
    },

    resolveCollision: (e1, e2) => {
        const dx = e2.position.x - e1.position.x;
        const dy = e2.position.y - e1.position.y;
        const dist = Math.sqrt(dx*dx + dy*dy);

        if (dist === 0) return;

        const nx = dx / dist;
        const ny = dy / dist;
        const tx = -ny;
        const ty = nx;

        // Productos punto
        const v1n = nx * e1.velocity.x + ny * e1.velocity.y;
        const v1t = tx * e1.velocity.x + ty * e1.velocity.y;
        const v2n = nx * e2.velocity.x + ny * e2.velocity.y;
        const v2t = tx * e2.velocity.x + ty * e2.velocity.y;

        const m1 = e1.mass; 
        const m2 = e2.mass;

        // Conservación momento (Elástica 1D)
        const v1nF = (v1n * (m1 - m2) + 2 * m2 * v2n) / (m1 + m2);
        const v2nF = (v2n * (m2 - m1) + 2 * m1 * v1n) / (m1 + m2);

        // Convertir escalar a vector
        e1.velocity.x = v1nF * nx + v1t * tx;
        e1.velocity.y = v1nF * ny + v1t * ty;
        e2.velocity.x = v2nF * nx + v2t * tx;
        e2.velocity.y = v2nF * ny + v2t * ty;

        // Corregir superposición (Overlap)
        const overlap = 5 - dist;
        if (overlap > 0) {
            const corr = overlap / 2;
            e1.position.x -= nx * corr;
            e1.position.y -= ny * corr;
            e2.position.x += nx * corr;
            e2.position.y += ny * corr;
        }
        
        return { 
            impact: true, 
            x: (e1.position.x + e2.position.x)/2, 
            y: (e1.position.y + e2.position.y)/2 
        };
    }
};