import { useState, useEffect } from 'react';
import { UserService } from '../services/database.service';
import { useLimit } from '../hooks/useLicense';
import LimitWarning from './LimitWarning';

interface UserManagementProps {
    onClose: () => void;
    currentUser: any;
    onUpgradeRequest?: (options?: {
        feature?: string;
        currentLimit?: { current: number; max: number };
    }) => void;
    t: (key: string) => string;
}

interface User {
    id: number;
    username: string;
    name: string;
    role: string;
    createdAt: Date;
}

interface UserFormData {
    id?: number;
    username: string;
    password: string;
    name: string;
    role: 'admin' | 'cashier';
}

const INITIAL_FORM: UserFormData = {
    username: '',
    password: '',
    name: '',
    role: 'cashier'
};

export default function UserManagement({ onClose, currentUser, onUpgradeRequest }: UserManagementProps) {
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState<UserFormData>(INITIAL_FORM);
    const [formError, setFormError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const { limit: userLimit, refresh: refreshUserLimit } = useLimit('users');

    useEffect(() => {
        loadUsers();
    }, []);

    const loadUsers = async () => {
        setIsLoading(true);
        try {
            const result = await UserService.getAll();
            if (result.success) {
                setUsers(result.data);
            }
        } catch (error) {
            console.error('Failed to load users:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAdd = () => {
        if (userLimit && !userLimit.allowed) {
            onUpgradeRequest?.({
                feature: 'More Team Members',
                currentLimit: {
                    current: userLimit.current,
                    max: userLimit.max,
                },
            });
            return;
        }

        setEditingUser(null);
        setFormData(INITIAL_FORM);
        setFormError(null);
        setShowForm(true);
    };

    const handleEdit = (user: User) => {
        setEditingUser(user);
        setFormData({
            id: user.id,
            username: user.username,
            password: '',
            name: user.name,
            role: user.role as 'admin' | 'cashier'
        });
        setFormError(null);
        setShowForm(true);
    };

    const handleDelete = async (user: User) => {
        if (user.id === currentUser.id) {
            alert('You cannot delete your own account!');
            return;
        }

        if (!confirm(`Delete user "${user.name}" (${user.username})?`)) {
            return;
        }

        try {
            const result = await UserService.delete(user.id);
            if (result.success) {
                loadUsers();
                refreshUserLimit();
            } else {
                alert(`Error: ${result.error?.message}`);
            }
        } catch (error) {
            alert('Failed to delete user');
        }
    };

    const validateForm = (): boolean => {
        if (!formData.username.trim()) {
            setFormError('Username is required');
            return false;
        }
        if (!formData.name.trim()) {
            setFormError('Name is required');
            return false;
        }
        if (!editingUser && !formData.password) {
            setFormError('Password is required for new users');
            return false;
        }
        if (formData.password && formData.password.length < 3) {
            setFormError('Password must be at least 3 characters');
            return false;
        }
        return true;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) return;

        if (!editingUser && userLimit && !userLimit.allowed) {
            setFormError(`User limit reached (${userLimit.current}/${userLimit.max}). Upgrade to continue.`);
            onUpgradeRequest?.({
                feature: 'More Team Members',
                currentLimit: {
                    current: userLimit.current,
                    max: userLimit.max,
                },
            });
            return;
        }

        setIsSubmitting(true);
        setFormError(null);

        try {
            const submitData: any = {
                username: formData.username,
                name: formData.name,
                role: formData.role
            };

            if (formData.password) {
                submitData.password = formData.password;
            }

            let result;
            if (editingUser && formData.id) {
                result = await UserService.update(formData.id, submitData);
            } else {
                result = await UserService.create(submitData);
            }

            if (result.success) {
                setShowForm(false);
                loadUsers();
                if (!editingUser) {
                    refreshUserLimit();
                }
            } else {
                setFormError(result.error?.message || 'Operation failed');
            }
        } catch (error) {
            setFormError('An unexpected error occurred');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-dark-surface rounded-2xl border border-dark-border shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="px-6 py-4 border-b border-dark-border flex items-center justify-between flex-shrink-0">
                    <h2 className="text-2xl font-bold text-gray-100 flex items-center">
                        <svg className="h-7 w-7 mr-3 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                        User Management
                    </h2>
                    <div className="flex items-center space-x-4">
                        <button
                            onClick={handleAdd}
                            className="btn-primary px-4 py-2 rounded-lg flex items-center"
                        >
                            <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                            Add User
                        </button>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-100 transition-colors"
                        >
                            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                {userLimit && userLimit.max > 0 && (
                    <div className="px-6 pt-4">
                        <LimitWarning
                            type="users"
                            current={userLimit.current}
                            max={userLimit.max}
                            onUpgrade={() => onUpgradeRequest?.({
                                feature: 'More Team Members',
                                currentLimit: {
                                    current: userLimit.current,
                                    max: userLimit.max,
                                },
                            })}
                        />
                    </div>
                )}

                {/* Content */}
                <div className="flex-1 overflow-y-auto scrollbar-thin p-6">
                    {isLoading ? (
                        <div className="flex justify-center items-center h-64">
                            <div className="animate-spin h-12 w-12 border-4 border-primary border-t-transparent rounded-full"></div>
                        </div>
                    ) : (
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="text-gray-400 border-b border-dark-border">
                                    <th className="py-3 px-4">Name</th>
                                    <th className="py-3 px-4">Username</th>
                                    <th className="py-3 px-4">Role</th>
                                    <th className="py-3 px-4">Created</th>
                                    <th className="py-3 px-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map((user) => (
                                    <tr key={user.id} className="border-b border-dark-border hover:bg-dark-elevated/50 transition-colors text-gray-200">
                                        <td className="py-3 px-4 font-medium">{user.name}</td>
                                        <td className="py-3 px-4 font-mono text-sm">{user.username}</td>
                                        <td className="py-3 px-4">
                                            <span className={`px-2 py-1 rounded text-xs font-bold ${user.role === 'admin'
                                                ? 'bg-primary/20 text-primary'
                                                : 'bg-success/20 text-success'
                                                }`}>
                                                {user.role}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-sm text-gray-500">
                                            {new Date(user.createdAt).toLocaleDateString()}
                                        </td>
                                        <td className="py-3 px-4 text-right space-x-2">
                                            <button
                                                onClick={() => handleEdit(user)}
                                                className="text-blue-400 hover:text-blue-300 transition-colors"
                                                title="Edit"
                                            >
                                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                </svg>
                                            </button>
                                            <button
                                                onClick={() => handleDelete(user)}
                                                className="text-danger hover:text-red-400 transition-colors"
                                                title="Delete"
                                                disabled={user.id === currentUser.id}
                                            >
                                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* Add/Edit Form Modal */}
            {showForm && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-dark-surface rounded-xl border border-dark-border shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col">
                        <div className="px-6 py-4 border-b border-dark-border flex justify-between items-center bg-dark-elevated/30 flex-shrink-0">
                            <h3 className="text-xl font-bold text-gray-100">
                                {editingUser ? 'Edit User' : 'Add New User'}
                            </h3>
                            <button
                                onClick={() => setShowForm(false)}
                                className="text-gray-400 hover:text-gray-100"
                            >
                                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <form id="user-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto scrollbar-thin p-6">
                            {formError && (
                                <div className="mb-4 p-3 bg-danger/10 border border-danger text-danger rounded-lg text-sm">
                                    {formError}
                                </div>
                            )}

                            <div className="space-y-4">
                                <div>
                                    <label className="label">Full Name</label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full"
                                        placeholder="John Doe"
                                        autoFocus
                                    />
                                </div>

                                <div>
                                    <label className="label">Username</label>
                                    <input
                                        type="text"
                                        value={formData.username}
                                        onChange={e => setFormData({ ...formData, username: e.target.value })}
                                        className="w-full font-mono"
                                        placeholder="johndoe"
                                    />
                                </div>

                                <div>
                                    <label className="label">
                                        Password {editingUser && <span className="text-xs text-gray-500">(leave empty to keep current)</span>}
                                    </label>
                                    <input
                                        type="password"
                                        value={formData.password}
                                        onChange={e => setFormData({ ...formData, password: e.target.value })}
                                        className="w-full"
                                        placeholder={editingUser ? '••••••' : 'Password'}
                                    />
                                </div>

                                <div>
                                    <label className="label">Role</label>
                                    <select
                                        value={formData.role}
                                        onChange={e => setFormData({ ...formData, role: e.target.value as 'admin' | 'cashier' })}
                                        className="w-full"
                                    >
                                        <option value="cashier">Cashier</option>
                                        <option value="admin">Admin</option>
                                    </select>
                                </div>
                            </div>
                        </form>

                        {/* Footer Buttons */}
                        <div className="px-6 py-4 border-t border-dark-border flex justify-end space-x-3 bg-dark-elevated/30 flex-shrink-0">
                            <button
                                type="button"
                                onClick={() => setShowForm(false)}
                                className="btn-secondary"
                                disabled={isSubmitting}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                form="user-form"
                                className="btn-primary"
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? 'Saving...' : (editingUser ? 'Update User' : 'Create User')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
