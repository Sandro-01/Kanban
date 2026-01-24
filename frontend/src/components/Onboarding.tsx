import React, { useEffect, useState } from 'react';
import { onboarding as onboardingApi } from '../services/api';
import './ProcessList.css';

interface OnboardingProps {
  user: any;
}

const Onboarding: React.FC<OnboardingProps> = ({ user }) => {
  const [onboardings, setOnboardings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOnboarding, setSelectedOnboarding] = useState<any>(null);

  useEffect(() => {
    loadOnboardings();
  }, []);

  const loadOnboardings = async () => {
    try {
      const response = await onboardingApi.getAll();
      setOnboardings(response.data);
    } catch (error) {
      console.error('Errore caricamento onboarding:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleTask = async (onboardingId: string, taskId: string, completed: boolean) => {
    try {
      await onboardingApi.updateTask(onboardingId, taskId, completed);
      loadOnboardings();
      if (selectedOnboarding) {
        const updated = await onboardingApi.get(selectedOnboarding.id);
        setSelectedOnboarding(updated.data);
      }
    } catch (error) {
      console.error('Errore aggiornamento task:', error);
    }
  };

  const getProgress = (onb: any) => {
    const total = onb.tasks.length;
    const completed = onb.tasks.filter((t: any) => t.completed).length;
    return (completed / total) * 100;
  };

  if (loading) {
    return <div className="loading">Caricamento...</div>;
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>Onboarding</h1>
        <p>Gestisci i processi di onboarding per nuovi dipendenti</p>
      </div>

      <div className="alert alert-info">
        <strong>ISO 9001 Compliance:</strong> Tutti i processi di onboarding sono tracciati e auditati.
        Le checklist garantiscono l'uniformità del processo.
      </div>

      <div className="process-grid">
        {onboardings.map((onb) => (
          <div
            key={onb.id}
            className={`process-card ${onb.status.toLowerCase()}`}
            onClick={() => setSelectedOnboarding(onb)}
          >
            <div className="process-header">
              <h3>
                {onb.user.firstName} {onb.user.lastName}
              </h3>
              <span className={`status-badge status-${onb.status.toLowerCase()}`}>
                {onb.status}
              </span>
            </div>

            <div className="process-info">
              <div className="info-row">
                <span>👤 Manager:</span>
                <span>
                  {onb.manager.firstName} {onb.manager.lastName}
                </span>
              </div>
              <div className="info-row">
                <span>📅 Inizio:</span>
                <span>{new Date(onb.startDate).toLocaleDateString('it-IT')}</span>
              </div>
              <div className="info-row">
                <span>⏰ Scadenza:</span>
                <span>{new Date(onb.expectedEndDate).toLocaleDateString('it-IT')}</span>
              </div>
            </div>

            <div className="progress-section">
              <div className="progress-header">
                <span>Progresso</span>
                <span>{Math.round(getProgress(onb))}%</span>
              </div>
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${getProgress(onb)}%` }}
                />
              </div>
            </div>

            <div className="task-summary">
              {onb.tasks.filter((t: any) => t.completed).length} / {onb.tasks.length} task completati
            </div>
          </div>
        ))}

        {onboardings.length === 0 && (
          <div className="empty-state">
            <h3>Nessun onboarding attivo</h3>
            <p>I processi di onboarding appariranno qui</p>
          </div>
        )}
      </div>

      {selectedOnboarding && (
        <div className="modal-overlay" onClick={() => setSelectedOnboarding(null)}>
          <div className="modal process-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2>
                  Onboarding: {selectedOnboarding.user.firstName}{' '}
                  {selectedOnboarding.user.lastName}
                </h2>
                <span className={`status-badge status-${selectedOnboarding.status.toLowerCase()}`}>
                  {selectedOnboarding.status}
                </span>
              </div>
              <button className="close-btn" onClick={() => setSelectedOnboarding(null)}>
                ×
              </button>
            </div>

            <div className="modal-content">
              <div className="process-details">
                <div className="detail-item">
                  <strong>Email:</strong> {selectedOnboarding.user.email}
                </div>
                <div className="detail-item">
                  <strong>Manager:</strong> {selectedOnboarding.manager.firstName}{' '}
                  {selectedOnboarding.manager.lastName}
                </div>
                <div className="detail-item">
                  <strong>Data Inizio:</strong>{' '}
                  {new Date(selectedOnboarding.startDate).toLocaleDateString('it-IT')}
                </div>
                <div className="detail-item">
                  <strong>Data Prevista Fine:</strong>{' '}
                  {new Date(selectedOnboarding.expectedEndDate).toLocaleDateString('it-IT')}
                </div>
                {selectedOnboarding.actualEndDate && (
                  <div className="detail-item">
                    <strong>Data Effettiva Fine:</strong>{' '}
                    {new Date(selectedOnboarding.actualEndDate).toLocaleDateString('it-IT')}
                  </div>
                )}
              </div>

              <div className="tasks-section">
                <h3>Checklist Onboarding</h3>
                {selectedOnboarding.tasks
                  .sort((a: any, b: any) => a.order - b.order)
                  .map((task: any) => (
                    <div key={task.id} className={`task-item ${task.completed ? 'completed' : ''}`}>
                      <div className="task-checkbox">
                        <input
                          type="checkbox"
                          checked={task.completed}
                          onChange={(e) =>
                            handleToggleTask(
                              selectedOnboarding.id,
                              task.id,
                              e.target.checked
                            )
                          }
                          disabled={selectedOnboarding.status === 'COMPLETED'}
                        />
                      </div>
                      <div className="task-content">
                        <div className="task-title">
                          {task.title}
                          {task.mandatory && <span className="mandatory-badge">Obbligatorio</span>}
                        </div>
                        <div className="task-description">{task.description}</div>
                        {task.completed && task.completedAt && (
                          <div className="task-completed-date">
                            ✓ Completato il{' '}
                            {new Date(task.completedAt).toLocaleDateString('it-IT')}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Onboarding;
