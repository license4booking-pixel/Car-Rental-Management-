import React, { useEffect, useState } from 'react';

export default function RenterTracker() {
    const [isTracking, setIsTracking] = useState(false);
    const vehicleId = "TX-9011"; // Dynamically pass this based on URL parameters later
    const [wakeLock, setWakeLock] = useState<WakeLockSentinel | null>(null);

    // Request wake lock to prevent screen from sleeping
    const requestWakeLock = async () => {
        if ('wakeLock' in navigator) {
            try {
                const lock = await navigator.wakeLock.request('screen');
                setWakeLock(lock);
            } catch (err: any) {
                if (err.name === 'NotAllowedError') {
                    // Silently ignore if disallowed by permissions or policy
                } else {
                    console.error("Wake Lock request failed:", err);
                }
            }
        }
    };

    const disableWakeLock = async () => {
        if (wakeLock !== null) {
            await wakeLock.release();
            setWakeLock(null);
        }
    };

    useEffect(() => {
        let watchId: number | null = null;
        let audio: HTMLAudioElement | null = null;
        
        // Setup silent audio element for background continuity
        try {
            audio = new Audio('data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA');
            audio.loop = true;
            audio.volume = 0;
        } catch (e) {
            console.error("Silent audio init failed:", e);
        }
        
        async function telemetryLoop() {
            // Support scenarios where geolocation API might not be readily available
            if (!navigator.geolocation) return;

            navigator.geolocation.getCurrentPosition(async (position) => {
                const { latitude, longitude, speed, heading } = position.coords;

                try {
                    // Sync with server and capture the admin's mandatory status
                    const response = await fetch('/api/renter/ping', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ 
                            vehicleId, 
                            lat: latitude, 
                            lng: longitude,
                            speed: speed ? (speed * 3.6).toFixed(1) : undefined,
                            heading: heading || undefined 
                        })
                    });
                    const data = await response.json();

                    // If admin turns it on and we aren't tracking natively yet, spin up watchPosition
                    if (data.trackingActive && !watchId) {
                        setIsTracking(true);
                        requestWakeLock();
                        
                        // Play silent audio to try to persist background processing
                        if (audio) {
                            audio.play().catch(e => console.error("Audio play blocked:", e));
                        }

                        watchId = navigator.geolocation.watchPosition((pos) => {
                            fetch('/api/renter/ping', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ 
                                    vehicleId, 
                                    lat: pos.coords.latitude, 
                                    lng: pos.coords.longitude,
                                    speed: pos.coords.speed ? (pos.coords.speed * 3.6).toFixed(1) : undefined,
                                    heading: pos.coords.heading || undefined
                                })
                            });
                        }, null, { enableHighAccuracy: true });
                    } 
                    // If admin turns it off, clear the native watch process completely
                    else if (!data.trackingActive && watchId) {
                        navigator.geolocation.clearWatch(watchId);
                        watchId = null;
                        setIsTracking(false);
                        disableWakeLock();
                        
                        if (audio) {
                            audio.pause();
                        }
                    }
                } catch (e) {
                    console.error("Telemetry error", e);
                }
            }, (error) => {
                console.error("Geolocation error", error);
            });
        }

        // Run this check loop every 10 seconds to look for admin override changes
        const interval = setInterval(telemetryLoop, 10000);
        
        // Initial ping immediately
        telemetryLoop();

        return () => {
            clearInterval(interval);
            if (watchId) navigator.geolocation.clearWatch(watchId);
            disableWakeLock();
            if (audio) audio.pause();
        };
    }, []);

    // Handle visibility changes for wake lock
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (wakeLock !== null && document.visibilityState === 'visible') {
                requestWakeLock();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, [wakeLock]);


    return (
        <div className="min-h-screen bg-neutral-900 text-white flex flex-col items-center justify-center p-6 fade-in duration-700 animate-in">
            <h2 className="text-xl font-bold tracking-wide text-blue-500 italic">PHILLY RENTAL SYS</h2>
            <div className="mt-8 text-center p-6 bg-neutral-800 rounded-2xl border border-neutral-700 w-full max-w-sm">
                <p className="text-sm text-neutral-400">Rental Active Session</p>
                <div className="mt-4 flex items-center justify-center gap-2">
                    <span className={`h-3 w-3 rounded-full ${isTracking ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}></span>
                    <span className="font-medium">{isTracking ? "Secure Telematics Active" : "Waiting for System Sync..."}</span>
                </div>
            </div>
            {isTracking && (
                <div className="mt-8">
                    <p className="text-center text-[10px] text-zinc-600 font-bold uppercase tracking-widest">
                        Device connection maintained
                    </p>
                </div>
            )}
        </div>
    );
}
