<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Models\Application;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class UserController extends Controller
{
    /**
     * Display a listing of admin and operator users.
     */
    public function index(Request $request): Response
    {
        abort_if(! $request->user()?->isSuperAdmin(), 403, 'Hanya Admin Utama yang berhak mengakses kelola pengguna.');

        $users = User::query()
            ->select(['id', 'name', 'email', 'role', 'is_admin', 'assigned_application_ids', 'created_at'])
            ->orderBy('id', 'asc')
            ->get()
            ->map(fn (User $user) => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role ?: ($user->is_admin ? 'admin' : 'operator'),
                'assigned_application_ids' => $user->assigned_application_ids ?? [],
                'created_at' => $user->created_at?->format('d M Y, H:i') ?? '-',
            ]);

        $applications = Application::query()
            ->select(['id', 'app_id', 'name', 'is_active'])
            ->orderBy('name', 'asc')
            ->get();

        return Inertia::render('settings/users', [
            'users' => $users,
            'applications' => $applications,
        ]);
    }

    /**
     * Store a newly created user.
     */
    public function store(Request $request): RedirectResponse
    {
        abort_if(! $request->user()?->isSuperAdmin(), 403, 'Hanya Admin Utama yang berhak menambah pengguna baru.');

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'lowercase', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', 'min:8'],
            'role' => ['required', 'in:admin,operator'],
            'assigned_application_ids' => ['nullable', 'array'],
            'assigned_application_ids.*' => ['integer', 'exists:applications,id'],
        ]);

        $isOperator = $validated['role'] === 'operator';

        User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
            'role' => $validated['role'],
            'is_admin' => ! $isOperator,
            'assigned_application_ids' => $isOperator ? ($validated['assigned_application_ids'] ?? []) : null,
        ]);

        return back()->with('success', "Pengguna '{$validated['name']}' berhasil ditambahkan.");
    }

    /**
     * Update the specified user.
     */
    public function update(Request $request, User $user): RedirectResponse
    {
        abort_if(! $request->user()?->isSuperAdmin(), 403, 'Hanya Admin Utama yang berhak memperbarui pengguna.');

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'lowercase', 'email', 'max:255', Rule::unique(User::class)->ignore($user->id)],
            'password' => ['nullable', 'string', 'min:8'],
            'role' => ['required', 'in:admin,operator'],
            'assigned_application_ids' => ['nullable', 'array'],
            'assigned_application_ids.*' => ['integer', 'exists:applications,id'],
        ]);

        $isOperator = $validated['role'] === 'operator';

        $data = [
            'name' => $validated['name'],
            'email' => $validated['email'],
            'role' => $validated['role'],
            'is_admin' => ! $isOperator,
            'assigned_application_ids' => $isOperator ? ($validated['assigned_application_ids'] ?? []) : null,
        ];

        if (! empty($validated['password'])) {
            $data['password'] = Hash::make($validated['password']);
        }

        $user->update($data);

        return back()->with('success', "Data pengguna '{$user->name}' berhasil diperbarui.");
    }

    /**
     * Remove the specified user.
     */
    public function destroy(Request $request, User $user): RedirectResponse
    {
        abort_if(! $request->user()?->isSuperAdmin(), 403, 'Hanya Admin Utama yang berhak menghapus pengguna.');

        if ($user->id === $request->user()->id) {
            return back()->with('error', 'Anda tidak dapat menghapus akun Anda sendiri.');
        }

        $userName = $user->name;
        $user->delete();

        return back()->with('success', "Pengguna '{$userName}' berhasil dihapus.");
    }
}
