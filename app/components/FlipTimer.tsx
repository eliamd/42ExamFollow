'use client';

import { useState, useEffect } from 'react';
import FlipNumbers from 'react-flip-numbers';

interface FlipTimerProps {
  hours: number;
  minutes: number;
  seconds: number;
  isUrgent?: boolean;
}

export default function FlipTimer({
  hours,
  minutes,
  seconds,
  isUrgent = false
}: FlipTimerProps) {
  const [mounted, setMounted] = useState(false);

  // Pour éviter les erreurs d'hydratation
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="countdown-timer static-display">
        <div className="countdown-segment">
          <div className="countdown-number">
            {hours.toString().padStart(2, '0')}
          </div>
          <span className="countdown-label">heures</span>
        </div>
        <div className="countdown-divider">:</div>
        <div className="countdown-segment">
          <div className="countdown-number">
            {minutes.toString().padStart(2, '0')}
          </div>
          <span className="countdown-label">minutes</span>
        </div>
        <div className="countdown-divider">:</div>
        <div className="countdown-segment">
          <div className="countdown-number">
            {seconds.toString().padStart(2, '0')}
          </div>
          <span className="countdown-label">secondes</span>
        </div>
      </div>
    );
  }

  return (
    <div className="countdown-timer">
      <div className="countdown-segment">
        <div className="countdown-number-container">
          <FlipNumbers
            height={50}
            width={35}
            color=""
            background="transparent"
            play
            perspective={500}
            numbers={hours.toString().padStart(2, '0')}
            numberStyle={{ fontWeight: "500" }}
          />
        </div>
        <span className="countdown-label">heures</span>
      </div>
      <div className="countdown-divider">:</div>
      <div className="countdown-segment">
        <div className="countdown-number-container">
          <FlipNumbers
            height={50}
            width={35}
            color=""
            background="transparent"
            play
            perspective={500}
            numbers={minutes.toString().padStart(2, '0')}
            numberStyle={{ fontWeight: "500" }}
          />
        </div>
        <span className="countdown-label">minutes</span>
      </div>
      <div className="countdown-divider">:</div>
      <div className="countdown-segment">
        <div className="countdown-number-container">
          <FlipNumbers
            height={50}
            width={35}
            color=""
            background="transparent"
            play
            perspective={500}
            numbers={seconds.toString().padStart(2, '0')}
            numberStyle={{ fontWeight: "500" }}
          />
        </div>
        <span className="countdown-label">secondes</span>
      </div>
    </div>
  );
}
