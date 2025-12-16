export class ParticleSystem {
    constructor() {
        this.particles = [];
    }

    reset() {
        this.particles = [];
    }

    emit(x, y, color, count = 10, speed = 100) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const v = Math.random() * speed;
            this.particles.push({
                type: 'circle',
                x: x,
                y: y,
                vx: Math.cos(angle) * v,
                vy: Math.sin(angle) * v,
                life: 1.0,
                maxLife: 1.0,
                color: color,
                size: Math.random() * 5 + 2
            });
        }
    }

    emitShockwave(x, y, color) {
        this.particles.push({
            type: 'shockwave',
            x: x,
            y: y,
            vx: 0,
            vy: 0,
            life: 0.5,
            maxLife: 0.5,
            color: color,
            size: 10,
            growth: 1000 // pixels per second growth
        });
    }

    emitTrail(x, y, color, width, height) {
        this.particles.push({
            type: 'trail',
            x: x,
            y: y,
            vx: 0,
            vy: 0,
            life: 0.2, // short life
            maxLife: 0.2,
            color: color,
            width: width,
            height: height
        });
    }

    update(dt) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.life -= dt;
            if (p.life <= 0) {
                this.particles.splice(i, 1);
                continue;
            }
            p.x += p.vx * dt;
            p.y += p.vy * dt;

            if (p.type === 'shockwave') {
                p.size += p.growth * dt;
            }
        }
    }

    render(ctx) {
        for (const p of this.particles) {
            const lifeRatio = p.maxLife ? (p.life / p.maxLife) : p.life;
            ctx.globalAlpha = Math.max(0, Math.min(1, lifeRatio));

            ctx.fillStyle = p.color;
            ctx.strokeStyle = p.color;

            if (p.type === 'circle' || !p.type) {
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();
            } else if (p.type === 'shockwave') {
                ctx.lineWidth = 5 * (p.life / p.maxLife);
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.stroke();
            } else if (p.type === 'trail') {
                ctx.fillRect(p.x, p.y, p.width, p.height);
            }
        }
        ctx.globalAlpha = 1.0;
    }
}
