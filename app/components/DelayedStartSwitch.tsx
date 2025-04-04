'use client';

import { useState, useEffect } from 'react';
import { ClockIcon } from '@heroicons/react/24/outline';

interface DelayedStartSwitchProps {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  startTime: Date | null;
  onStartTimeChange: (date: Date | null) => void;
}

export default function DelayedStartSwitch({
  enabled,
  onToggle,
  startTime,
  onStartTimeChange
}: DelayedStartSwitchProps) {
  // État local pour gérer l'affichage du sélecteur de temps
  const [showTimePicker, setShowTimePicker] = useState(false);

  // Initialiser avec l'heure actuelle + 15 minutes par défaut si non défini
  useEffect(() => {
    if (enabled && !startTime) {
      const defaultTime = new Date();
      defaultTime.setMinutes(defaultTime.getMinutes() + 15);
      onStartTimeChange(defaultTime);
    }
  }, [enabled, startTime, onStartTimeChange]);

  // Gérer les changements d'heure et de minutes
  const handleHourChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (!startTime) return;

    const newDate = new Date(startTime);
    newDate.setHours(parseInt(e.target.value));
    onStartTimeChange(newDate);
  };

  const handleMinuteChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (!startTime) return;

    const newDate = new Date(startTime);
    newDate.setMinutes(parseInt(e.target.value));
    onStartTimeChange(newDate);
  };

  // Formater l'heure pour l'affichage
  const formatTime = (date: Date | null) => {
    if (!date) return '--:--';

    return date.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="delayed-start-container">
      <div className="delayed-start-header">
        <div className="switch-container">
          <label className="switch">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => onToggle(e.target.checked)}
            />
            <span className="slider round"></span>
          </label>
          <span className="switch-label">Départ différé</span>
        </div>

        {enabled && (
          <button
            className="time-selector-button"
            onClick={() => setShowTimePicker(!showTimePicker)}
          >
            <ClockIcon className="time-selector-icon" />
            <span>{formatTime(startTime)}</span>
          </button>
        )}
      </div>

      {enabled && showTimePicker && (
        <div className="time-picker-container">
          <div className="time-picker-header">
            <h4>Heure de début de l'examen</h4>
          </div>
          <div className="time-picker-content">
            <div className="time-selector">
              <label>Heure:</label>
              <select
                value={startTime?.getHours() || 0}
                onChange={handleHourChange}
              >
                {Array.from({ length: 24 }, (_, i) => (
                  <option key={`hour-${i}`} value={i}>
                    {i.toString().padStart(2, '0')}
                  </option>
                ))}
              </select>
            </div>
            <div className="time-selector">
              <label>Minutes:</label>
              <select
                value={startTime?.getMinutes() || 0}
                onChange={handleMinuteChange}
              >
                {Array.from({ length: 60 }, (_, i) => (
                  <option key={`minute-${i}`} value={i}>
                    {i.toString().padStart(2, '0')}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
