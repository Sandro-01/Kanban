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
      console.error('Error loading offboarding:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const response = await usersApi.getAll();
      setAllUsers(response.data);
    } catch (error) {
      console.error('Error loading users:', error);
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
      console.error('Error updating task:', error);
    }
  };

  const getProgress = (off: any) => {
    const total = off.tasks.length;
    const completed = off.tasks.filter((t: any) => t.completed).length;
    return (completed / total) * 100;
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>Offboarding</h1>
        <p>Manage offboarding processes and access revocation</p>
        {/* Only HR and ADMIN can create new offboardings */}
        {(user.role === 'ADMIN' || user.department === 'HR') && (
          <button
            className="btn btn-primary"
            onClick={() => setShowNewForm(true)}
            style={{ marginLeft: 'auto' }}
          >
            + New Offboarding
          </button>
        )}
      </div>

      <div className="alert alert-warning">
        <strong>ISO 27001 Compliance:</strong> Offboarding processes ensure timely
        revocation of all access and protection of company data.
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
                <span>Manager:</span>
                <span>
                  {off.manager.firstName} {off.manager.lastName}
                </span>
              </div>
              <div className="info-row">
                <span>Start:</span>
                <span>{new Date(off.startDate).toLocaleDateString('en-GB')}</span>
              </div>
              <div className="info-row">
                <span>Deadline:</span>
                <span>{new Date(off.expectedEndDate).toLocaleDateString('en-GB')}</span>
              </div>
              <div className="info-row">
                <span>Reason:</span>
                <span>{off.reason}</span>
              </div>
            </div>

            <div className="progress-section">
              <div className="progress-header">
                <span>Progress</span>
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
              {off.tasks.filter((t: any) => t.completed).length} / {off.tasks.length} tasks completed
            </div>
          </div>
        ))}

        {offboardings.length === 0 && (
          <div className="empty-state">
            <h3>No active offboarding</h3>
            <p>Offboarding processes will appear here</p>
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
                  <strong>User Status:</strong> {selectedOffboarding.user.status}
                </div>
                <div className="detail-item">
                  <strong>Manager:</strong> {selectedOffboarding.manager.firstName}{' '}
                  {selectedOffboarding.manager.lastName}
                </div>
                <div className="detail-item">
                  <strong>Reason:</strong> {selectedOffboarding.reason}
                </div>
                <div className="detail-item">
                  <strong>Start Date:</strong>{' '}
                  {new Date(selectedOffboarding.startDate).toLocaleDateString('en-GB')}
                </div>
                <div className="detail-item">
                  <strong>Expected End Date:</strong>{' '}
                  {new Date(selectedOffboarding.expectedEndDate).toLocaleDateString('en-GB')}
                </div>
                {selectedOffboarding.actualEndDate && (
                  <div className="detail-item">
                    <strong>Actual End Date:</strong>{' '}
                    {new Date(selectedOffboarding.actualEndDate).toLocaleDateString('en-GB')}
                  </div>
                )}
              </div>

              <div className="tasks-section">
                <h3>Offboarding Checklist (ISO 27001)</h3>
                <div className="alert alert-danger" style={{ marginBottom: '15px' }}>
                  ! All mandatory tasks must be completed to ensure security
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
                          disabled={selectedOffboarding.status === 'COMPLETED' && task.mandatory}
                        />
                      </div>
                      <div className="task-content">
                        <div className="task-title">
                          {task.title}
                          {task.mandatory && (
                            <span className="mandatory-badge mandatory">Mandatory</span>
                          )}
                        </div>
                        <div className="task-description">{task.description}</div>
                        {task.completed && task.completedAt && (
                          <div className="task-completed-date">
                            Completed on{' '}
                            {new Date(task.completedAt).toLocaleDateString('en-GB')}
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

// Modal to create new offboarding
const NewOffboardingModal: React.FC<any> = ({ allUsers, currentUser, onClose, onCreated }) => {
  const [formData, setFormData] = useState({
    userId: '',
    managerId: currentUser.id,
    startDate: new Date().toISOString().split('T')[0],
    expectedEndDate: '',
    reason: 'Resignation'
  });

  const reasons = [
    'Resignation',
    'Dismissal',
    'End of Contract',
    'Retirement',
    'Transfer',
    'Other'
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await offboardingApi.create(formData);
      alert('Offboarding created successfully!');
      onCreated();
      onClose();
    } catch (error: any) {
      console.error('Error creating offboarding:', error);
      alert(error.response?.data?.error || 'Error creating offboarding');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>New Offboarding</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="label">Departing Employee *</label>
            <select
              className="input"
              value={formData.userId}
              onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
              required
            >
              <option value="">Select an employee...</option>
              {allUsers.map((u: any) => (
                <option key={u.id} value={u.id}>
                  {u.firstName} {u.lastName} ({u.email})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="label">Responsible Manager *</label>
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
            <label className="label">Reason for Leaving *</label>
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
            <label className="label">Process Start Date *</label>
            <input
              type="date"
              className="input"
              value={formData.startDate}
              onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label className="label">Expected Completion Date *</label>
            <input
              type="date"
              className="input"
              value={formData.expectedEndDate}
              onChange={(e) => setFormData({ ...formData, expectedEndDate: e.target.value })}
              required
            />
          </div>

          <div className="alert alert-danger" style={{ marginBottom: '15px' }}>
            <strong>ISO 27001:</strong> The access revocation checklist will be created automatically.
            All mandatory tasks must be completed.
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Create Offboarding
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Offboarding;
