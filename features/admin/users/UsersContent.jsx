'use client';

import React from 'react';

const mockUsers = [
    { id: 1, name: 'Raj Kumar', role: 'Super Admin', email: 'raj@bimasakhi.com', active: true },
    { id: 2, name: 'Content Editor', role: 'Editor', email: 'editor@bimasakhi.com', active: true },
    { id: 3, name: 'Support Staff', role: 'Viewer', email: 'support@bimasakhi.com', active: false },
];

const UsersContent = () => {
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
                            <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {mockUsers.map(user => (
                            <tr key={user.id} className="border-b border-slate-100 hover:bg-slate-50">
                                <td className="p-4">
                                    <p className="font-semibold text-slate-800">{user.name}</p>
                                    <p className="text-sm text-slate-500">{user.email}</p>
                                </td>
                                <td className="p-4">
                                    <span className="px-3 py-1 bg-indigo-100 text-indigo-700 text-xs font-bold rounded-full">
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
                                    <button className="text-blue-600 hover:underline font-medium text-sm">Manage Access</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <button className="self-start bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 transition">
                + Invite New User
            </button>
        </div>
    );
};

export default UsersContent;
