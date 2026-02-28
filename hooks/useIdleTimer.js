import { useState, useEffect, useRef } from 'react';

/**
 * Custom hook to detect user idle.
 * @param {Object} options
 * @param {number} options.timeout - Total time in ms before idle (e.g. 15 mins)
 * @param {number} options.promptTimeout - Time in ms before warning (e.g. 14 mins)
 * @param {Function} options.onIdle - Action to run when timeout is reached
 * @param {Function} options.onActive - (Optional) Action when user becomes active
 * @param {Function} options.onPrompt - (Optional) Action when warning threshold reached
 */
const useIdleTimer = ({
    timeout = 900000,        // 15 minutes default
    promptTimeout = 840000,  // 14 minutes default
    onIdle,
    onActive,
    onPrompt
}) => {
    const [isPrompted, setIsPrompted] = useState(false);
    const [isIdle, setIsIdle] = useState(false);
    const [remaining, setRemaining] = useState(0);

    // Refs to keep track without re-renders
    const lastActiveRef = useRef(Date.now());
    const timerRef = useRef(null);
    const promptIntervalRef = useRef(null);

    const startTimer = () => {
        // Clear existing
        if (timerRef.current) clearInterval(timerRef.current);
        if (promptIntervalRef.current) clearInterval(promptIntervalRef.current);

        // Check every second for precision (or 5s for perf)
        timerRef.current = setInterval(() => {
            const now = Date.now();
            const elapsed = now - lastActiveRef.current;

            // 1. Timeout (Forced Logout)
            if (elapsed >= timeout) {
                setIsIdle(true);
                if (onIdle && !isIdle) onIdle(); // Only call once
                clearInterval(timerRef.current);
                clearInterval(promptIntervalRef.current);
            }
            // 2. Prompt (Warning)
            else if (elapsed >= promptTimeout) {
                if (!isPrompted) {
                    setIsPrompted(true);
                    if (onPrompt) onPrompt();
                }
                // Update countdown for UI
                setRemaining(Math.ceil((timeout - elapsed) / 1000));
            }
        }, 1000);
    };

    const handleActivity = () => {
        // If already idle, don't auto-reset (requires manual re-login usually)
        // But here, if we are just "prompted", we SHOULD reset.
        // If we are "idle" (timed out), we usually can't recover without login.

        if (isIdle) return; // Do nothing if already fully timed out

        lastActiveRef.current = Date.now();

        // If we were prompted, clear it
        if (isPrompted) {
            setIsPrompted(false);
            if (onActive) onActive(); // User came back
        }
    };

    // Throttle activity handler (run max once every 1s)
    const throttleRef = useRef(null);
    const throttledActivityHandler = () => {
        if (!throttleRef.current) {
            handleActivity();
            throttleRef.current = setTimeout(() => {
                throttleRef.current = null;
            }, 1000);
        }
    };

    useEffect(() => {
        const events = ['mousemove', 'keydown', 'wheel', 'DOMMouseScroll', 'touchstart', 'click'];

        // Attach listeners
        events.forEach(event => {
            window.addEventListener(event, throttledActivityHandler);
        });

        startTimer();

        return () => {
            // Cleanup
            events.forEach(event => {
                window.removeEventListener(event, throttledActivityHandler);
            });
            if (timerRef.current) clearInterval(timerRef.current);
            if (promptIntervalRef.current) clearInterval(promptIntervalRef.current);
            if (throttleRef.current) clearTimeout(throttleRef.current);
        };
    }, [timeout, promptTimeout, onIdle, onActive, onPrompt, isIdle, isPrompted]);

    return {
        isIdle,
        isPrompted,
        remaining
    };
};

export default useIdleTimer;
