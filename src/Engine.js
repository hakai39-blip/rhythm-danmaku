import { Player } from './Player.js?v=4.1';
import { Level } from './Level.js?v=4.1';
import { AudioController } from './Audio.js?v=4.1';
import { ParticleSystem } from './Particles.js?v=4.1';

export class Engine {
    constructor(version = '4.1') {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');

        // Set Canvas Size (Full Screen)
        this.resize();
        window.addEventListener('resize', () => this.resize());

        this.version = version;

        // States
        this.state = 'START'; // START, SELECT, PLAYING, PAUSED, GAME_OVER, VICTORY
        this.currentLevelId = 1;

        // Entities
        this.player = new Player(this);
        this.level = new Level(this);
        this.audio = new AudioController();
        this.particles = new ParticleSystem();

        // Shake
        this.shakeTimer = 0;
        this.shakeIntensity = 0;

        // Pause Menu
        this.pauseSelection = 0; // 0: Restart, 1: Title, 2: Select
        this.pauseOptions = ['RESTART', 'TITLE', 'SELECT'];

        // Stage Select
        this.selectedStage = 1;

        // Input
        this.keys = {};
        window.addEventListener('keydown', e => {
            if (e.repeat) return; // distinct presses for menu
            this.handleInput(e.code);
        });
        window.addEventListener('keyup', e => this.keys[e.code] = false);

        // UI Binding
        this.startScreen = document.getElementById('start-screen');
        this.selectScreen = document.getElementById('select-screen');

        // Setup Stage Select Buttons
        if (this.selectScreen) {
            const btn1 = document.getElementById('btn-stage1');
            const btn2 = document.getElementById('btn-stage2');
            const btn3 = document.getElementById('btn-stage3');
            btn1.onclick = () => { this.selectedStage = 1; this.updateSelectUI(); this.startLevel(1); };
            btn2.onclick = () => { this.selectedStage = 2; this.updateSelectUI(); this.startLevel(2); };
            if (btn3) btn3.onclick = () => { this.selectedStage = 3; this.updateSelectUI(); this.startLevel(3); };
        }

        // Loop
        this.lastTime = 0;
        this.loop = (time) => {
            const dt = (time - this.lastTime) / 1000;
            this.lastTime = time;
            this.update(Math.min(dt, 0.1));
            this.render();
            requestAnimationFrame(this.loop);
        };
        requestAnimationFrame(this.loop);
    }

    resize() {
        // Requested width: 1400px
        this.canvas.width = 1400;
        this.canvas.height = 700;
        this.width = this.canvas.width;
        this.height = this.canvas.height;
    }

    triggerShake(amount) {
        this.shakeIntensity = amount;
        this.shakeTimer = 0.2;
    }

    handleInput(key) {
        if (this.state === 'START' && (key === 'Space' || key === 'Enter')) {
            this.state = 'SELECT';
            this.audio.init();
            this.updateSelectUI();
        }
        else if (this.state === 'SELECT') {
            if (key === 'ArrowUp') {
                this.selectedStage--;
                if (this.selectedStage < 1) this.selectedStage = 3;
                this.updateSelectUI();
            }
            if (key === 'ArrowDown') {
                this.selectedStage++;
                if (this.selectedStage > 3) this.selectedStage = 1;
                this.updateSelectUI();
            }
            if (key === 'Space' || key === 'Enter') {
                this.startLevel(this.selectedStage);
            }
        }
        else if (this.state === 'PLAYING') {
            if (key === 'KeyT') {
                this.state = 'PAUSED';
                this.audio.pause();
            }
        }
        else if (this.state === 'PAUSED') {
            if (key === 'KeyT') {
                this.state = 'PLAYING';
                this.audio.resume();
            }
            if (key === 'ArrowUp') {
                this.pauseSelection = (this.pauseSelection - 1 + 3) % 3;
            }
            if (key === 'ArrowDown') {
                this.pauseSelection = (this.pauseSelection + 1) % 3;
            }
            if (key === 'Space' || key === 'Enter') {
                this.executePauseOption();
            }
        }
        else if (this.state === 'GAME_OVER' || this.state === 'VICTORY') {
            if (key === 'Space' || key === 'Enter' || key === 'Escape') {
                this.resetToSelect();
            }
        }
    }

    executePauseOption() {
        const option = this.pauseOptions[this.pauseSelection];
        if (option === 'RESTART') {
            this.startLevel(this.currentLevelId);
        } else if (option === 'SELECT') {
            this.resetToSelect();
        } else if (option === 'TITLE') {
            this.resetToTitle();
        }
    }

    resetToTitle() {
        this.state = 'START';
        this.audio.stop();
    }

    updateSelectUI() {
        const btn1 = document.getElementById('btn-stage1');
        const btn2 = document.getElementById('btn-stage2');
        const btn3 = document.getElementById('btn-stage3');

        btn1.classList.remove('selected');
        btn2.classList.remove('selected');
        if (btn3) btn3.classList.remove('selected');

        if (this.selectedStage === 1) btn1.classList.add('selected');
        else if (this.selectedStage === 2) btn2.classList.add('selected');
        else if (this.selectedStage === 3 && btn3) btn3.classList.add('selected');
    }

    startLevel(id) {
        this.currentLevelId = id;
        this.state = 'PLAYING';
        this.level.setLevel(id);
        this.player.reset();
        this.audio.setSong(id);
        this.audio.play();
        this.particles.reset();
        this.pauseSelection = 0; // Reset cursor
    }

    resetToSelect() {
        this.state = 'SELECT';
        this.audio.stop();
    }

    gameOver() {
        this.state = 'GAME_OVER';
        this.audio.stop();
        this.triggerShake(20);
    }

    victory() {
        this.state = 'VICTORY';
    }

    update(dt) {
        if (this.state === 'PLAYING') {
            this.player.update(dt);
            this.level.update(dt);
            this.level.checkCollisions(this.player);
            this.particles.update(dt);
        }
        // ... (Shake timer updates even if paused? Maybe not. Let's keep it running for visual juice) ...
        if (this.shakeTimer > 0) {
            this.shakeTimer -= dt;
            if (this.shakeTimer <= 0) this.shakeIntensity = 0;
        }
    }

    render() {
        this.ctx.fillStyle = '#111';
        this.ctx.fillRect(0, 0, this.width, this.height);

        // Screen Shake
        this.ctx.save();
        if (this.shakeIntensity > 0) {
            const dx = (Math.random() - 0.5) * this.shakeIntensity;
            const dy = (Math.random() - 0.5) * this.shakeIntensity;
            this.ctx.translate(dx, dy);
        }

        if (this.state === 'START') {
            this.startScreen.style.display = 'flex';
            this.selectScreen.style.display = 'none';
        }
        else if (this.state === 'SELECT') {
            this.startScreen.style.display = 'none';
            this.selectScreen.style.display = 'flex';
        }
        else {
            this.startScreen.style.display = 'none';
            this.selectScreen.style.display = 'none';

            this.level.render(this.ctx);
            if (this.state !== 'GAME_OVER') {
                this.player.render(this.ctx);
            }
            this.particles.render(this.ctx);

            // Progress
            if (this.state === 'PLAYING' || this.state === 'PAUSED') {
                const progress = this.audio.measure / (this.currentLevelId === 1 ? 56 : 64);
                this.ctx.fillStyle = '#222';
                this.ctx.fillRect(0, 0, this.width, 10);
                this.ctx.fillStyle = '#00ffff'; // Cyan for visibility
                this.ctx.fillRect(0, 0, this.width * Math.min(progress, 1), 10);
            }

            if (this.state === 'PAUSED') {
                this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
                this.ctx.fillRect(0, 0, this.width, this.height);

                this.ctx.textAlign = 'center';
                this.ctx.font = '50px "Orbitron"';
                this.ctx.fillStyle = '#fff';
                this.ctx.fillText('-- PAUSE --', this.width / 2, this.height / 2 - 100);

                this.ctx.font = '30px "Orbitron"';
                this.pauseOptions.forEach((opt, i) => {
                    if (i === this.pauseSelection) {
                        this.ctx.fillStyle = '#00ffff';
                        this.ctx.fillText('> ' + opt + ' <', this.width / 2, this.height / 2 + i * 50);
                    } else {
                        this.ctx.fillStyle = '#aaa';
                        this.ctx.fillText(opt, this.width / 2, this.height / 2 + i * 50);
                    }
                });
            }

            if (this.state === 'GAME_OVER') {
                this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
                this.ctx.fillRect(0, 0, this.width, this.height);

                this.ctx.textAlign = 'center';
                this.ctx.fillStyle = '#ff3366';
                this.ctx.font = '80px "Orbitron"';
                this.ctx.fillText('GAME OVER', this.width / 2, this.height / 2 - 50);

                this.ctx.font = '30px "Orbitron"';
                this.ctx.fillStyle = '#fff';
                this.ctx.fillText('PRESS SPACE TO RETRY', this.width / 2, this.height / 2 + 20);
                this.ctx.font = '20px "Orbitron"';
                this.ctx.fillStyle = '#aaa';
                this.ctx.fillText('PRESS ESC TO SELECT', this.width / 2, this.height / 2 + 60);
            }

            if (this.state === 'VICTORY') {
                this.ctx.textAlign = 'center';
                this.ctx.fillStyle = '#33ccff';
                this.ctx.font = '80px "Orbitron"';
                this.ctx.fillText('VICTORY', this.width / 2, this.height / 2 - 50);

                this.ctx.font = '30px "Orbitron"';
                this.ctx.fillStyle = '#fff';
                this.ctx.fillText('PRESS SPACE TO CONTINUE', this.width / 2, this.height / 2 + 20);
                this.ctx.font = '20px "Orbitron"';
                this.ctx.fillStyle = '#aaa';
                this.ctx.fillText('PRESS ESC TO SELECT', this.width / 2, this.height / 2 + 60);
            }
        }
        this.ctx.restore();
    }
}
