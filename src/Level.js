import { Bullet, Beam, Piston, RainBullet, Snake, Bomb, PulseBackground, TrailBullet, RadialWarning, LaneGuide, Icicle, Stalagmite, Bat, Rock, MineCart, Crystal } from './Hazards.js?v=3.2';

export class Level {
    constructor(game) {
        this.game = game;
        this.hazards = [];
        this.pulseBg = new PulseBackground(game);

        this.currentMeasure = 0;
        this.lastMeasure = -1;
        this.lastBeat16 = -1;

        this.endTimer = 0;
        this.gameFinished = false;
        this.climaxBorderActive = false;

        this.levelId = 1;

        // Level 2 State
        this.scrollSpeed = 0;
        this.targetScrollSpeed = 0;
        this.burstAngle = 0;
        this.lastGapY = 360;
        this.nextGapY = 360;
        this.wallCounter = 0;
        this.laneGuides = [];
    }

    setLevel(id) {
        this.levelId = id;
        this.hazards = [];
        this.endTimer = 0;
        this.gameFinished = false;
        this.climaxBorderActive = false;
        this.scrollSpeed = 0;
        this.targetScrollSpeed = 0;
        this.burstAngle = 0;
        this.lastGapY = this.game.height / 2;
        this.wallCounter = 0;
        this.laneGuides = [];
    }

    update(dt) {
        this.hazards = this.hazards.filter(h => h.active);
        this.hazards.forEach(h => h.update(dt));
        if (this.pulseBg) this.pulseBg.update(dt);

        if (this.levelId === 2) {
            const lerpSpeed = 1.0;
            this.scrollSpeed += (this.targetScrollSpeed - this.scrollSpeed) * lerpSpeed * dt;

            if (this.scrollSpeed > 10) {
                this.hazards.forEach(h => {
                    if (!h.ignoreScroll) {
                        h.x -= this.scrollSpeed * dt;
                    }
                });
            }
        }

        const audio = this.game.audio;

        // Ver 3.0: Adjustable End Time
        const maxMeasures = (this.levelId === 1) ? 56 : (this.levelId === 2 ? 57 : 48);

        if (audio.measure >= maxMeasures && !this.gameFinished) {
            if (audio.isPlaying) audio.stop();
            this.endTimer += dt;
            if (this.endTimer > 1.0) {
                this.gameFinished = true;
                this.game.victory();
            }
        }

        if (!audio.isPlaying) return;

        const measure = audio.measure;
        const beat16 = audio.current16thNote;

        if (measure !== this.lastMeasure) {
            this.lastMeasure = measure;
            if (this.pulseBg) this.pulseBg.trigger();
        }

        if (beat16 !== this.lastBeat16) {
            this.lastBeat16 = beat16;
            if (this.levelId === 1) this.updateLevel1(measure, beat16);
            else if (this.levelId === 2) this.updateLevel2(measure, beat16);
            else if (this.levelId === 3) this.scheduleLevel3(measure, beat16);
        }
    }

    // ==========================================
    // LEVEL 3: Cavern Depths
    // ==========================================
    scheduleLevel3(m, beat) {
        // 0-8: Intro
        if (m < 8) {
            // Simplified rhythm, focused on "falling" theme
            if (beat % 4 === 0) {
                const x = Math.random() * this.game.width;
                const vx = (Math.random() - 0.5) * 100;
                this.hazards.push(new RainBullet(x, -50, vx, 100, 10)); // Rain
            }
            if (m % 2 === 0 && beat === 0) {
                this.hazards.push(new Rock(this.game, 200 + Math.random() * (this.game.width - 400)));
            }
        }

        // 8-24: Main (Icicle Rain + Stalagmites)
        if (m >= 8 && m < 24) {
            if (beat === 0) {
                const x = 100 + Math.random() * (this.game.width - 200);
                this.hazards.push(new Icicle(this.game, x, 0));
            }
            if (beat === 8) {
                const x = this.game.player.x;
                this.hazards.push(new Stalagmite(this.game, x, 1.0));
            }
        }

        // 24-32: Panic (MineCarts)
        if (m >= 24 && m < 32) {
            if (beat % 8 === 0) { // Reduced freq
                const y = 100 + Math.random() * (this.game.height - 200);
                const dir = Math.random() > 0.5 ? 1 : -1;
                this.hazards.push(new MineCart(this.game, y, dir));
            }
            if (beat % 4 === 0) { // Reduced Bat freq
                const y = 200 + Math.random() * 400;
                this.hazards.push(new Bat(this.game, y, 400));
            }
        }

        // 32-48: Finale (Crystals + All)
        if (m >= 32 && m < 48) {
            if (m % 4 === 0 && beat === 0) {
                this.hazards.push(new Crystal(this.game, this.game.width / 2, this.game.height / 2));
            }
            if (beat % 4 === 0) {
                // Rhythmic Bombs
                // Right 1/4 of screen
                const minX = this.game.width * 0.75;
                const maxX = this.game.width - 50;
                const x = minX + Math.random() * (maxX - minX);
                const y = 100 + Math.random() * (this.game.height - 200);
                // Bomb(targetX, targetY, startX, startY, beatDur, game)
                // Start from right edge
                const startX = this.game.width + 50;
                this.hazards.push(new Bomb(x, y, startX, y, 60 / 120, this.game));
            }
        }

        // Background Pulse
        if (beat === 0) {
            this.hazards.push(new PulseBackground(this.game));
        }
    }

    updateLevel1(measure, beat16) {
        if (measure < 8) {
            if (beat16 % 4 === 0) { this.spawnSideBullet(); this.spawnSmallFastBullet(); }
        }
        else if (measure < 16) {
            if (beat16 % 4 === 0) this.spawnSideBullet();
            if (measure >= 12 && beat16 % 2 === 0) this.spawnTopBullet();
            if (measure % 4 === 0 && beat16 === 0) this.spawnBeamAttack();
        }
        else if (measure < 32) {
            if (beat16 % 4 === 0) this.spawnPistonAttack();
            if (beat16 === 0) this.spawnBomb();
        }
        else if (measure < 40) {
            if (beat16 % 1 === 0) this.spawnRain();
        }
        else if (measure < 56) {
            this.climaxBorderActive = true;
            if (beat16 % 4 === 0) {
                if (measure % 4 === 2) this.spawnLaserArray();
                else this.spawnBeamAttack();
            }
            if (measure % 2 === 0 && beat16 === 0) this.spawnSnake();
            if (beat16 % 2 === 0) this.spawnSideBullet(600);
        }
    }

    // ==========================================
    // LEVEL 2: Velocity
    // ==========================================
    updateLevel2(measure, beat16) {

        if (measure < 8) {
            if (measure >= 1) {
                if (beat16 % 4 === 0) {
                    this.burstAngle += 0.2;
                    this.spawnRadialWarning(this.game.width / 2, this.game.height / 2, this.burstAngle);
                }
                if (beat16 % 4 === 2) {
                    this.spawnTrailBurst(this.game.width / 2, this.game.height / 2, this.burstAngle);
                }
            }
        }
        else if (measure < 16) {
            this.targetScrollSpeed = 200;
            if (beat16 % 4 === 0) this.spawnVerticalWall();
        }
        else if (measure < 32) {
            this.targetScrollSpeed = 800;
            const isFirst = (measure === 16 && beat16 === 0);
            if (measure < 30 && !isFirst) {
                if (beat16 % 4 === 0) this.spawnVerticalWall();
            }
            if (beat16 === 0) this.spawnPistonAttack();
        }
        else if (measure < 40) {
            this.targetScrollSpeed = 0;
            if (measure >= 31 && beat16 % 2 === 0) this.spawnRain();
        }
        else if (measure < 48) {
            if (measure === 40 && beat16 === 0 && this.laneGuides.length === 0) {
                this.spawnLaneGuides();
            }
            this.targetScrollSpeed = 0;
            if (beat16 % 8 === 0) {
                this.spawnGridBeam();
                this.spawnSideRain();
            }
        }
        else if (measure < 56) {
            // Ver 3.0: Grid fade out earlier
            if (measure === 48 && beat16 === 0) {
                this.releaseLaneGuides();
            }

            this.targetScrollSpeed = 1000;
            if (beat16 === 0) this.spawnRightBomb();

            if (beat16 % 4 === 0) {
                this.spawnHorizontalTrail();
            }
        }
        // Music ends around M57 now
    }

    // ... (Helpers)

    render(ctx) {
        if (this.pulseBg) this.pulseBg.render(ctx);
        if (this.climaxBorderActive && this.levelId === 1) {
            ctx.fillStyle = '#ff3366';
            ctx.shadowBlur = 20;
            ctx.shadowColor = '#ff3366';
            ctx.fillRect(0, 0, this.game.width, 50);
            ctx.fillRect(0, this.game.height - 50, this.game.width, 50);
            ctx.shadowBlur = 0;
        }
        this.hazards.forEach(h => h.render(ctx));
    }

    checkCollisions(player) {
        for (const h of this.hazards) {
            if (h.checkCollision(player)) {
                player.takeDamage(h.x, h.y);
                if (h.type === 'bullet' || h.type === 'rain') {
                    this.game.particles.emit(h.x, h.y, h.color, 10, 100);
                    h.active = false;
                }
            }
        }
        if (this.climaxBorderActive && this.levelId === 1 && !player.invincible) {
            if (player.y < 50 || player.y + player.height > this.game.height - 50) {
                const borderY = player.y < 50 ? 25 : this.game.height - 25;
                player.takeDamage(player.x, borderY);
            }
        }
    }

    spawnSideBullet(speed = 400) {
        const y = Math.random() * (this.game.height - 100) + 50;
        this.hazards.push(new Bullet(this.game.width + 50, y, -speed, 0));
    }
    spawnSmallFastBullet() {
        const y = Math.random() * (this.game.height - 100) + 50;
        this.hazards.push(new Bullet(this.game.width + 50, y, -700, 0, 8));
    }
    spawnTopBullet() {
        const x = Math.random() * (this.game.width - 100) + 50;
        this.hazards.push(new Bullet(x, -50, 0, 400));
    }
    spawnBeamAttack() {
        const y = Math.random() * (this.game.height - 200) + 100;
        this.hazards.push(new Beam(0, y, this.game.width, 100, 0.43, 0.8));
    }
    spawnRain() {
        const x = Math.random() * this.game.width;
        const vx = (Math.random() - 0.5) * 200;
        this.hazards.push(new RainBullet(x, -50, vx, 100, 10));
    }
    spawnBomb() {
        const minX = this.game.width * 0.75;
        const x = Math.random() * (this.game.width - minX) + minX - 50;
        const y = Math.random() * (this.game.height - 200) + 100;
        const startX = this.game.width + 50;
        const startY = y;
        const beatDur = 60.0 / this.game.audio.bpm;
        this.hazards.push(new Bomb(x, y, startX, startY, beatDur, this.game));
    }
    spawnSnake() {
        const path = [];
        const numPoints = 20;
        const stepX = this.game.width / numPoints;
        const baseY = Math.random() * (this.game.height * 0.6) + (this.game.height * 0.2);
        const amplitude = 100;
        const freq = 0.2;
        for (let i = 0; i < numPoints + 5; i++) {
            path.push({
                x: i * stepX,
                y: baseY + Math.sin(i * freq) * amplitude
            });
        }
        if (Math.random() > 0.5) {
            path.reverse();
            path.forEach(p => p.x += 100);
        } else {
            path.forEach(p => p.x -= 100);
        }
        this.hazards.push(new Snake(path, 800, 15));
    }
    spawnPistonAttack() {
        const isTop = Math.random() > 0.5;
        const x = Math.random() * (this.game.width - 100) + 50;
        const w = 60;
        const h = 50;
        let startY, dirY;
        if (isTop) {
            startY = -40; // Visible tip
            dirY = 1;
        } else {
            startY = this.game.height - 10; // Visible tip
            dirY = -1;
        }
        const speed = 1500;
        const extend = this.game.height;
        this.hazards.push(new Piston(this.game, x, startY, w, h, 0, dirY, speed, extend));
    }
    spawnLaserArray() {
        for (let i = 0; i < 5; i++) {
            const y = (this.game.height / 5) * i + 50;
            this.hazards.push(new Beam(0, y, this.game.width, 30, 0.43, 0.6));
        }
    }

    spawnRadialWarning(x, y, angleOffset) {
        this.hazards.push(new RadialWarning(x, y, 8, angleOffset, 0.4)); // 0.4s warning
    }

    spawnTrailBurst(x, y, angleOffset) {
        for (let i = 0; i < 8; i++) {
            const angle = (Math.PI * 2 / 8) * i + angleOffset;
            const speed = 600;
            const vx = Math.cos(angle) * speed;
            const vy = Math.sin(angle) * speed;
            this.hazards.push(new TrailBullet(x, y, vx, vy, 10));
        }
    }

    spawnVerticalWall() {
        this.wallCounter++;
        let gapY;

        if (this.wallCounter % 2 === 0) {
            const shift = (Math.random() - 0.5) * 400;
            gapY = this.lastGapY + shift;
            gapY = Math.max(100, Math.min(this.game.height - 100, gapY));
            this.lastGapY = gapY;
        } else {
            gapY = this.lastGapY;
        }

        let gapSize = 150;
        if (this.scrollSpeed > 600) gapSize = 220;

        for (let py = 0; py < this.game.height; py += 30) {
            if (py > gapY - gapSize / 2 && py < gapY + gapSize / 2) continue;
            this.hazards.push(new Bullet(this.game.width + 100, py, 0, 0, 20));
        }
    }

    spawnLaneGuides() {
        this.laneGuides = [];
        const h = this.game.height / 5;
        for (let i = 0; i < 5; i++) {
            const g = new LaneGuide(this.game, i * h, h);
            this.laneGuides.push(g);
            this.hazards.push(g);
        }
    }

    releaseLaneGuides() {
        this.laneGuides.forEach(g => g.ignoreScroll = false);
        this.laneGuides = [];
    }

    spawnGridBeam() {
        const warning = 0.67;
        const dur = 0.2;
        const lane = Math.floor(Math.random() * 5);
        const h = this.game.height / 5;
        const y = lane * h;
        const b = new Beam(0, y, this.game.width, h, dur, warning);
        b.ignoreScroll = true;
        this.hazards.push(b);
    }

    spawnSideRain() {
        for (let i = 0; i < 10; i++) {
            const x = this.game.width + Math.random() * 50;
            const y = Math.random() * this.game.height;
            const vx = - (200 + Math.random() * 300);
            const vy = (Math.random() - 0.5) * 200;
            this.hazards.push(new RainBullet(x, y, vx, vy, 10));
        }
    }

    spawnRightBomb() {
        const targetX = this.game.width - 150;
        const startX = this.game.width + 100;
        const y = Math.random() * (this.game.height - 200) + 100;
        const beatDur = 60.0 / this.game.audio.bpm;
        const bomb = new Bomb(targetX, y, startX, y, beatDur, this.game);
        bomb.ignoreScroll = true;
        this.hazards.push(bomb);
    }

    spawnHorizontalTrail() {
        for (let i = 0; i < 3; i++) { // Cluster of 3
            const y = Math.random() * this.game.height;
            const x = this.game.width + 50 + Math.random() * 200;
            const vx = -(800 + Math.random() * 400); // 800 - 1200 speed left
            const tb = new TrailBullet(x, y, vx, 0, 10);
            tb.ignoreScroll = true;
            this.hazards.push(tb);
        }
    }
}
