export class Player {
    constructor(game) {
        this.game = game;
        this.width = 20;
        this.height = 20;
        this.x = game.width / 2;
        this.y = game.height / 2;
        this.speed = 300;
        this.color = '#00ffff';

        // Physics for Knockback
        this.vx = 0;
        this.vy = 0;
        this.friction = 5.0;

        this.isDashing = false;
        this.dashDuration = 0.2;
        this.dashCooldown = 0.5;
        this.dashTimer = 0;
        this.dashCooldownTimer = 0;

        // Timer based invincibility
        this.invincibleTimer = 0;

        this.hp = 3;
        this.maxHp = 3;

        this.keys = {
            ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false,
            KeyW: false, KeyS: false, KeyA: false, KeyD: false,
            Space: false
        };

        window.addEventListener('keydown', e => this.handleKey(e, true));
        window.addEventListener('keyup', e => this.handleKey(e, false));
    }

    reset() {
        this.x = this.game.width / 2;
        this.y = this.game.height / 2;
        this.hp = this.maxHp;
        this.vx = 0;
        this.vy = 0;
        this.isDashing = false;
        this.invincibleTimer = 0;
        this.dashCooldownTimer = 0;
    }

    get invincible() {
        return this.invincibleTimer > 0 || this.isDashing;
    }

    handleKey(e, isDown) {
        if (this.keys.hasOwnProperty(e.code)) {
            this.keys[e.code] = isDown;
        }

        if (e.code === 'Space' && isDown && !this.isDashing && this.dashCooldownTimer <= 0) {
            this.startDash();
        }
    }

    startDash() {
        this.isDashing = true;
        this.dashTimer = this.dashDuration;
        this.dashCooldownTimer = this.dashCooldown;
    }

    update(dt) {
        // Cooldowns
        if (this.dashCooldownTimer > 0) this.dashCooldownTimer -= dt;
        if (this.invincibleTimer > 0) this.invincibleTimer -= dt;

        // Dashing Logic
        if (this.isDashing) {
            this.dashTimer -= dt;
            this.game.particles.emitTrail(this.x, this.y, this.color, this.width, this.height);
            if (this.dashTimer <= 0) {
                this.isDashing = false;
            }
        }

        // Apply Friction
        this.vx -= this.vx * this.friction * dt;
        this.vy -= this.vy * this.friction * dt;

        if (Math.abs(this.vx) < 10) this.vx = 0;
        if (Math.abs(this.vy) < 10) this.vy = 0;

        // Movement Input
        let dx = 0;
        let dy = 0;

        if (this.keys.ArrowUp || this.keys.KeyW) dy -= 1;
        if (this.keys.ArrowDown || this.keys.KeyS) dy += 1;
        if (this.keys.ArrowLeft || this.keys.KeyA) dx -= 1;
        if (this.keys.ArrowRight || this.keys.KeyD) dx += 1;

        if (dx !== 0 || dy !== 0) {
            const length = Math.sqrt(dx * dx + dy * dy);
            dx /= length;
            dy /= length;
        }

        const currentSpeed = this.isDashing ? this.speed * 3 : this.speed;

        this.x += (dx * currentSpeed + this.vx) * dt;
        this.y += (dy * currentSpeed + this.vy) * dt;

        // Bounds
        this.x = Math.max(0, Math.min(this.game.width - this.width, this.x));
        this.y = Math.max(0, Math.min(this.game.height - this.height, this.y));
    }

    render(ctx) {
        ctx.save();

        if (this.isDashing) {
            ctx.shadowBlur = 20;
            ctx.shadowColor = this.color;
        }

        // Flash if invincible but not dashing
        if (this.invincibleTimer > 0 && !this.isDashing) {
            if (Math.floor(Date.now() / 50) % 2 === 0) ctx.globalAlpha = 0.5;
        }

        ctx.fillStyle = this.color;
        ctx.strokeStyle = this.color; // For frame
        ctx.lineWidth = 2; // Frame thickness

        // 1. Draw Frame (Always Full)
        ctx.strokeRect(this.x, this.y, this.width, this.height);

        // 2. Draw Body (Based on HP)
        // Offset slightly inwards so frame doesn't overlap perfectly with fill
        // Actually nice if they touch.

        ctx.beginPath();
        if (this.hp === 3) {
            // Full Body
            ctx.rect(this.x, this.y, this.width, this.height);
        } else if (this.hp === 2) {
            // Chipped (Top Right missing)
            // Points: TopLeft, TopMid, MidMid, MidRight, BottomRight, BottomLeft
            // Simpler: Draw full rect minus a corner? 
            // Let's create an L shape.
            ctx.moveTo(this.x, this.y); // TL
            ctx.lineTo(this.x + this.width * 0.5, this.y); // TM
            ctx.lineTo(this.x + this.width * 0.5, this.y + this.height * 0.5); // Center
            ctx.lineTo(this.x + this.width, this.y + this.height * 0.5); // MR
            ctx.lineTo(this.x + this.width, this.y + this.height); // BR
            ctx.lineTo(this.x, this.y + this.height); // BL
            ctx.closePath();
        } else if (this.hp === 1) {
            // Half Body (Bottom Half)
            ctx.rect(this.x, this.y + this.height * 0.5, this.width, this.height * 0.5);
        }
        ctx.fill();

        ctx.restore();
    }

    takeDamage(sourceX, sourceY) {
        if (this.invincible) return;
        this.hp--;

        // Visual Feedback
        this.game.triggerShake(20);
        this.game.particles.emitShockwave(this.x + this.width / 2, this.y + this.height / 2, '#ff3366');

        if (this.game.audio.playDamage) this.game.audio.playDamage();

        // Knockback Impulse
        let dx = (this.x + this.width / 2) - sourceX;
        let dy = (this.y + this.height / 2) - sourceY;

        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 0) {
            dx /= dist;
            dy /= dist;
        } else {
            dx = 1; dy = 0;
        }

        const force = 600;
        this.vx = dx * force;
        this.vy = dy * force;

        this.invincibleTimer = 1.5; // 1.5 Seconds Invincibility

        if (this.hp <= 0) {
            this.game.gameOver();
        }
    }
}
