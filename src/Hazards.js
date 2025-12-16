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
    checkCollision() { return false; }
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

// ==========================================
// LEVEL 1-3 HAZARDS (Underground)
// ==========================================

export class Icicle {
    constructor(game, x, y) {
        this.game = game;
        this.x = x; // Center x
        this.y = y; // Top y
        this.width = 40;
        this.height = 100;
        this.state = 'HANG'; // HANG, SHAKE, FALL
        this.timer = 0;
        this.shakeTimer = 1.0; // Seconds to warn
        this.vy = 0;
        this.markedForDeletion = false;
        this.active = true;
        this.color = '#ff3366';
    }

    update(dt) {
        if (this.state === 'HANG') {
            // Wait for trigger? Or just start immediately? Let's assume spawned = active
            this.state = 'SHAKE';
        }
        else if (this.state === 'SHAKE') {
            this.timer += dt;
            if (this.timer >= this.shakeTimer) {
                this.state = 'FALL';
            }
        }
        else if (this.state === 'FALL') {
            this.vy += 1500 * dt; // Gravity
            this.y += this.vy * dt;

            // Hit floor
            if (this.y + this.height >= this.game.height) {
                this.shatter();
                this.markedForDeletion = true;
            }
        }
    }

    shatter() {
        this.active = false; // Destroy the icicle
        // Create debris (RainBullets for gravity)
        for (let i = 0; i < 5; i++) {
            const angle = -Math.PI / 2 + (Math.random() - 0.5) * 2;
            const speed = 200 + Math.random() * 200;
            const vx = Math.cos(angle) * speed;
            const vy = Math.sin(angle) * speed;
            // Spawn RainBullet with gravity
            // RainBullet(x, y, vx, vy, size)
            this.game.level.hazards.push(new RainBullet(this.x, this.game.height - 20, vx, vy, 10));
        }
    }

    render(ctx) {
        let drawX = this.x;
        if (this.state === 'SHAKE') {
            drawX += (Math.random() - 0.5) * 10;
        }

        ctx.fillStyle = this.color;
        ctx.beginPath();
        // Triangle pointing down
        ctx.moveTo(drawX - this.width / 2, this.y);
        ctx.lineTo(drawX + this.width / 2, this.y);
        ctx.lineTo(drawX, this.y + this.height);
        ctx.closePath();
        ctx.fill();
    }

    checkCollision(player) {
        // Approximate triangle as rect for now
        // Triangle is centered at this.x, width is this.width
        const halfW = this.width / 2;
        return (player.x < this.x + halfW &&
            player.x + player.width > this.x - halfW &&
            player.y < this.y + this.height &&
            player.y + player.height > this.y);
    }
}

export class Stalagmite {
    constructor(game, x, delay) {
        this.game = game;
        this.x = x;
        this.y = this.game.height;
        this.targetHeight = 300;
        this.currentHeight = 0;
        this.width = 50;
        this.state = 'WARN'; // WARN, RISE, RETRACT
        this.timer = 0;
        this.delay = delay;
        this.markedForDeletion = false;
        this.active = true;
        this.color = '#ff3366';
    }

    update(dt) {
        this.timer += dt;
        if (this.state === 'WARN') {
            if (this.timer >= this.delay) {
                this.state = 'RISE';
            }
        } else if (this.state === 'RISE') {
            this.currentHeight += 1000 * dt;
            if (this.currentHeight >= this.targetHeight) {
                this.currentHeight = this.targetHeight;
                this.state = 'RETRACT';
                this.timer = 0; // Reset for retract delay
            }
        } else if (this.state === 'RETRACT') {
            if (this.timer > 0.5) {
                this.currentHeight -= 500 * dt;
                if (this.currentHeight <= 0) {
                    this.active = false;
                }
            }
        }
        if (this.state !== 'RETRACT' || this.currentHeight > 0) this.active = true; // Redundant safety but ensures it's handled.
    }

    render(ctx) {
        // Warning
        if (this.state === 'WARN') {
            ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
            ctx.fillRect(this.x - this.width / 2, this.game.height - this.targetHeight, this.width, this.targetHeight);

            // Progress
            ctx.fillStyle = this.color;
            ctx.fillRect(this.x - this.width / 2, this.game.height - 10, this.width, 10);
        } else {
            ctx.fillStyle = this.color;
            ctx.beginPath();
            // Draw from bottom (game.height) up to currentHeight
            const yBottom = this.game.height;
            const yTop = this.game.height - this.currentHeight;
            ctx.moveTo(this.x - this.width / 2, yBottom);
            ctx.lineTo(this.x + this.width / 2, yBottom);
            ctx.lineTo(this.x, yTop);
            ctx.fill();
        }
    }

    checkCollision(player) {
        if (this.state === 'WARN') return false;
        if (this.currentHeight <= 0) return false;

        const rectLeft = this.x - this.width / 2;
        const rectRight = this.x + this.width / 2;
        const rectTop = this.game.height - this.currentHeight;
        const rectBottom = this.game.height;

        // AABB collision
        return (
            player.x < rectRight &&
            player.x + player.width > rectLeft &&
            player.y < rectBottom &&
            player.y + player.height > rectTop
        );
    }
}

export class Bat {
    constructor(game, y, speed) {
        this.game = game;
        this.x = this.game.width + 50;
        this.baseY = y;
        this.y = y;
        this.vx = -speed;
        this.size = 20;
        this.t = 0;
        this.markedForDeletion = false;
        this.active = true;
        this.color = '#ff3366';
    }

    update(dt) {
        this.x += this.vx * dt;
        this.t += dt * 5;
        this.y = this.baseY + Math.sin(this.t) * 100;

        if (this.x < -100) this.active = false;
    }

    render(ctx) {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size / 2, 0, Math.PI * 2);
        ctx.fill();
        // Wings?
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(this.x - 20, this.y - 20 + Math.sin(this.t * 2) * 10);
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(this.x + 20, this.y - 20 + Math.sin(this.t * 2) * 10);
        ctx.stroke();
    }

    checkCollision(player) {
        const dx = (player.x + player.width / 2) - this.x;
        const dy = (player.y + player.height / 2) - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance < (player.width / 2 + this.size / 2);
    }
}

export class Rock {
    constructor(game, x) {
        this.game = game;
        this.x = x;
        this.y = -50;
        this.vx = (Math.random() - 0.5) * 500; // Increased speed (was 100)
        this.vy = 0;
        this.size = 40;
        this.active = true;
        this.color = '#ff3366';
        this.bounces = 0;
    }

    update(dt) {
        this.vy += 1000 * dt;
        this.x += this.vx * dt;
        this.y += this.vy * dt;

        if (this.y + this.size / 2 >= this.game.height) {
            this.y = this.game.height - this.size / 2;
            this.vy *= -0.6;
            this.bounces++;

            // Exit logic: if slow or too many bounces
            if ((Math.abs(this.vy) < 50 && Math.abs(this.vx) < 50) || this.bounces > 3) {
                this.active = false; // Remove immediately when stopped
            }
        }

        // Remove if off-screen
        if (this.x < -100 || this.x > this.game.width + 100) {
            this.active = false;
        }
    }

    render(ctx) {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size / 2, 0, Math.PI * 2); // Sphere
        ctx.fill();
    }

    checkCollision(player) {
        // Rock is a sphere centered at x,y
        const dx = (player.x + player.width / 2) - this.x;
        const dy = (player.y + player.height / 2) - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        // hitbox somewhat smaller than full size
        return dist < (this.size / 2 + player.width / 2);
    }
}

export class MineCart {
    constructor(game, y, direction) {
        this.game = game;
        this.y = y;
        this.direction = direction; // 1 = right, -1 = left
        this.width = 120;
        this.height = 60;
        this.x = direction === 1 ? -this.width : this.game.width;
        this.targetVx = direction * 800; // Slower
        this.vx = 0;
        this.active = true;
        this.color = '#ff3366';
        this.state = 'WARN'; // WARN -> RUSH
        this.timer = 0;
        this.warnDuration = 1.0;
    }

    update(dt) {
        if (this.state === 'WARN') {
            this.timer += dt;
            if (this.timer > this.warnDuration) {
                this.state = 'RUSH';
                this.vx = this.targetVx;
            }
        } else if (this.state === 'RUSH') {
            this.x += this.vx * dt;
            if (this.direction === 1 && this.x > this.game.width + 100) this.active = false;
            if (this.direction === -1 && this.x < -this.width - 100) this.active = false;
        }
    }

    render(ctx) {
        // Draw Rails / Warning Line
        if (this.active) {
            ctx.save();
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.lineWidth = 4;
            // Lower rail
            const railY = this.y + this.height;
            ctx.beginPath();
            ctx.moveTo(0, railY);
            ctx.lineTo(this.game.width, railY);
            ctx.stroke();

            // Warning flash
            if (this.state === 'WARN' && Math.floor(this.timer * 10) % 2 === 0) {
                ctx.strokeStyle = '#ff3366';
                ctx.lineWidth = 4;
                ctx.beginPath();
                ctx.moveTo(0, railY);
                ctx.lineTo(this.game.width, railY);
                ctx.stroke();
            }
            ctx.restore();
        }

        if (this.state === 'RUSH') {
            ctx.fillStyle = this.color;
            ctx.fillRect(this.x, this.y, this.width, this.height);
            // Wheels
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(this.x + 20, this.y + this.height, 10, 0, Math.PI * 2);
            ctx.arc(this.x + this.width - 20, this.y + this.height, 10, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    checkCollision(player) {
        if (this.state !== 'RUSH') return false;
        return (
            player.x < this.x + this.width &&
            player.x + player.width > this.x &&
            player.y < this.y + this.height &&
            player.y + player.height > this.y
        );
    }
}

export class Crystal {
    constructor(game, x, y) {
        this.game = game;
        this.x = x;
        this.y = y;
        this.size = 0;
        this.maxSize = 60;
        this.state = 'GROW'; // GROW, CHARGE, EXPLODE
        this.timer = 0;
        this.markedForDeletion = false;
        this.active = true;
        this.color = '#ff3366';
    }

    update(dt) {
        if (this.state === 'GROW') {
            this.size += 100 * dt;
            if (this.size >= this.maxSize) {
                this.size = this.maxSize;
                this.state = 'FIRE';
                this.timer = 0;
                this.angle = 0;
            }
        }
        else if (this.state === 'FIRE') {
            this.timer += dt;
            if (this.timer > 1.0) { // Fire for 1 second
                this.active = false;
            } else {
                // Fire every 0.1s
                const interval = 0.1;
                if (Math.floor((this.timer - dt) / interval) < Math.floor(this.timer / interval)) {
                    // Fire!
                    this.angle += 0.5; // Rotate
                    for (let i = 0; i < 4; i++) {
                        const a = this.angle + (Math.PI * 2 / 4) * i;
                        const vx = Math.cos(a) * 400;
                        const vy = Math.sin(a) * 400;
                        this.game.level.hazards.push(new Bullet(this.x, this.y, vx, vy, 15));
                    }
                }
            }
        }
    }

    render(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.timer * 10);
        ctx.fillStyle = this.color;
        const s = this.size / 2;
        ctx.beginPath();
        ctx.moveTo(0, -s);
        ctx.lineTo(s, 0);
        ctx.lineTo(0, s);
        ctx.lineTo(-s, 0);
        ctx.fill();
        ctx.restore();

        if (this.state === 'FIRE') {
            ctx.strokeStyle = '#fff';
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.maxSize - 5 + Math.random() * 10, 0, Math.PI * 2);
            ctx.stroke();
        }
    }

    checkCollision(player) {
        // Body damage
        const dx = (player.x + player.width / 2) - this.x;
        const dy = (player.y + player.height / 2) - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        return dist < (this.size / 2 + player.width / 2);
    }
}
