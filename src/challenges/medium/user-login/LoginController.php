<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Hash;
use App\Models\User;

class Login extends Controller
{
    // Login using email and password
    public function login(Request $request): JsonResponse
    {
        $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required'],
        ]);

        $user = User::where('email', $request->email)->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            return response()->json([
                'message' => 'Invalid credentials.',
            ], 401);
        }

        return response()->json([
            'message' => 'Authenticated successfully.',
            ...$user->generateToken(),
        ]);
    }

    // Login using One Time Password (OTP) sent for user's email.
    public function otpLogin(Request $request): JsonResponse
    {
        $request->validate([
            'email' => ['required', 'email'],
            'otp' => ['required'],
        ]);

        $user = User::where('email', $request->email)->first();

        if (!$user || $user->isOtpExpired()) {
            return response()->json([
                'message' => 'No valid OTP for this user.',
            ], 401);
        }

        if ($user->otp != $request->otp) {
            return response()->json([
                'message' => 'Invalid credentials.',
            ], 401);
        }

        $user->invalidateOtp();

        return response()->json([
            'message' => 'Authenticated successfully.',
            ...$user->generateToken(),
        ]);
    }
}
