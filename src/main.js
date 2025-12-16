import { Engine } from './Engine.js?v=4.1';

window.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('game-canvas');
    console.log("Main script loaded. Canvas:", canvas);

    window.onerror = function (message, source, lineno, colno, error) {
        console.error(error);
        const errDiv = document.createElement('div');
        errDiv.style.position = 'absolute';
        errDiv.style.top = '0';
        errDiv.style.left = '0';
        errDiv.style.color = 'red';
        errDiv.style.backgroundColor = 'rgba(0,0,0,0.8)';
        errDiv.style.padding = '20px';
        errDiv.style.zIndex = '9999';
        errDiv.innerText = `Error: ${message} at ${source}:${lineno}`;
        document.body.appendChild(errDiv);
    };

    const engine = new Engine('4.1');
    // engine.start(); // Auto-started in constructor
});
