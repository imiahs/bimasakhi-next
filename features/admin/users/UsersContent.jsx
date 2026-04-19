'use client';

import React, { useState, useEffect } from 'react';

const UsersContent = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showInvite, setShowInvite] = useState(false);
    const [inviteForm, setInviteForm] = useState({ email: '', name: '', role: 'editor', password: '' });
    const [inviting, setInviting] = useState(false);
    const [inviteError, setInviteError] = useState(null);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const res = await fetch('/api/admin/users', { credentials: 'include' });
            const data = await res.json();
            if (data.users) {
                setUsers(data.users);
            }
        } catch (error) {
            console.error("Failed to load users", error);
        } finally {
            setLoading(false);
        }
    };

    const handleInvite = async (e) => {
        e.preventDefault();
        setInviting(true);
        setInviteError(null);
        try {
            const res = await fetch('/api/admin/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(inviteForm),
            });
            const data = await res.json();
            if (data.success) {
                setShowInvite(false);
                setInviteForm({ email: '', name: '', role: 'editor', password: '' });
                fetchUsers();
            } else {
                setInviteError(data.error || 'Failed to create user');
            }
        } catch (err) {
            setInviteError(err.message);
        } finally {
            setInviting(false);
        }
    };

    return (
        <div className="flex flex-col gap-6 h-full">
            <div className="admin-page-header">
                <h1>User Access & Permissions</h1>
                <p>Manage RBAC roles for team members accessing the Bima Sakhi OS.</p>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                            <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">User</th>
                            <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Role</th>
                            <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                            <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Last Login</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan="4" className="p-4 text-center">Loading Users...</td></tr>
                        ) : users.length === 0 ? (
                            <tr><td colSpan="4" className="p-4 text-center text-slate-400">No users found. Create your first user below.</td></tr>
                        ) : users.map(user => (
                            <tr key={user.id} className="border-b border-slate-100 hover:bg-slate-50">
                                <td className="p-4">
                                    <p className="font-semibold text-slate-800">{user.name}</p>
                                    <p className="text-sm text-slate-500">{user.email}</p>
                                </td>
                                <td className="p-4">
                                    <span className="px-3 py-1 bg-indigo-100 text-indigo-700 text-xs font-bold rounded-full capitalize">
                                        {user.role}
                                    </span>
                                </td>
                                <td className="p-4">
                                    {user.active ? (
                                        <span className="text-green-600 font-medium">Active</span>
                                    ) : (
                                        <span className="text-red-500 font-medium">Suspended</span>
                                    )}
                                </td>
                                <td className="p-4 text-sm text-slate-500">
                                    {user.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'Never'}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <button
                onClick={() => setShowInvite(true)}
                className="self-start bg-indigo-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
            >
                + Invite New User
            </button>

            {/* Invite Modal */}
            {showInvite && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
                        <h3 className="text-lg font-bold text-slate-800 mb-4">Create New User</h3>
                        <form onSubmit={handleInvite} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-600 mb-1">Email *</label>
                                <input
                                    type="email"
                                    required
                                    value={inviteForm.email}
                                    onChange={(e) => setInviteForm(f => ({ ...f, email: e.target.value }))}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-indigo-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-600 mb-1">Name</label>
                                <input
                                    type="text"
                                    value={inviteForm.name}
                                    onChange={(e) => setInviteForm(f => ({ ...f, name: e.target.value }))}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-indigo-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-600 mb-1">Password *</label>
                                <input
                                    type="password"
                                    required
                                    minLength={8}
                                    value={inviteForm.password}
                                    onChange={(e) => setInviteForm(f => ({ ...f, password: e.target.value }))}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-indigo-500"
                                    placeholder="Minimum 8 characters"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-600 mb-1">Role</label>
                                <select
                                    value={inviteForm.role}
                                    onChange={(e) => setInviteForm(f => ({ ...f, role: e.target.value }))}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-indigo-500"
                                >
                                    <option value="editor">Editor</option>
                                    <option value="agent">Agent</option>
                                    <option value="admin">Admin</option>
                                    <option value="super_admin">Super Admin</option>
                                </select>
                            </div>
                            {inviteError && (
                                <p className="text-sm text-red-600">{inviteError}</p>
                            )}
                            <div className="flex justify-end gap-3 pt-2">
                                <button type="button" onClick={() => setShowInvite(false)} className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700">Cancel</button>
                                <button type="submit" disabled={inviting} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
                                    {inviting ? 'Creating...' : 'Create User'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UsersContent;
