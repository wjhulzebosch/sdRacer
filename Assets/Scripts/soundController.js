// Sound Controller for sdRacer
// Provides a centralized way to manage and play game sounds

class SoundController {
    constructor() {
        this.sounds = {};
        this.isMuted = false;
        this.volume = 0.7; // Default volume (0.0 to 1.0)
        this.audioContext = null;
        this.initialized = false;
        
        // Initialize audio context on first user interaction
        this.initAudioContext();
    }

    // Initialize audio context (required for modern browsers)
    initAudioContext() {
        if (this.initialized) return;
        
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.initialized = true;
        } catch (error) {
            console.warn('AudioContext not supported:', error);
        }
    }

    // Resume audio context (required after user interaction)
    resumeAudioContext() {
        if (this.audioContext && this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
    }

    // Load a sound file
    loadSound(name, url) {
        return new Promise((resolve, reject) => {
            const audio = new Audio();
            audio.preload = 'auto';
            
            audio.addEventListener('canplaythrough', () => {
                this.sounds[name] = audio;
                resolve(audio);
            });
            
            audio.addEventListener('error', (error) => {
                console.error(`Failed to load sound '${name}':`, error);
                reject(error);
            });
            
            audio.src = url;
        });
    }

    // Play a sound by name
    playSound(name, options = {}) {
        if (this.isMuted) return;
        
        this.resumeAudioContext();
        
        const sound = this.sounds[name];
        if (!sound) {
            console.warn(`Sound '${name}' not found`);
            return;
        }

        // Clone the audio to allow overlapping sounds
        const soundClone = sound.cloneNode();
        
        // Apply options
        if (options.volume !== undefined) {
            soundClone.volume = Math.max(0, Math.min(1, options.volume * this.volume));
        } else {
            soundClone.volume = this.volume;
        }
        
        if (options.loop) {
            soundClone.loop = true;
        }
        
        // Play the sound
        soundClone.play().catch(error => {
            console.warn(`Failed to play sound '${name}':`, error);
        });
        
        return soundClone;
    }

    // Stop a specific sound
    stopSound(name) {
        const sound = this.sounds[name];
        if (sound) {
            sound.pause();
            sound.currentTime = 0;
        }
    }

    // Stop all sounds
    stopAllSounds() {
        Object.values(this.sounds).forEach(sound => {
            sound.pause();
            sound.currentTime = 0;
        });
    }

    // Set global volume
    setVolume(volume) {
        this.volume = Math.max(0, Math.min(1, volume));
    }

    // Mute/unmute all sounds
    setMuted(muted) {
        this.isMuted = muted;
        if (muted) {
            this.stopAllSounds();
        }
    }

    // Toggle mute
    toggleMute() {
        this.setMuted(!this.isMuted);
        return this.isMuted;
    }

    // Preload all game sounds
    async preloadGameSounds() {
        const soundFiles = {
            'carStart': 'Assets/Sounds/car_start.mp3',
            'carHorn': 'Assets/Sounds/car_horn.mp3',
            'carBeep': 'Assets/Sounds/car_beep.mp3',
            'cow': 'Assets/Sounds/cow.mp3'
        };

        const loadPromises = [];
        
        for (const [name, url] of Object.entries(soundFiles)) {
            loadPromises.push(
                this.loadSound(name, url).catch(error => {
                    console.warn(`Could not load sound '${name}':`, error);
                })
            );
        }

        try {
            await Promise.all(loadPromises);
            console.log('Game sounds preloaded successfully');
        } catch (error) {
            console.warn('Some sounds failed to load:', error);
        }
    }

    // Convenience methods for specific game sounds
    playCarStart() {
        return this.playSound('carStart');
    }

    playCarHorn() {
        return this.playSound('carHorn');
    }

    playCarBeep() {
        return this.playSound('carBeep');
    }

    playCow() {
        return this.playSound('cow');
    }
}

// Create global sound controller instance
const soundController = new SoundController();

// Initialize sounds when the page loads
document.addEventListener('DOMContentLoaded', () => {
    // Preload sounds after a short delay to ensure page is ready
    setTimeout(() => {
        soundController.preloadGameSounds();
    }, 100);
});

// Resume audio context on first user interaction
document.addEventListener('click', () => {
    soundController.resumeAudioContext();
}, { once: true });

document.addEventListener('keydown', () => {
    soundController.resumeAudioContext();
}, { once: true });

export default SoundController;
export { soundController }; 