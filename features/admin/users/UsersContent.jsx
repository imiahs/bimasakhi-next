'use client';

import React, { useState, useEffect } from 'react';

const UsersContent = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const res = await fetch('/api/admin/users');
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

        fetchUsers();
    }, []);

    return (
        <div className="flex flex-col gap-6 h-full">
            <div className="admin-page-header">
                <h1>User Access & Permissions</h1>
                <p>Manage RBAC roles for team members accessing the Bima Sakhi OS. (Currently restricted to super-admin properties)</p>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                            <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">User</th>
                            <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Role</th>
                            <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                            <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan="4" className="p-4 text-center">Loading Users...</td></tr>
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
                                <td className="p-4">
                                    <button className="text-blue-600 hover:underline font-medium text-sm">Role Fixed</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <button className="self-start bg-slate-400 text-white px-6 py-2 rounded-lg font-semibold cursor-not-allowed">
                + Invite New User (Locked)
            </button>
        </div>
    );
};

export default UsersContent;
