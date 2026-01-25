import React, { useEffect, useState } from 'react';
import { onboarding as onboardingApi, users as usersApi } from '../services/api';
import './ProcessList.css';

interface OnboardingProps {
  user: any;
}

const Onboarding: React.FC<OnboardingProps> = ({ user }) => {
  const [onboardings, setOnboardings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOnboarding, setSelectedOnboarding] = useState<any>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [allUsers, setAllUsers] = useState<any[]>([]);

  useEffect(() => {
    loadOnboardings();
    loadUsers();
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

  const loadUsers = async () => {
    try {
      const response = await usersApi.getAll();
      setAllUsers(response.data);
    } catch (error) {
      console.error('Errore caricamento utenti:', error);
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
        <button
          className="btn btn-primary"
          onClick={() => setShowNewForm(true)}
          style={{ marginLeft: 'auto' }}
        >
          + Nuovo Onboarding
        </button>
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

      {showNewForm && (
        <NewOnboardingModal
          allUsers={allUsers}
          currentUser={user}
          onClose={() => setShowNewForm(false)}
          onCreated={loadOnboardings}
        />
      )}
    </div>
  );
};

// Modal per creare nuovo onboarding
const NewOnboardingModal: React.FC<any> = ({ allUsers, currentUser, onClose, onCreated }) => {
  const [formData, setFormData] = useState({
    userId: '',
    managerId: currentUser.id,
    startDate: new Date().toISOString().split('T')[0],
    expectedEndDate: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await onboardingApi.create(formData);
      alert('Onboarding creato con successo!');
      onCreated();
      onClose();
    } catch (error: any) {
      console.error('Errore creazione onboarding:', error);
      alert(error.response?.data?.error || 'Errore durante la creazione dell\'onboarding');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Nuovo Onboarding</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="label">Nuovo Dipendente *</label>
            <select
              className="input"
              value={formData.userId}
              onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
              required
            >
              <option value="">Seleziona un dipendente...</option>
              {allUsers.map((u: any) => (
                <option key={u.id} value={u.id}>
                  {u.firstName} {u.lastName} ({u.email})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="label">Manager Responsabile *</label>
            <select
              className="input"
              value={formData.managerId}
              onChange={(e) => setFormData({ ...formData, managerId: e.target.value })}
              required
            >
              {allUsers.map((u: any) => (
                <option key={u.id} value={u.id}>
                  {u.firstName} {u.lastName} {u.department && `(${u.department})`}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="label">Data Inizio *</label>
            <input
              type="date"
              className="input"
              value={formData.startDate}
              onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label className="label">Data Prevista Completamento *</label>
            <input
              type="date"
              className="input"
              value={formData.expectedEndDate}
              onChange={(e) => setFormData({ ...formData, expectedEndDate: e.target.value })}
              required
            />
          </div>

          <div className="alert alert-info" style={{ marginBottom: '15px' }}>
            ℹ️ La checklist di onboarding standard verrà creata automaticamente
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Annulla
            </button>
            <button type="submit" className="btn btn-primary">
              Crea Onboarding
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Onboarding;
