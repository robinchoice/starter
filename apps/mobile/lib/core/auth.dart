import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:altcha_lib/altcha_lib.dart' as altcha;
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:passkeys/authenticator.dart';
import 'package:passkeys/types.dart';

import 'api.dart';

final secureStorageProvider = Provider((ref) => const FlutterSecureStorage());
final passkeyAuthenticatorProvider = Provider<PasskeyAuthenticatorInterface>((ref) => PasskeyAuthenticator());
final authProvider = AsyncNotifierProvider<AuthController, User?>(AuthController.new);

/// Proof of work against bots, what the ALTCHA widget does on the web
/// (README, „ALTCHA“). Isolates keep the UI responsive meanwhile; widget tests
/// solve on the main isolate, their fake clock doesn't wait for others.
final altchaSolverProvider = Provider<Future<altcha.Solution?> Function(altcha.Challenge)>(
  (ref) =>
      (challenge) => altcha.solveChallengeIsolates(
        challenge: challenge,
        deriveKey: altcha.deriveKey,
        concurrency: Platform.numberOfProcessors.clamp(1, 4),
      ),
);

class User {
  final String id;
  final String email;
  final String name;

  /// Since when the account gets update mails, null = off
  final String? updatesSince;
  const User({required this.id, required this.email, required this.name, this.updatesSince});

  factory User.fromJson(Map<String, dynamic> json) => User(
    id: json['id'] as String,
    email: json['email'] as String,
    name: json['name'] as String,
    updatesSince: json['updatesSince'] as String?,
  );

  Map<String, dynamic> toJson() => {'id': id, 'email': email, 'name': name, 'updatesSince': updatesSince};
}

/// The logged-in user, or null. Token and profile live in the platform
/// keychain / keystore, so the app starts logged in even when offline.
class AuthController extends AsyncNotifier<User?> {
  static const _tokenKey = 'session_token';
  static const _userKey = 'user';

  Api get _api => ref.read(apiProvider);
  FlutterSecureStorage get _storage => ref.read(secureStorageProvider);
  PasskeyAuthenticatorInterface get _passkeys => ref.read(passkeyAuthenticatorProvider);

  @override
  Future<User?> build() async {
    _api.onUnauthorized = () => unawaited(_clear());
    final token = await _storage.read(key: _tokenKey);
    final saved = await _storage.read(key: _userKey);
    if (token == null || saved == null) return null;
    _api.token = token;
    unawaited(refresh());
    return User.fromJson(jsonDecode(saved) as Map<String, dynamic>);
  }

  /// Offline keeps the saved user. An expired session logs out.
  Future<void> refresh() async {
    try {
      final user = (await _api.get('/auth/me') as Map<String, dynamic>)['user'];
      if (!ref.mounted) return;
      user == null ? await _clear() : await _save(User.fromJson(user as Map<String, dynamic>));
    } on OfflineException {
      // keep the saved user
    }
  }

  /// Mails a 6-digit code. A magic link can't open the app without
  /// universal links, a code can be typed in anywhere. [updates] is the
  /// unticked opt-in for update mails, it counts once the code is accepted.
  Future<void> requestCode(String email, {bool updates = false}) async =>
      _api.post('/auth/code', {'email': email, 'updates': updates, 'altcha': await _altcha()});

  /// The challenge goes back as the API sent it, its signature covers it.
  Future<String> _altcha() async {
    final challenge = await _api.get('/altcha') as Map<String, dynamic>;
    final solution = await ref.read(altchaSolverProvider)(altcha.Challenge.fromJson(challenge));
    return base64Encode(utf8.encode(jsonEncode({'challenge': challenge, 'solution': solution!.toJson()})));
  }

  Future<void> verifyCode(String email, String code) async =>
      _startSession(await _api.post('/auth/code/verify', {'email': email, 'code': code}) as Map<String, dynamic>);

  /// Passkeys of this domain, see the README, „Passkeys“.
  Future<void> logInWithPasskey() async {
    final options = await _api.post('/auth/passkeys/login/options') as Map<String, dynamic>;
    // Not only passkeys on this phone: also security keys and the QR code for another device
    final request = AuthenticateRequestType.fromJson(options, preferImmediatelyAvailableCredentials: false);
    final response = await _passkeyResult(() => _passkeys.authenticate(request));
    if (response == null) return;
    await _startSession(
      await _api.post('/auth/passkeys/login', {'response': response.toJson()}) as Map<String, dynamic>,
    );
  }

  /// Needs a session: passkeys only exist for accounts that logged in by mail.
  Future<bool> addPasskey() async {
    final options = await _api.post('/auth/passkeys/register/options') as Map<String, dynamic>;
    final response = await _passkeyResult(() => _passkeys.register(RegisterRequestType.fromJson(options)));
    if (response == null) return false;
    await _api.post('/auth/passkeys/register', {'response': response.toJson()});
    return true;
  }

  Future<T?> _passkeyResult<T>(Future<T> Function() action) async {
    try {
      return await action();
    } on PasskeyAuthCancelledException {
      return null;
    } on AuthenticatorException {
      throw ApiException(0, _api.locale.messages.passkeyFailed);
    } on PlatformException {
      throw ApiException(0, _api.locale.messages.passkeyFailed);
    }
  }

  Future<void> _startSession(Map<String, dynamic> json) async {
    final token = json['token'] as String;
    await _storage.write(key: _tokenKey, value: token);
    _api.token = token;
    await _save(User.fromJson(json['user'] as Map<String, dynamic>));
  }

  Future<void> updateName(String name) async {
    final json = await _api.patch('/auth/me', {'name': name}) as Map<String, dynamic>;
    await _save(User.fromJson(json['user'] as Map<String, dynamic>));
  }

  Future<void> setUpdates(bool on) async {
    final json = await _api.patch('/auth/me', {'updates': on}) as Map<String, dynamic>;
    await _save(User.fromJson(json['user'] as Map<String, dynamic>));
  }

  Future<void> logout() async {
    try {
      await _api.post('/auth/logout');
    } on OfflineException {
      // Logging out locally must work offline too.
    }
    await _clear();
  }

  Future<void> _save(User user) async {
    await _storage.write(key: _userKey, value: jsonEncode(user.toJson()));
    state = AsyncData(user);
  }

  // Logs out right away, the keychain catches up.
  Future<void> _clear() async {
    final storage = _storage;
    _api.token = null;
    state = const AsyncData(null);
    await storage.delete(key: _tokenKey);
    await storage.delete(key: _userKey);
  }
}
