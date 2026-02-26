import React, { useEffect, useState } from 'react';
import api from '../services/api';
import './UserManagement.css';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'ADMIN' | 'USER';
  department: string | null;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
  updatedAt: string;
}

interface UserManagementProps {
  user: any;
}

const UserManagement: React.FC<UserManagementProps> = ({ user }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    role: 'USER' as 'ADMIN' | 'USER',
    department: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const response = await api.get('/users');
      setUsers(response.data);
    } catch (error: any) {
      setError('Error loading users: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (user?: User) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        email: user.email,
        password: '',
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        department: user.department || '',
      });
    } else {
      setEditingUser(null);
      setFormData({
        email: '',
        password: '',
        firstName: '',
        lastName: '',
        role: 'USER',
        department: '',
      });
    }
    setShowModal(true);
    setError('');
    setSuccess('');
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingUser(null);
    setError('');
    setSuccess('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      if (editingUser) {
        // Update existing user
        await api.put(`/users/${editingUser.id}`, formData);
        setSuccess('User updated successfully');
      } else {
        // Create new user
        if (!formData.password) {
          setError('Password is required for new users');
          return;
        }
        await api.post('/users', formData);
        setSuccess('User created successfully');
      }

      setTimeout(() => {
        handleCloseModal();
        loadUsers();
      }, 1500);
    } catch (error: any) {
      setError(error.response?.data?.error || error.message);
    }
  };

  const handleDelete = async (userId: string) => {
    if (!window.confirm('Are you sure you want to delete this user?')) {
      return;
    }

    try {
      await api.delete(`/users/${userId}`);
      setSuccess('User deleted successfully');
      loadUsers();
      setTimeout(() => setSuccess(''), 3000);
    } catch (error: any) {
      setError(error.response?.data?.error || error.message);
      setTimeout(() => setError(''), 3000);
    }
  };

  const getDepartmentBadge = (department: string | null) => {
    if (!department) return null;

    const colors: any = {
      HR: '#3b82f6',
      Amministrazione: '#10b981',
      IT: '#f59e0b',
      Vendite: '#8b5cf6',
      Marketing: '#ec4899',
    };

    return (
      <span
        className="department-badge"
        style={{ background: colors[department] || '#64748b' }}
      >
        {department}
      </span>
    );
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (user.role !== 'ADMIN') {
    return (
      <div className="page">
        <div className="alert alert-danger">
          <strong>Access denied:</strong> Only administrators can access this page.
        </div>
      </div>
    );
  }

  return (
    <div className="page user-management-page">
      <div className="page-header">
        <h1>User Management</h1>
        <button className="btn btn-primary" onClick={() => handleOpenModal()}>
          + New User
        </button>
      </div>

      {error && (
        <div className="alert alert-danger">
          <strong>Error:</strong> {error}
        </div>
      )}

      {success && (
        <div className="alert alert-success">
          <strong>Success:</strong> {success}
        </div>
      )}

      <div className="users-table-container">
        <table className="users-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Department</th>
              <th>Status</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className={u.status === 'INACTIVE' ? 'inactive' : ''}>
                <td>
                  <strong>
                    {u.firstName} {u.lastName}
                  </strong>
                </td>
                <td>{u.email}</td>
                <td>
                  <span className={`badge badge-${u.role.toLowerCase()}`}>
                    {u.role}
                  </span>
                </td>
                <td>{getDepartmentBadge(u.department)}</td>
                <td>
                  <span className={`status-badge status-${u.status.toLowerCase()}`}>
                    {u.status}
                  </span>
                </td>
                <td>{new Date(u.createdAt).toLocaleDateString('en-GB')}</td>
                <td>
                  <div className="action-buttons">
                    <button
                      className="btn btn-sm btn-secondary"
                      onClick={() => handleOpenModal(u)}
                    >
                      Edit
                    </button>
                    <button
                      className="btn btn-sm btn-danger"
                      onClick={() => handleDelete(u.id)}
                      disabled={u.id === user.id}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingUser ? 'Edit User' : 'New User'}</h2>
              <button className="close-btn" onClick={handleCloseModal}>
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label className="label">First name</label>
                  <input
                    type="text"
                    className="input"
                    value={formData.firstName}
                    onChange={(e) =>
                      setFormData({ ...formData, firstName: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="label">Last name</label>
                  <input
                    type="text"
                    className="input"
                    value={formData.lastName}
                    onChange={(e) =>
                      setFormData({ ...formData, lastName: e.target.value })
                    }
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="label">Email</label>
                <input
                  type="email"
                  className="input"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  required
                />
              </div>

              <div className="form-group">
                <label className="label">
                  Password {editingUser && '(leave blank to keep unchanged)'}
                </label>
                <input
                  type="password"
                  className="input"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  required={!editingUser}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="label">Role</label>
                  <select
                    className="input"
                    value={formData.role}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        role: e.target.value as 'ADMIN' | 'USER',
                      })
                    }
                  >
                    <option value="USER">USER</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="label">Department</label>
                  <select
                    className="input"
                    value={formData.department}
                    onChange={(e) =>
                      setFormData({ ...formData, department: e.target.value })
                    }
                  >
                    <option value="">None</option>
                    <option value="HR">HR</option>
                    <option value="Amministrazione">Administration</option>
                    <option value="IT">IT</option>
                    <option value="Vendite">Sales</option>
                    <option value="Marketing">Marketing</option>
                  </select>
                </div>
              </div>

              {error && (
                <div className="alert alert-danger">
                  <strong>Error:</strong> {error}
                </div>
              )}

              {success && (
                <div className="alert alert-success">
                  <strong>Success:</strong> {success}
                </div>
              )}

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleCloseModal}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingUser ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
