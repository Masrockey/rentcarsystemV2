import { Head, router, useForm } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useState } from 'react';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { index as usersIndex } from '@/routes/users';

type User = {
    id: number;
    name: string;
    email: string;
    roles: ('Super Admin' | 'Admin' | 'Marketing' | 'Peluncur' | 'Petugas Cuci')[];
};

type Props = {
    users: User[];
};

export default function UsersIndex({ users }: Props) {
    const [isOpen, setIsOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [deleteId, setDeleteId] = useState<number | null>(null);

    const { data, setData, post, put, reset, processing, errors, clearErrors } = useForm({
        name: '',
        email: '',
        password: '',
        roles: [] as string[],
    });

    const openCreateDialog = () => {
        setEditingUser(null);
        reset();
        clearErrors();
        setIsOpen(true);
    };

    const openEditDialog = (user: User) => {
        setEditingUser(user);
        clearErrors();
        setData({
            name: user.name,
            email: user.email,
            password: '',
            roles: user.roles || [],
        });
        setIsOpen(true);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingUser) {
            put(`/users/${editingUser.id}`, {
                onSuccess: () => {
                    setIsOpen(false);
                    reset();
                },
            });
        } else {
            post('/users', {
                onSuccess: () => {
                    setIsOpen(false);
                    reset();
                },
            });
        }
    };

    const handleDelete = (id: number) => {
        setDeleteId(id);
    };

    const getRoleBadgeColor = (role: string) => {
        switch (role) {
            case 'Super Admin':
                return 'bg-gradient-to-r from-purple-500/15 to-indigo-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30 font-bold';
            case 'Admin':
                return 'bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/25';
            case 'Marketing':
                return 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/25';
            case 'Peluncur':
                return 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/25';
            case 'Petugas Cuci':
                return 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/25';
            default:
                return 'bg-neutral-500/15 text-neutral-600 dark:text-neutral-400 border-neutral-500/25';
        }
    };

    return (
        <>
            <Head title="User Management" />
            <div className="flex flex-1 flex-col gap-6 p-6">
                <div className="flex items-center justify-between">
                    <div className="flex flex-col gap-1">
                        <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
                        <p className="text-muted-foreground">Manage user accounts and system access roles.</p>
                    </div>
                    <Button onClick={openCreateDialog} className="flex items-center gap-1">
                        <Plus className="h-4 w-4" /> Add User
                    </Button>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>All Users</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="relative overflow-x-auto rounded-lg border">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-muted text-xs uppercase text-muted-foreground">
                                    <tr>
                                        <th className="px-6 py-3">Name</th>
                                        <th className="px-6 py-3">Email</th>
                                        <th className="px-6 py-3">Role</th>
                                        <th className="px-6 py-3 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {users.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="px-6 py-8 text-center text-muted-foreground">
                                                No users found.
                                            </td>
                                        </tr>
                                    ) : (
                                        users.map((user) => (
                                            <tr key={user.id} className="hover:bg-muted/50">
                                                <td className="px-6 py-4 font-medium">{user.name}</td>
                                                <td className="px-6 py-4">{user.email}</td>
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-wrap gap-1">
                                                        {user.roles?.map((role) => (
                                                            <Badge key={role} variant="outline" className={getRoleBadgeColor(role)}>
                                                                {role}
                                                            </Badge>
                                                        ))}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-right flex items-center justify-end gap-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => openEditDialog(user)}
                                                    >
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="text-red-500 hover:text-red-600"
                                                        onClick={() => handleDelete(user.id)}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>

                <Dialog open={isOpen} onOpenChange={setIsOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{editingUser ? 'Edit User' : 'Add New User'}</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Full Name</Label>
                                <Input
                                    id="name"
                                    value={data.name}
                                    onChange={(e) => setData('name', e.target.value)}
                                    placeholder="Enter full name"
                                    required
                                />
                                {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="email">Email Address</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={data.email}
                                    onChange={(e) => setData('email', e.target.value)}
                                    placeholder="name@example.com"
                                    required
                                />
                                {errors.email && <p className="text-xs text-red-500">{errors.email}</p>}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="password">
                                    Password {editingUser && <span className="text-xs text-muted-foreground">(leave blank to keep current)</span>}
                                </Label>
                                <Input
                                    id="password"
                                    type="password"
                                    value={data.password}
                                    onChange={(e) => setData('password', e.target.value)}
                                    placeholder="Min 8 characters"
                                    required={!editingUser}
                                />
                                {errors.password && <p className="text-xs text-red-500">{errors.password}</p>}
                            </div>

                            <div className="space-y-3">
                                <Label>User Roles (Select all that apply)</Label>
                                <div className="grid grid-cols-2 gap-3 pt-1">
                                    {['Super Admin', 'Admin', 'Marketing', 'Peluncur', 'Petugas Cuci'].map((role) => {
                                        const isChecked = data.roles.includes(role);
                                        return (
                                            <div key={role} className="flex items-center space-x-2 border rounded-md p-2 hover:bg-muted/50 transition-colors">
                                                <Checkbox
                                                    id={`role-${role}`}
                                                    checked={isChecked}
                                                    onCheckedChange={(checked) => {
                                                        if (checked) {
                                                            setData('roles', [...data.roles, role]);
                                                        } else {
                                                            setData('roles', data.roles.filter((r) => r !== role));
                                                        }
                                                    }}
                                                />
                                                <Label htmlFor={`role-${role}`} className="text-sm font-medium cursor-pointer">
                                                    {role}
                                                </Label>
                                            </div>
                                        );
                                    })}
                                </div>
                                {errors.roles && <p className="text-xs text-red-500">{errors.roles}</p>}
                            </div>

                            <DialogFooter className="pt-4">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setIsOpen(false)}
                                >
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={processing}>
                                    {editingUser ? 'Save Changes' : 'Create User'}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>

                <Dialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Confirm Delete</DialogTitle>
                        </DialogHeader>
                        <div className="py-4">
                            <p className="text-sm text-muted-foreground">
                                Are you sure you want to delete this user? This action cannot be undone.
                            </p>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setDeleteId(null)}>
                                Cancel
                            </Button>
                            <Button
                                variant="destructive"
                                onClick={() => {
                                    if (deleteId) {
                                        router.delete(`/users/${deleteId}`, {
                                            onSuccess: () => setDeleteId(null)
                                        });
                                    }
                                }}
                            >
                                Delete
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </>
    );
}

UsersIndex.layout = {
    breadcrumbs: [
        {
            title: 'User Management',
            href: usersIndex(),
        },
    ],
};
