import 'dart:convert';

import 'package:altcha_lib/altcha_lib.dart' as altcha;
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:passkeys/types.dart';
import 'package:starter/core/api.dart';
import 'package:starter/core/auth.dart';

/// Stands in for the auth and feedback routes of the Hono API. The code is
/// always 123456, ALTCHA challenges are real.
class FakeApi {
  static const _altchaSecret = 'test';

  final requests = <http.Request>[];
  bool online = true;
  String? validToken;
  var user = <String, Object?>{'id': 'u1', 'email': 'robin@example.com', 'name': 'robin', 'updatesSince': null};

  late final client = MockClient((request) async {
    if (!online) throw http.ClientException('offline');
    requests.add(request);
    final loggedIn = validToken != null && request.headers['authorization'] == 'Bearer $validToken';
    switch ((request.method, request.url.path)) {
      case ('GET', '/api/v1/altcha'):
        final challenge = await altcha.createChallenge(
          algorithm: 'PBKDF2/SHA-256',
          cost: 100,
          counter: 2000,
          deriveKey: altcha.deriveKey,
          hmacSignatureSecret: _altchaSecret,
        );
        return _json(challenge.toJson());
      case ('POST', '/api/v1/auth/code'):
        final payload = jsonDecode(utf8.decode(base64Decode(jsonDecode(request.body)['altcha'] as String)));
        final result = await altcha.verifySolution(
          challenge: altcha.Challenge.fromJson(payload['challenge'] as Map<String, dynamic>),
          solution: altcha.Solution.fromJson(payload['solution'] as Map<String, dynamic>),
          deriveKey: altcha.deriveKey,
          hmacSignatureSecret: _altchaSecret,
        );
        if (!result.verified) return _json({'error': 'Die Prüfung gegen Bots ist fehlgeschlagen.'}, 403);
        return _json({'ok': true});
      case ('POST', '/api/v1/auth/code/verify'):
        if (jsonDecode(request.body)['code'] != '123456') {
          return _json({'error': 'Der Code stimmt nicht oder ist abgelaufen.'}, 400);
        }
        validToken = 'token-1';
        return _json({'user': user, 'token': validToken});
      case ('GET', '/api/v1/auth/me'):
        return _json({'user': loggedIn ? user : null});
      case ('PATCH', '/api/v1/auth/me'):
        if (!loggedIn) return _json({'error': 'Nicht angemeldet'}, 401);
        final body = jsonDecode(request.body) as Map<String, dynamic>;
        user = {
          ...user,
          if (body.containsKey('name')) 'name': body['name'],
          if (body.containsKey('updates')) 'updatesSince': body['updates'] == true ? '2026-10-13T10:00:00.000Z' : null,
        };
        return _json({'user': user});
      case ('POST', '/api/v1/auth/passkeys/login/options'):
        return _json({'challenge': 'Y2hhbGxlbmdl', 'rpId': 'example.org', 'userVerification': 'preferred'});
      case ('POST', '/api/v1/auth/passkeys/login'):
        if (jsonDecode(request.body)['response']['id'] != 'passkey-1') {
          return _json({'error': 'Diesen Passkey kennen wir nicht. Melde dich per Mail an.'}, 400);
        }
        validToken = 'token-1';
        return _json({'user': user, 'token': validToken});
      case ('POST', '/api/v1/auth/passkeys/register/options'):
        if (!loggedIn) return _json({'error': 'Nicht angemeldet'}, 401);
        return _json({
          'challenge': 'Y2hhbGxlbmdl',
          'rp': {'name': 'Starter', 'id': 'example.org'},
          'user': {'id': 'dTE', 'name': user['email'], 'displayName': user['name']},
          'pubKeyCredParams': [
            {'alg': -7, 'type': 'public-key'},
          ],
          'excludeCredentials': <Object>[],
          'authenticatorSelection': {'residentKey': 'required', 'userVerification': 'preferred'},
        });
      case ('POST', '/api/v1/auth/passkeys/register'):
        if (!loggedIn) return _json({'error': 'Nicht angemeldet'}, 401);
        return _json({
          'passkey': {'id': jsonDecode(request.body)['response']['id']},
        });
      case ('POST', '/api/v1/feedback'):
        if (!loggedIn) return _json({'error': 'Nicht angemeldet'}, 401);
        return _json({'ok': true});
      case ('POST', '/api/v1/auth/logout'):
        validToken = null;
        return _json({'ok': true});
    }
    return _json({'error': 'Nicht gefunden'}, 404);
  });

  final passkeys = FakePasskeys();

  late final overrides = [
    httpClientProvider.overrideWithValue(client),
    passkeyAuthenticatorProvider.overrideWithValue(passkeys),
    altchaSolverProvider.overrideWithValue(
      (challenge) => altcha.solveChallenge(challenge: challenge, deriveKey: altcha.deriveKey),
    ),
  ];
}

http.Response _json(Object body, [int status = 200]) =>
    http.Response(jsonEncode(body), status, headers: {'content-type': 'application/json'});

/// Stands in for Face ID or the Android credential manager: hands out the
/// passkey [id] for whatever domain the request names.
class FakePasskeys implements PasskeyAuthenticatorInterface {
  String id = 'passkey-1';
  String? relyingParty;

  @override
  Future<RegisterResponseType> register(RegisterRequestType request) async {
    relyingParty = request.relyingParty.id;
    return RegisterResponseType(
      id: id,
      rawId: id,
      clientDataJSON: 'e30',
      attestationObject: 'e30',
      transports: const ['internal'],
    );
  }

  @override
  Future<AuthenticateResponseType> authenticate(AuthenticateRequestType request) async {
    relyingParty = request.relyingPartyId;
    return AuthenticateResponseType(
      id: id,
      rawId: id,
      clientDataJSON: 'e30',
      authenticatorData: 'e30',
      signature: 'e30',
      userHandle: 'dTE',
    );
  }

  @override
  Future<void> signalUnknownCredential(SignalUnknownCredentialRequestType request) async {}

  @override
  Future<void> signalAllAcceptedCredentials(SignalAllAcceptedCredentialsRequestType request) async {}
}
