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
  const [showEquipmentForm, setShowEquipmentForm] = useState<any>(null);
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
      console.error('Error loading onboarding:', error);
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

  const [editingInfo, setEditingInfo] = useState(false);
  const [editFormData, setEditFormData] = useState<any>({});

  const canEditInfo = user.role === 'ADMIN' || user.department === 'HR';

  const startEditingInfo = (onb: any) => {
    setEditFormData({
      employeeFirstName: onb.employeeFirstName,
      employeeLastName: onb.employeeLastName,
      employeeEmail: onb.employeeEmail,
      managerId: onb.managerId,
      startDate: onb.startDate ? new Date(onb.startDate).toISOString().split('T')[0] : '',
      expectedEndDate: onb.expectedEndDate ? new Date(onb.expectedEndDate).toISOString().split('T')[0] : '',
      sede: onb.sede || '',
      department: onb.department || '',
      role: onb.role || ''
    });
    setEditingInfo(true);
  };

  const handleSaveInfo = async () => {
    try {
      const response = await onboardingApi.updateInfo(selectedOnboarding.id, editFormData);
      setSelectedOnboarding(response.data);
      setEditingInfo(false);
      loadOnboardings();
    } catch (error: any) {
      console.error('Error updating info:', error);
      alert(error.response?.data?.error || 'Error during update');
    }
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>Onboarding</h1>
        <p>Manage onboarding processes for new employees</p>
        {/* Only HR and ADMIN can create new onboardings */}
        {(user.role === 'ADMIN' || user.department === 'HR') && (
          <button
            className="btn btn-primary"
            onClick={() => setShowNewForm(true)}
            style={{ marginLeft: 'auto' }}
          >
            + New Onboarding
          </button>
        )}
      </div>

      <div className="alert alert-info">
        <strong>ISO 9001 Compliance:</strong> All onboarding processes are tracked and audited.
        Checklists ensure process uniformity.
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
                {onb.employeeFirstName} {onb.employeeLastName}
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
                <span>📅 Start:</span>
                <span>{new Date(onb.startDate).toLocaleDateString('en-GB')}</span>
              </div>
              {onb.expectedEndDate && (
                <div className="info-row">
                  <span>⏰ Deadline:</span>
                  <span>{new Date(onb.expectedEndDate).toLocaleDateString('en-GB')}</span>
                </div>
              )}
            </div>
          </div>
        ))}

        {onboardings.length === 0 && (
          <div className="empty-state">
            <h3>No active onboarding</h3>
            <p>Onboarding processes will appear here</p>
          </div>
        )}
      </div>

      {selectedOnboarding && (
        <div className="modal-overlay" onClick={() => setSelectedOnboarding(null)}>
          <div className="modal process-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px', width: '100%' }}>
                <div style={{ flex: 1 }}>
                  <h2>
                    Onboarding: {selectedOnboarding.employeeFirstName}{' '}
                    {selectedOnboarding.employeeLastName}
                  </h2>
                  <span className={`status-badge status-${selectedOnboarding.status.toLowerCase()}`}>
                    {selectedOnboarding.status}
                  </span>
                </div>
                {/* Only the assigned Manager, HR and ADMIN can add equipment */}
                {selectedOnboarding.status === 'PENDING_EQUIPMENT' &&
                  (user.role === 'ADMIN' ||
                    user.department === 'HR' ||
                    user.id === selectedOnboarding.managerId) && (
                  <button
                    className="btn btn-primary"
                    onClick={() => {
                      setShowEquipmentForm(selectedOnboarding);
                    }}
                    style={{ whiteSpace: 'nowrap' }}
                  >
                    ➕ Add Equipment
                  </button>
                )}
                {user.role === 'ADMIN' && (
                  <button
                    className="btn"
                    onClick={async () => {
                      if (window.confirm('Are you sure you want to delete this onboarding?')) {
                        try {
                          await onboardingApi.delete(selectedOnboarding.id);
                          alert('Onboarding deleted successfully');
                          loadOnboardings();
                          setSelectedOnboarding(null);
                        } catch (error) {
                          console.error('Error deleting:', error);
                          alert('Error during deletion');
                        }
                      }
                    }}
                    style={{ backgroundColor: '#000000', color: '#FFFFFF', whiteSpace: 'nowrap' }}
                  >
                    🗑️ Delete
                  </button>
                )}
              </div>
              <button className="close-btn" onClick={() => setSelectedOnboarding(null)}>
                ×
              </button>
            </div>

            <div className="modal-content">
              {selectedOnboarding.status === 'PENDING_EQUIPMENT' && (
                <div className="alert" style={{ marginBottom: '20px', backgroundColor: '#FFE600', border: '2px solid #000000', borderRadius: '0', padding: '12px' }}>
                  <strong>⚠️ Waiting for Equipment</strong><br />
                  <span style={{ fontSize: '14px' }}>
                    Basic information has been entered by HR. The Manager needs to add the necessary equipment.
                  </span>
                </div>
              )}

              <div className="process-details">
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', borderBottom: '2px solid #000000', paddingBottom: '4px' }}>
                    <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#0A0A0A', margin: 0 }}>
                      Basic Information
                    </h4>
                    {canEditInfo && !editingInfo && (
                      <button
                        className="btn btn-secondary"
                        onClick={() => startEditingInfo(selectedOnboarding)}
                        style={{ fontSize: '12px', padding: '4px 10px' }}
                      >
                        Edit
                      </button>
                    )}
                  </div>

                  {editingInfo ? (
                    <div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                        <div className="form-group">
                          <label className="label">First Name *</label>
                          <input type="text" className="input" value={editFormData.employeeFirstName} onChange={(e) => setEditFormData({ ...editFormData, employeeFirstName: e.target.value })} required />
                        </div>
                        <div className="form-group">
                          <label className="label">Last Name *</label>
                          <input type="text" className="input" value={editFormData.employeeLastName} onChange={(e) => setEditFormData({ ...editFormData, employeeLastName: e.target.value })} required />
                        </div>
                      </div>
                      <div className="form-group" style={{ marginBottom: '10px' }}>
                        <label className="label">Email *</label>
                        <input type="email" className="input" value={editFormData.employeeEmail} onChange={(e) => setEditFormData({ ...editFormData, employeeEmail: e.target.value })} required />
                      </div>
                      <div className="form-group" style={{ marginBottom: '10px' }}>
                        <label className="label">Responsible Manager</label>
                        <select className="input" value={editFormData.managerId} onChange={(e) => setEditFormData({ ...editFormData, managerId: e.target.value })}>
                          {allUsers.map((u: any) => (
                            <option key={u.id} value={u.id}>{u.firstName} {u.lastName} {u.department && `(${u.department})`}</option>
                          ))}
                        </select>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                        <div className="form-group">
                          <label className="label">Start Date</label>
                          <input type="date" className="input" value={editFormData.startDate} onChange={(e) => setEditFormData({ ...editFormData, startDate: e.target.value })} />
                        </div>
                        <div className="form-group">
                          <label className="label">Expected End Date</label>
                          <input type="date" className="input" value={editFormData.expectedEndDate} onChange={(e) => setEditFormData({ ...editFormData, expectedEndDate: e.target.value })} />
                          <span style={{ fontSize: '11px', color: '#666666' }}>Leave blank for permanent contract</span>
                        </div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                        <div className="form-group">
                          <label className="label">Location</label>
                          <input type="text" className="input" value={editFormData.sede} onChange={(e) => setEditFormData({ ...editFormData, sede: e.target.value })} />
                        </div>
                        <div className="form-group">
                          <label className="label">Department</label>
                          <input type="text" className="input" value={editFormData.department} onChange={(e) => setEditFormData({ ...editFormData, department: e.target.value })} />
                        </div>
                        <div className="form-group">
                          <label className="label">Role/Position</label>
                          <input type="text" className="input" value={editFormData.role} onChange={(e) => setEditFormData({ ...editFormData, role: e.target.value })} />
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                        <button className="btn btn-secondary" onClick={() => setEditingInfo(false)}>Cancel</button>
                        <button className="btn btn-primary" onClick={handleSaveInfo}>Save Changes</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="detail-item">
                        <strong>Email:</strong> {selectedOnboarding.employeeEmail}
                      </div>
                      <div className="detail-item">
                        <strong>Manager:</strong> {selectedOnboarding.manager.firstName}{' '}
                        {selectedOnboarding.manager.lastName}
                      </div>
                      {selectedOnboarding.sede && (
                        <div className="detail-item">
                          <strong>Location:</strong> {selectedOnboarding.sede}
                        </div>
                      )}
                      {selectedOnboarding.department && (
                        <div className="detail-item">
                          <strong>Department:</strong> {selectedOnboarding.department}
                        </div>
                      )}
                      {selectedOnboarding.role && (
                        <div className="detail-item">
                          <strong>Role/Position:</strong> {selectedOnboarding.role}
                        </div>
                      )}
                      <div className="detail-item">
                        <strong>Start Date:</strong>{' '}
                        {new Date(selectedOnboarding.startDate).toLocaleDateString('en-GB')}
                      </div>
                      {selectedOnboarding.expectedEndDate && (
                        <div className="detail-item">
                          <strong>Expected End Date:</strong>{' '}
                          {new Date(selectedOnboarding.expectedEndDate).toLocaleDateString('en-GB')}
                        </div>
                      )}
                      {!selectedOnboarding.expectedEndDate && (
                        <div className="detail-item">
                          <strong>Contract:</strong> Permanent
                        </div>
                      )}
                      {selectedOnboarding.actualEndDate && (
                        <div className="detail-item">
                          <strong>Actual End Date:</strong>{' '}
                          {new Date(selectedOnboarding.actualEndDate).toLocaleDateString('en-GB')}
                        </div>
                      )}
                    </>
                  )}
                </div>

                {(selectedOnboarding.computerType || selectedOnboarding.phoneType || selectedOnboarding.needsHeadset || selectedOnboarding.needsWebcam || selectedOnboarding.additionalMonitor) && (
                  <div style={{ marginBottom: '20px' }}>
                    <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '10px', color: '#0A0A0A', borderBottom: '2px solid #000000', paddingBottom: '4px' }}>
                      💻 Hardware Equipment
                    </h4>
                    {selectedOnboarding.computerType && selectedOnboarding.computerType !== 'Non necessario' && (
                      <div className="detail-item">
                        <strong>Computer:</strong> {selectedOnboarding.computerType}
                      </div>
                    )}
                    {selectedOnboarding.phoneType && selectedOnboarding.phoneType !== 'Non necessario' && (
                      <div className="detail-item">
                        <strong>Phone:</strong> {selectedOnboarding.phoneType}
                      </div>
                    )}
                    {(selectedOnboarding.needsHeadset || selectedOnboarding.needsWebcam || selectedOnboarding.additionalMonitor) && (
                      <div className="detail-item">
                        <strong>Accessories:</strong>{' '}
                        {[
                          selectedOnboarding.needsHeadset && '🎧 Headphones',
                          selectedOnboarding.needsWebcam && '📹 Webcam',
                          selectedOnboarding.additionalMonitor && '🖥️ Additional monitor'
                        ].filter(Boolean).join(', ')}
                      </div>
                    )}
                  </div>
                )}

                {(selectedOnboarding.needsMicrosoft365 || selectedOnboarding.softwareNeeded || selectedOnboarding.systemAccess) && (
                  <div style={{ marginBottom: '20px' }}>
                    <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '10px', color: '#0A0A0A', borderBottom: '2px solid #000000', paddingBottom: '4px' }}>
                      🔐 Software and Access
                    </h4>
                    {selectedOnboarding.needsMicrosoft365 && (
                      <div className="detail-item">
                        <strong>Microsoft 365:</strong> ✓ Required
                      </div>
                    )}
                    {selectedOnboarding.softwareNeeded && (
                      <div className="detail-item">
                        <strong>Specific Software:</strong> {selectedOnboarding.softwareNeeded}
                      </div>
                    )}
                    {selectedOnboarding.systemAccess && (
                      <div className="detail-item">
                        <strong>System Access:</strong> {selectedOnboarding.systemAccess}
                      </div>
                    )}
                  </div>
                )}

                {selectedOnboarding.additionalNotes && (
                  <div style={{ marginBottom: '20px' }}>
                    <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '10px', color: '#0A0A0A', borderBottom: '2px solid #000000', paddingBottom: '4px' }}>
                      📝 Additional Notes
                    </h4>
                    <div className="detail-item" style={{ whiteSpace: 'pre-wrap' }}>
                      {selectedOnboarding.additionalNotes}
                    </div>
                  </div>
                )}
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

      {showEquipmentForm && (
        <EquipmentModal
          onboarding={showEquipmentForm}
          onClose={() => setShowEquipmentForm(null)}
          onUpdated={() => {
            loadOnboardings();
            setShowEquipmentForm(null);
            setSelectedOnboarding(null);
          }}
        />
      )}
    </div>
  );
};

// Modal to create new onboarding (STEP 1 - HR: Basic information only)
const NewOnboardingModal: React.FC<any> = ({ allUsers, currentUser, onClose, onCreated }) => {
  const [formData, setFormData] = useState({
    // New employee information
    employeeFirstName: '',
    employeeLastName: '',
    employeeEmail: '',
    managerId: currentUser.id,
    startDate: new Date().toISOString().split('T')[0],
    expectedEndDate: '',
    // Employee information
    sede: '',
    department: '',
    role: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await onboardingApi.create(formData);
      alert('Onboarding created successfully!');
      onCreated();
      onClose();
    } catch (error: any) {
      console.error('Error creating onboarding:', error);
      alert(error.response?.data?.error || 'Error creating onboarding');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '700px', maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="modal-header">
          <h2>New Onboarding</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* SECTION: Basic Information */}
          <div style={{ marginBottom: '25px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: '#0A0A0A', borderBottom: '2px solid #000000', paddingBottom: '6px' }}>
              📋 Basic Information
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <div className="form-group">
                <label className="label">First Name *</label>
                <input
                  type="text"
                  className="input"
                  placeholder="e.g. John"
                  value={formData.employeeFirstName}
                  onChange={(e) => setFormData({ ...formData, employeeFirstName: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="label">Last Name *</label>
                <input
                  type="text"
                  className="input"
                  placeholder="e.g. Smith"
                  value={formData.employeeLastName}
                  onChange={(e) => setFormData({ ...formData, employeeLastName: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="label">Email *</label>
              <input
                type="email"
                className="input"
                placeholder="e.g. john.smith@company.com"
                value={formData.employeeEmail}
                onChange={(e) => setFormData({ ...formData, employeeEmail: e.target.value })}
                required
              />
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

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <div className="form-group">
                <label className="label">Start Date *</label>
                <input
                  type="date"
                  className="input"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="label">Expected Completion Date</label>
                <input
                  type="date"
                  className="input"
                  value={formData.expectedEndDate}
                  onChange={(e) => setFormData({ ...formData, expectedEndDate: e.target.value })}
                />
                <span style={{ fontSize: '11px', color: '#666666' }}>Leave blank for permanent contract</span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px' }}>
              <div className="form-group">
                <label className="label">Location</label>
                <input
                  type="text"
                  className="input"
                  placeholder="e.g. London, Manchester..."
                  value={formData.sede}
                  onChange={(e) => setFormData({ ...formData, sede: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="label">Department</label>
                <input
                  type="text"
                  className="input"
                  placeholder="e.g. HR, IT..."
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="label">Role/Position</label>
                <input
                  type="text"
                  className="input"
                  placeholder="e.g. Developer..."
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div className="alert alert-info" style={{ marginBottom: '15px' }}>
            ℹ️ <strong>2-step workflow:</strong><br />
            <span style={{ fontSize: '14px' }}>
              1. HR creates the onboarding with basic information (this form)<br />
              2. The Manager will subsequently add the necessary equipment<br />
              3. IT will receive the ticket only when the equipment has been defined
            </span>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Create Onboarding
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Modal to add equipment (STEP 2 - Manager)
const EquipmentModal: React.FC<any> = ({ onboarding, onClose, onUpdated }) => {
  const [formData, setFormData] = useState({
    // Hardware equipment
    computerType: '',
    phoneType: '',
    needsHeadset: false,
    needsWebcam: false,
    additionalMonitor: false,
    // Software and access
    needsMicrosoft365: false,
    softwareNeeded: '',
    systemAccess: '',
    // Notes
    additionalNotes: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await onboardingApi.updateEquipment(onboarding.id, formData);
      alert('Equipment added successfully! The IT ticket has been created automatically.');
      onUpdated();
    } catch (error: any) {
      console.error('Error adding equipment:', error);
      alert(error.response?.data?.error || 'Error adding equipment');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '700px', maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="modal-header">
          <h2>Add Equipment - {onboarding.employeeFirstName} {onboarding.employeeLastName}</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="alert" style={{ marginBottom: '20px', backgroundColor: '#F5F0EB', border: '2px solid #000000', borderRadius: '0', padding: '12px' }}>
          <strong>👤 Manager</strong><br />
          <span style={{ fontSize: '14px' }}>
            Fill in the necessary equipment for the new employee. Once saved, a ticket will be automatically created for IT.
          </span>
        </div>

        <form onSubmit={handleSubmit}>
          {/* SECTION: Hardware Equipment */}
          <div style={{ marginBottom: '25px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: '#0A0A0A', borderBottom: '2px solid #000000', paddingBottom: '6px' }}>
              💻 Hardware Equipment
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <div className="form-group">
                <label className="label">Computer</label>
                <select
                  className="input"
                  value={formData.computerType}
                  onChange={(e) => setFormData({ ...formData, computerType: e.target.value })}
                >
                  <option value="">Select...</option>
                  <option value="Portatile">Laptop</option>
                  <option value="Desktop">Desktop</option>
                  <option value="Non necessario">Not needed</option>
                </select>
              </div>

              <div className="form-group">
                <label className="label">Company Phone</label>
                <select
                  className="input"
                  value={formData.phoneType}
                  onChange={(e) => setFormData({ ...formData, phoneType: e.target.value })}
                >
                  <option value="">Select...</option>
                  <option value="Fisso">Landline Phone</option>
                  <option value="Android">Android Smartphone</option>
                  <option value="Non necessario">Not needed</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px', marginTop: '10px' }}>
              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', padding: '8px', border: '2px solid #000000', borderRadius: '0', backgroundColor: formData.needsHeadset ? '#FFE600' : 'transparent' }}>
                <input
                  type="checkbox"
                  checked={formData.needsHeadset}
                  onChange={(e) => setFormData({ ...formData, needsHeadset: e.target.checked })}
                  style={{ marginRight: '8px', width: '18px', height: '18px' }}
                />
                <span>🎧 Headphones</span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', padding: '8px', border: '2px solid #000000', borderRadius: '0', backgroundColor: formData.needsWebcam ? '#FFE600' : 'transparent' }}>
                <input
                  type="checkbox"
                  checked={formData.needsWebcam}
                  onChange={(e) => setFormData({ ...formData, needsWebcam: e.target.checked })}
                  style={{ marginRight: '8px', width: '18px', height: '18px' }}
                />
                <span>📹 Webcam</span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', padding: '8px', border: '2px solid #000000', borderRadius: '0', backgroundColor: formData.additionalMonitor ? '#FFE600' : 'transparent' }}>
                <input
                  type="checkbox"
                  checked={formData.additionalMonitor}
                  onChange={(e) => setFormData({ ...formData, additionalMonitor: e.target.checked })}
                  style={{ marginRight: '8px', width: '18px', height: '18px' }}
                />
                <span>🖥️ Additional monitor</span>
              </label>
            </div>
          </div>

          {/* SECTION: Software and Access */}
          <div style={{ marginBottom: '25px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: '#0A0A0A', borderBottom: '2px solid #000000', paddingBottom: '6px' }}>
              🔐 Software and Access
            </h3>

            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', padding: '12px', border: '2px solid #000000', borderRadius: '0', backgroundColor: formData.needsMicrosoft365 ? '#FFE600' : 'transparent', marginBottom: '15px' }}>
              <input
                type="checkbox"
                checked={formData.needsMicrosoft365}
                onChange={(e) => setFormData({ ...formData, needsMicrosoft365: e.target.checked })}
                style={{ marginRight: '10px', width: '20px', height: '20px' }}
              />
              <span style={{ fontWeight: '500' }}>📦 Microsoft 365 Package</span>
            </label>

            <div className="form-group">
              <label className="label">Specific Software</label>
              <textarea
                className="input"
                placeholder="e.g. PackWay, HubSpot, ArtiosCAD, AutoCAD..."
                value={formData.softwareNeeded}
                onChange={(e) => setFormData({ ...formData, softwareNeeded: e.target.value })}
                rows={3}
                style={{ resize: 'vertical' }}
              />
            </div>

            <div className="form-group">
              <label className="label">System Access</label>
              <textarea
                className="input"
                placeholder="e.g. VPN, shared folders, ERP, CRM, management systems..."
                value={formData.systemAccess}
                onChange={(e) => setFormData({ ...formData, systemAccess: e.target.value })}
                rows={3}
                style={{ resize: 'vertical' }}
              />
            </div>
          </div>

          {/* SECTION: Additional Notes */}
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: '#0A0A0A', borderBottom: '2px solid #000000', paddingBottom: '6px' }}>
              📝 Additional Notes
            </h3>

            <div className="form-group">
              <textarea
                className="input"
                placeholder="Other requests or important information..."
                value={formData.additionalNotes}
                onChange={(e) => setFormData({ ...formData, additionalNotes: e.target.value })}
                rows={3}
                style={{ resize: 'vertical' }}
              />
            </div>
          </div>

          <div className="alert" style={{ marginBottom: '15px', backgroundColor: '#F5F0EB', border: '2px solid #000000', borderRadius: '0', padding: '12px' }}>
            <strong>🎫 Automatic IT Ticket</strong><br />
            <span style={{ fontSize: '14px' }}>
              By saving the equipment, a ticket will be automatically created for the IT department with all the details.
              IT will receive the notification and can prepare everything in time.
            </span>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Save Equipment and Create IT Ticket
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Onboarding;
