<?php

use App\Models\User;
use Illuminate\Support\Facades\RateLimiter;

test('login screen can be rendered', function () {
    $response = $this->get(route('login'));

    $response->assertOk();
});

test('users can authenticate using the login screen', function () {
    $user = User::factory()->create();

    $response = $this->post(route('login.store'), [
        'email' => $user->email,
        'password' => 'password',
    ]);

    $this->assertAuthenticated();
    $response->assertRedirect(route('dashboard', absolute: false));
});

test('users can not authenticate with invalid password', function () {
    $user = User::factory()->create();

    $this->post(route('login.store'), [
        'email' => $user->email,
        'password' => 'wrong-password',
    ]);

    $this->assertGuest();
});

test('users can logout', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->post(route('logout'));

    $response->assertRedirect(route('home'));

    $this->assertGuest();
});

test('users are rate limited', function () {
    $user = User::factory()->create();

    RateLimiter::increment(md5('login'.implode('|', [$user->email, '127.0.0.1'])), amount: 5);

    $response = $this->post(route('login.store'), [
        'email' => $user->email,
        'password' => 'wrong-password',
    ]);

    $response->assertTooManyRequests();
});

test('operator cs redirects directly to dashboard on login even when intended url targets user management', function () {
    $operator = User::factory()->create([
        'role' => 'operator',
        'is_admin' => false,
    ]);

    $response = $this->withSession(['url.intended' => '/settings/users'])
        ->post(route('login.store'), [
            'email' => $operator->email,
            'password' => 'password',
        ]);

    $this->assertAuthenticatedAs($operator);
    $response->assertRedirect(route('dashboard', absolute: false));
    $response->assertSessionMissing('url.intended');
});

test('only super admin can access user management page', function () {
    $operator = User::factory()->create([
        'role' => 'operator',
        'is_admin' => false,
    ]);
    $superAdmin = User::factory()->create([
        'role' => 'admin',
        'is_admin' => true,
    ]);

    $this->actingAs($operator)
        ->get('/settings/users')
        ->assertForbidden();

    $this->actingAs($operator)
        ->post('/settings/users', [
            'name' => 'Unauthorized',
            'email' => 'unauth@example.com',
            'password' => 'password123',
            'role' => 'operator',
        ])
        ->assertForbidden();

    $this->actingAs($superAdmin)
        ->get('/settings/users')
        ->assertOk();
});
