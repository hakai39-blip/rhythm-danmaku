export class Bullet {
    constructor(x, y, vx, vy, size = 15) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.size = size;
        this.active = true;
        this.color = '#ff3366';
        this.type = 'bullet';
        this.ignoreScroll = false;
    }
    update(dt) {
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        if (this.x < -100 || this.x > 2000 || this.y < -100 || this.y > 1200) this.active = false;
    }
    render(ctx) {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size / 2, 0, Math.PI * 2);
        ctx.fill();
    }
    checkCollision(player) {
        if (!player.invincible) {
            const dx = this.x - (player.x + player.width / 2);
            const dy = this.y - (player.y + player.height / 2);
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance < (this.size / 2 + player.width / 2)) return true;
        }
        return false;
    }
}

export class RainBullet extends Bullet {
    constructor(x, y, vx, vy, size) {
        super(x, y, vx, vy, size);
        this.type = 'rain';
        this.gravity = 500;
        this.color = '#ff3366';
    }
    update(dt) {
        this.vy += this.gravity * dt;
        super.update(dt);
    }
}

export class TrailBullet extends Bullet {
    constructor(x, y, vx, vy, size) {
        super(x, y, vx, vy, size);
        this.history = [];
        this.color = '#ff3366';
    }
    update(dt) {
        this.history.push({ x: this.x, y: this.y });
        // Ver 2.8: Increased history length for longer trails
        if (this.history.length > 20) this.history.shift();
        super.update(dt);
    }
    render(ctx) {
        for (let i = 0; i < this.history.length; i++) {
            const pos = this.history[i];
            const alpha = (i / this.history.length) * 0.5;
            ctx.fillStyle = `rgba(255, 51, 102, ${alpha})`;
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, this.size / 2, 0, Math.PI * 2);
            ctx.fill();
        }
        super.render(ctx);
    }
}

export class Snake {
    constructor(path, speed = 300, length = 10, radius = 15) {
        this.path = path;
        this.speed = speed;
        this.length = length;
        this.radius = radius;
        this.active = true;
        this.type = 'snake';
        this.headIndex = 0;
        this.currentPos = { ...path[0] };
        this.history = [];
        this.maxHistory = 1000;
        this.showTrace = true;
        this.ignoreScroll = false;
        for (let i = 0; i < length * 5; i++) this.history.push({ ...path[0], angle: 0 });
        if (path.length > 1) {
            const dx = path[1].x - path[0].x;
            const dy = path[1].y - path[0].y;
            this.angle = Math.atan2(dy, dx);
        } else this.angle = 0;
    }
    update(dt) {
        if (this.headIndex < this.path.length - 1) {
            const target = this.path[this.headIndex + 1];
            const dx = target.x - this.currentPos.x;
            const dy = target.y - this.currentPos.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const moveStep = this.speed * dt;
            if (dist <= moveStep) {
                this.currentPos.x = target.x;
                this.currentPos.y = target.y;
                this.headIndex++;
            } else {
                this.currentPos.x += (dx / dist) * moveStep;
                this.currentPos.y += (dy / dist) * moveStep;
            }
            this.angle = Math.atan2(dy, dx);
        } else {
            const vx = Math.cos(this.angle) * this.speed * dt;
            const vy = Math.sin(this.angle) * this.speed * dt;
            this.currentPos.x += vx;
            this.currentPos.y += vy;
        }
        this.history.unshift({ x: this.currentPos.x, y: this.currentPos.y, angle: this.angle });
        const spacing = Math.max(1, Math.floor(20 * (300 / this.speed)));
        const reqHistory = this.length * spacing + 10;
        if (this.history.length > reqHistory) this.history.length = reqHistory;
        const tail = this.history[Math.min(this.history.length - 1, (this.length - 1) * spacing)];
        if (tail) {
            if (tail.x < -100 || tail.x > 2000 || tail.y < -100 || tail.y > 1200) {
                if (this.headIndex >= this.path.length - 1) this.active = false;
            }
        }
    }
    render(ctx) {
        if (this.showTrace && this.active) {
            ctx.strokeStyle = 'rgba(255, 51, 102, 0.3)';
            ctx.lineWidth = 2;
            ctx.lineJoin = 'round';
            ctx.beginPath();
            ctx.moveTo(this.currentPos.x, this.currentPos.y);
            for (let i = this.headIndex + 1; i < this.path.length; i++) ctx.lineTo(this.path[i].x, this.path[i].y);
            ctx.stroke();
        }
        ctx.fillStyle = '#ff3366';
        const spacing = Math.max(1, Math.floor(1500 / this.speed));
        for (let i = 0; i < this.length; i++) {
            const index = i * spacing;
            if (index < this.history.length) {
                const pos = this.history[index];
                ctx.save();
                ctx.translate(pos.x, pos.y);
                ctx.rotate(pos.angle);
                ctx.fillRect(-this.radius, -this.radius, this.radius * 2, this.radius * 2);
                ctx.restore();
            }
        }
    }
    checkCollision(player) {
        if (!player.invincible) {
            const spacing = Math.max(1, Math.floor(1500 / this.speed));
            for (let i = 0; i < this.length; i++) {
                const index = i * spacing;
                if (index < this.history.length) {
                    const pos = this.history[index];
                    if (this.rectCollide(pos, player)) return true;
                }
            }
        }
        return false;
    }
    rectCollide(p, player) {
        const r = this.radius;
        return (
            player.x < p.x + r &&
            player.x + player.width > p.x - r &&
            player.y < p.y + r &&
            player.y + player.height > p.y - r
        );
    }
}

export class Piston {
    constructor(game, x, y, width, height, dirX, dirY, speed, extendDist) {
        this.game = game;
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.dirX = dirX;
        this.dirY = dirY;
        this.speed = speed;
        this.maxDist = (dirX !== 0) ? game.width : game.height;
        this.currentDist = 0;
        this.state = 'WARN';
        this.timer = 0;
        this.warnTime = 0.42;
        this.active = true;
        this.type = 'piston';
        this.startX = x;
        this.startY = y;
        this.vanishTimer = 0;
        this.ignoreScroll = false;
    }
    update(dt) {
        this.timer += dt;
        if (this.state === 'WARN') {
            if (this.timer > this.warnTime) {
                this.state = 'EXTEND';
                this.currentDist = this.maxDist;
                this.game.triggerShake(10);
            }
        } else if (this.state === 'EXTEND') {
            this.vanishTimer += dt;
            if (this.vanishTimer > 0.2) {
                this.active = false;
            }
        }
    }
    render(ctx) {
        if (this.state === 'WARN') {
            ctx.save();
            ctx.fillStyle = 'rgba(255, 51, 102, 0.2)';
            let wx = this.startX;
            let wy = this.startY;
            let ww = this.width;
            let wh = this.height;
            if (this.dirY === 1) wh = this.maxDist;
            else if (this.dirY === -1) { wy -= this.maxDist; wh = this.maxDist; }
            else if (this.dirX === 1) ww = this.maxDist;
            else if (this.dirX === -1) { wx -= this.maxDist; ww = this.maxDist; }
            ctx.fillRect(wx, wy, ww, wh);
            ctx.fillStyle = '#ff3366';
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#ff3366';
            ctx.fillRect(this.startX, this.startY, this.width, this.height);
            ctx.restore();
        }
        if (this.state === 'EXTEND') {
            ctx.fillStyle = '#ff3366';
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#ff3366';
            let rx = this.startX;
            let ry = this.startY;
            let rw = this.width;
            let rh = this.height;
            if (this.dirY === 1) rh = this.maxDist;
            else if (this.dirY === -1) { ry = this.startY - this.maxDist; rh = this.maxDist; }
            ctx.fillRect(rx, ry, rw, rh);
            ctx.shadowBlur = 0;
        }
    }
    checkCollision(player) {
        if (!player.invincible && this.state === 'EXTEND') {
            let rx = this.startX;
            let ry = this.startY;
            let rw = this.width;
            let rh = this.height;
            if (this.dirY === 1) rh = this.maxDist;
            else if (this.dirY === -1) { ry = this.startY - this.maxDist; rh = this.maxDist; }
            return (
                player.x < rx + rw &&
                player.x + player.width > rx &&
                player.y < ry + rh &&
                player.y + player.height > ry
            );
        }
        return false;
    }
}

export class Bomb {
    constructor(targetX, targetY, startX, startY, beatDuration, game) {
        this.targetX = targetX;
        this.targetY = targetY;
        this.x = startX;
        this.y = startY;
        this.game = game;
        this.size = 30;
        this.active = true;
        this.type = 'bomb';
        this.exploded = false;
        this.travelTime = beatDuration ? beatDuration * 0.5 : 0.4;
        this.timer = 0;
        this.warningTime = 0.5;
        this.ignoreScroll = false;
    }
    update(dt) {
        this.timer += dt;
        if (this.timer < this.travelTime) {
            const remaining = this.travelTime - this.timer;
            if (remaining > 0) {
                this.x += (this.targetX - this.x) * (dt / remaining);
                this.y += (this.targetY - this.y) * (dt / remaining);
            }
        } else {
            if (this.timer >= this.travelTime + this.warningTime && !this.exploded) {
                this.explode();
            }
        }
    }
    explode() {
        this.exploded = true;
        this.active = false;
        const count = 8;
        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 / count) * i;
            const speed = 300;
            const vx = Math.cos(angle) * speed;
            const vy = Math.sin(angle) * speed;
            this.game.level.hazards.push(new Bullet(this.x, this.y, vx, vy, 15));
        }
        this.game.particles.emit(this.x, this.y, '#ff3366', 20, 150);
        this.game.triggerShake(5);
    }
    render(ctx) {
        if (this.timer >= this.travelTime) {
            const flash = Math.floor(this.timer * 20) % 2 === 0;
            ctx.fillStyle = flash ? '#ffffff' : '#ff3366';
        } else ctx.fillStyle = '#ff3366';
        ctx.beginPath();
        const s = this.size + Math.sin(this.timer * 20) * 5;
        ctx.arc(this.x, this.y, s / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
    }
    checkCollision(player) {
        if (!player.invincible) {
            const dx = this.x - (player.x + player.width / 2);
            const dy = this.y - (player.y + player.height / 2);
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance < (this.size / 2 + player.width / 2)) return true;
        }
        return false;
    }
}

export class Beam {
    constructor(x, y, width, height, duration, warningDuration) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.duration = duration;
        this.warningDuration = warningDuration;
        this.timer = 0;
        this.active = true;
        this.isDangerous = false;
        this.type = 'beam';
        this.ignoreScroll = false;
    }
    update(dt) {
        this.timer += dt;
        if (this.timer < this.warningDuration) {
            this.isDangerous = false;
        } else if (this.timer < this.warningDuration + this.duration) {
            this.isDangerous = true;
        } else this.active = false;
    }
    render(ctx) {
        if (this.timer < this.warningDuration) {
            ctx.fillStyle = 'rgba(255, 51, 102, 0.2)';
            ctx.fillRect(this.x, this.y, this.width, this.height);
            if (Math.floor(this.timer * 10) % 2 === 0) {
                ctx.strokeStyle = '#ff3366';
                ctx.lineWidth = 2;
                ctx.strokeRect(this.x, this.y, this.width, this.height);
            }
        } else {
            ctx.fillStyle = '#ff3366';
            ctx.shadowBlur = 20;
            ctx.shadowColor = '#ff3366';
            ctx.fillRect(this.x, this.y, this.width, this.height);
            ctx.shadowBlur = 0;
        }
    }
    checkCollision(player) {
        if (this.isDangerous && !player.invincible) {
            return (
                player.x < this.x + this.width &&
                player.x + player.width > this.x &&
                player.y < this.y + this.height &&
                player.y + player.height > this.y
            );
        }
        return false;
    }
}

export class PulseBackground {
    constructor(game) {
        this.game = game;
        this.pulse = 0;
    }
    trigger() { this.pulse = 1.0; }
    update(dt) {
        if (this.pulse > 0) {
            this.pulse -= dt * 2;
            if (this.pulse < 0) this.pulse = 0;
        }
    }
    render(ctx) {
        if (this.pulse > 0) {
            ctx.save();
            ctx.globalAlpha = 0.2 * this.pulse;
            ctx.fillStyle = '#ff3366';
            ctx.fillRect(0, 0, this.game.width, this.game.height);
            ctx.restore();
        }
    }
}

export class RadialWarning {
    constructor(x, y, count, angleOffset, duration) {
        this.x = x;
        this.y = y;
        this.count = count;
        this.angleOffset = angleOffset;
        this.duration = duration;
        this.timer = 0;
        this.active = true;
        this.ignoreScroll = false;
    }
    update(dt) {
        this.timer += dt;
        if (this.timer > this.duration) this.active = false;
    }
    render(ctx) {
        const progress = this.timer / this.duration;
        const alpha = 1.0 - progress;
        ctx.save();
        ctx.strokeStyle = `rgba(255, 51, 102, ${alpha * 0.5})`;
        ctx.lineWidth = 2;
        ctx.translate(this.x, this.y);
        for (let i = 0; i < this.count; i++) {
            const angle = (Math.PI * 2 / this.count) * i + this.angleOffset;
            ctx.rotate(angle);
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(2000, 0); // Very long line
            ctx.stroke();
            ctx.rotate(-angle); // Reset for next loop
        }
        ctx.restore();
    }
    checkCollision() { return false; }
}

export class LaneGuide {
    constructor(game, y, h) {
        this.game = game;
        this.x = 0;
        this.y = y;
        this.width = game.width;
        this.height = h;
        this.active = true;
        this.ignoreScroll = true;
        this.type = 'guide';
    }
    update(dt) {
        if (this.x < -this.game.width) this.active = false;
    }
    render(ctx) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 2;
        ctx.strokeRect(this.x, this.y, this.width, this.height);
    }
    checkCollision() { return false; }
}
