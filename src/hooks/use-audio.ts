import { useRef, useCallback, useEffect } from 'react';

// Maps sound names to paths in the public directory
const SOUNDS = {
    click: '/sounds/click.mp3',
    submit: '/sounds/submit.mp3',
    success: '/sounds/success.mp3',
    error: '/sounds/error.mp3',
    alarm: '/sounds/alarm.mp3',
};

type SoundName = keyof typeof SOUNDS;

export const useAudio = () => {
    // Store audio instances so we can control them (e.g., stop looping alarms)
    const audioRefs = useRef<{ [key in SoundName]?: HTMLAudioElement }>({});

    // Preload sounds on mount
    useEffect(() => {
        Object.entries(SOUNDS).forEach(([name, path]) => {
            const audio = new Audio(path);
            audio.preload = 'auto'; // Suggest that the browser preloads the audio
            audioRefs.current[name as SoundName] = audio;
        });

        return () => {
            // Cleanup: stop any playing sounds when component unmounts
            Object.values(audioRefs.current).forEach(audio => {
                if (audio) {
                    audio.pause();
                    audio.src = '';
                }
            });
        };
    }, []);

    const play = useCallback((name: SoundName, options?: { volume?: number; loop?: boolean }) => {
        try {
            const audio = audioRefs.current[name];
            if (!audio) return;

            // Reset the current time so rapid clicks play the sound from the start
            audio.currentTime = 0;

            if (options?.volume !== undefined) {
                audio.volume = options.volume;
            }

            if (options?.loop !== undefined) {
                audio.loop = options.loop;
            }

            // Play returns a Promise which can reject if the user hasn't interacted with the document yet
            audio.play().catch(e => {
                // Browser prevented autoplay or there was a loading error
                console.warn(`Could not play sound "${name}":`, e.message);
            });
        } catch (e) {
            console.warn(`Error playing sound "${name}":`, e);
        }
    }, []);

    const stop = useCallback((name: SoundName) => {
        try {
            const audio = audioRefs.current[name];
            if (audio) {
                audio.pause();
                audio.currentTime = 0;
            }
        } catch (e) {
            console.warn(`Error stopping sound "${name}":`, e);
        }
    }, []);

    const stopAll = useCallback(() => {
        Object.values(audioRefs.current).forEach(audio => {
            if (audio) {
                audio.pause();
                audio.currentTime = 0;
            }
        });
    }, []);

    return { play, stop, stopAll };
};
