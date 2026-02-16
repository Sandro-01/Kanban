import React, { useEffect, useState } from 'react';
import { offboarding as offboardingApi, users as usersApi } from '../services/api';
import './ProcessList.css';

interface OffboardingProps {
  user: any;
}

const Offboarding: React.FC<OffboardingProps> = ({ user }) => {
  const [offboardings, setOffboardings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOffboarding, setSelectedOffboarding] = useState<any>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [allUsers, setAllUsers] = useState<any[]>([]);

  useEffect(() => {
    loadOffboardings();
    loadUsers();
  }, []);

  const loadOffboardings = async () => {
    try {
      const response = await offboardingApi.getAll();
      setOffboardings(response.data);
    } catch (error) {
      console.error('Errore caricamento offboarding:', error);
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

  const handleToggleTask = async (offboardingId: string, taskId: string, completed: boolean) => {
    try {
      await offboardingApi.updateTask(offboardingId, taskId, completed);
      loadOffboardings();
      if (selectedOffboarding) {
        const updated = await offboardingApi.get(selectedOffboarding.id);
        setSelectedOffboarding(updated.data);
      }
    } catch (error) {
      console.error('Errore aggiornamento task:', error);
    }
  };

  const getProgress = (off: any) => {
    const total = off.tasks.length;
    const completed = off.tasks.filter((t: any) => t.completed).length;
    return (completed / total) * 100;
  };

  if (loading) {
    return <div className="loading">Caricamento...</div>;
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>Offboarding</h1>
        <p>Gestisci i processi di offboarding e revoca accessi</p>
        {/* Solo HR e ADMIN possono creare nuovi offboarding */}
        {(user.role === 'ADMIN' || user.department === 'HR') && (
          <button
            className="btn btn-primary"
            onClick={() => setShowNewForm(true)}
            style={{ marginLeft: 'auto' }}
          >
            + Nuovo Offboarding
          </button>
        )}
      </div>

      <div className="alert alert-warning">
        <strong>ISO 27001 Compliance:</strong> I processi di offboarding garantiscono la revoca
        tempestiva di tutti gli accessi e la protezione dei dati aziendali.
      </div>

      <div className="process-grid">
        {offboardings.map((off) => (
          <div
            key={off.id}
            className={`process-card offboarding ${off.status.toLowerCase()}`}
            onClick={() => setSelectedOffboarding(off)}
          >
            <div className="process-header">
              <h3>
                {off.user.firstName} {off.user.lastName}
              </h3>
              <span className={`status-badge status-${off.status.toLowerCase()}`}>
                {off.status}
              </span>
            </div>

            <div className="process-info">
              <div className="info-row">
                <span>👤 Manager:</span>
                <span>
                  {off.manager.firstName} {off.manager.lastName}
                </span>
              </div>
              <div className="info-row">
                <span>📅 Inizio:</span>
                <span>{new Date(off.startDate).toLocaleDateString('it-IT')}</span>
              </div>
              <div className="info-row">
                <span>⏰ Scadenza:</span>
                <span>{new Date(off.expectedEndDate).toLocaleDateString('it-IT')}</span>
              </div>
              <div className="info-row">
                <span>📝 Motivo:</span>
                <span>{off.reason}</span>
              </div>
            </div>

            <div className="progress-section">
              <div className="progress-header">
                <span>Progresso</span>
                <span>{Math.round(getProgress(off))}%</span>
              </div>
              <div className="progress-bar">
                <div
                  className="progress-fill offboarding-fill"
                  style={{ width: `${getProgress(off)}%` }}
                />
              </div>
            </div>

            <div className="task-summary">
              {off.tasks.filter((t: any) => t.completed).length} / {off.tasks.length} task completati
            </div>
          </div>
        ))}

        {offboardings.length === 0 && (
          <div className="empty-state">
            <h3>Nessun offboarding attivo</h3>
            <p>I processi di offboarding appariranno qui</p>
          </div>
        )}
      </div>

      {selectedOffboarding && (
        <div className="modal-overlay" onClick={() => setSelectedOffboarding(null)}>
          <div className="modal process-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2>
                  Offboarding: {selectedOffboarding.user.firstName}{' '}
                  {selectedOffboarding.user.lastName}
                </h2>
                <span className={`status-badge status-${selectedOffboarding.status.toLowerCase()}`}>
                  {selectedOffboarding.status}
                </span>
              </div>
              <button className="close-btn" onClick={() => setSelectedOffboarding(null)}>
                ×
              </button>
            </div>

            <div className="modal-content">
              <div className="process-details">
                <div className="detail-item">
                  <strong>Email:</strong> {selectedOffboarding.user.email}
                </div>
                <div className="detail-item">
                  <strong>Status Utente:</strong> {selectedOffboarding.user.status}
                </div>
                <div className="detail-item">
                  <strong>Manager:</strong> {selectedOffboarding.manager.firstName}{' '}
                  {selectedOffboarding.manager.lastName}
                </div>
                <div className="detail-item">
                  <strong>Motivo:</strong> {selectedOffboarding.reason}
                </div>
                <div className="detail-item">
                  <strong>Data Inizio:</strong>{' '}
                  {new Date(selectedOffboarding.startDate).toLocaleDateString('it-IT')}
                </div>
                <div className="detail-item">
                  <strong>Data Prevista Fine:</strong>{' '}
                  {new Date(selectedOffboarding.expectedEndDate).toLocaleDateString('it-IT')}
                </div>
                {selectedOffboarding.actualEndDate && (
                  <div className="detail-item">
                    <strong>Data Effettiva Fine:</strong>{' '}
                    {new Date(selectedOffboarding.actualEndDate).toLocaleDateString('it-IT')}
                  </div>
                )}
              </div>

              <div className="tasks-section">
                <h3>Checklist Offboarding (ISO 27001)</h3>
                <div className="alert alert-danger" style={{ marginBottom: '15px' }}>
                  ⚠️ Tutti i task obbligatori devono essere completati per garantire la sicurezza
                </div>
                {selectedOffboarding.tasks
                  .sort((a: any, b: any) => a.order - b.order)
                  .map((task: any) => (
                    <div key={task.id} className={`task-item ${task.completed ? 'completed' : ''}`}>
                      <div className="task-checkbox">
                        <input
                          type="checkbox"
                          checked={task.completed}
                          onChange={(e) =>
                            handleToggleTask(
                              selectedOffboarding.id,
                              task.id,
                              e.target.checked
                            )
                          }
                          disabled={selectedOffboarding.status === 'COMPLETED'}
                        />
                      </div>
                      <div className="task-content">
                        <div className="task-title">
                          {task.title}
                          {task.mandatory && (
                            <span className="mandatory-badge mandatory">Obbligatorio</span>
                          )}
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
        <NewOffboardingModal
          allUsers={allUsers}
          currentUser={user}
          onClose={() => setShowNewForm(false)}
          onCreated={loadOffboardings}
        />
      )}
    </div>
  );
};

// Modal per creare nuovo offboarding
const NewOffboardingModal: React.FC<any> = ({ allUsers, currentUser, onClose, onCreated }) => {
  const [formData, setFormData] = useState({
    userId: '',
    managerId: currentUser.id,
    startDate: new Date().toISOString().split('T')[0],
    expectedEndDate: '',
    reason: 'Dimissioni'
  });

  const reasons = [
    'Dimissioni',
    'Licenziamento',
    'Fine Contratto',
    'Pensionamento',
    'Trasferimento',
    'Altro'
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await offboardingApi.create(formData);
      alert('Offboarding creato con successo!');
      onCreated();
      onClose();
    } catch (error: any) {
      console.error('Errore creazione offboarding:', error);
      alert(error.response?.data?.error || 'Errore durante la creazione dell\'offboarding');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Nuovo Offboarding</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="label">Dipendente in Uscita *</label>
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
            <label className="label">Motivo Uscita *</label>
            <select
              className="input"
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              required
            >
              {reasons.map((reason) => (
                <option key={reason} value={reason}>
                  {reason}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="label">Data Inizio Processo *</label>
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

          <div className="alert alert-danger" style={{ marginBottom: '15px' }}>
            ⚠️ <strong>ISO 27001:</strong> La checklist di revoca accessi verrà creata automaticamente.
            Tutti i task obbligatori devono essere completati.
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Annulla
            </button>
            <button type="submit" className="btn btn-primary">
              Crea Offboarding
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Offboarding;
