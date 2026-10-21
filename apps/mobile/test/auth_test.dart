import 'dart:convert';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:starter/core/api.dart';
import 'package:starter/core/auth.dart';

import 'fake_api.dart';

/// A fresh container is what the app gets after a restart.
Future<ProviderContainer> start(FakeApi api) async {
  final container = ProviderContainer(overrides: api.overrides);
  addTearDown(container.dispose);
  await container.read(authProvider.future);
  return container;
}

Future<void> logIn(ProviderContainer container) =>
    container.read(authProvider.notifier).verifyCode('robin@example.com', '123456');

void main() {
  setUp(() => FlutterSecureStorage.setMockInitialValues({}));

  test('code login stores the session and sends it as bearer token', () async {
    final api = FakeApi();
    final container = await start(api);
    expect(container.read(authProvider).value, isNull);

    final auth = container.read(authProvider.notifier);
    await auth.requestCode('robin@example.com');
    await expectLater(auth.verifyCode('robin@example.com', '000000'), throwsA(isA<ApiException>()));
    await logIn(container);
    expect(container.read(authProvider).value?.email, 'robin@example.com');

    await auth.updateName('Robin');
    expect(api.requests.last.headers['authorization'], 'Bearer token-1');
    expect(container.read(authProvider).value?.name, 'Robin');
  });

  test('a passkey added after the mail login logs in without mail', () async {
    final api = FakeApi();
    final container = await start(api);
    final auth = container.read(authProvider.notifier);
    await expectLater(auth.addPasskey(), throwsA(isA<ApiException>()));

    await logIn(container);
    await auth.addPasskey();
    expect(api.passkeys.relyingParty, 'example.org');
    expect(jsonDecode(api.requests.last.body)['response']['id'], 'passkey-1');

    await auth.logout();
    await auth.logInWithPasskey();
    expect(container.read(authProvider).value?.email, 'robin@example.com');
    expect(jsonDecode(api.requests.last.body)['response']['response']['signature'], 'e30');

    await auth.logout();
    api.passkeys.id = 'removed';
    await expectLater(auth.logInWithPasskey(), throwsA(isA<ApiException>()));
    expect(container.read(authProvider).value, isNull);
  });

  test('update mails are opt-in at login and switch in the profile', () async {
    final api = FakeApi();
    final container = await start(api);
    final auth = container.read(authProvider.notifier);
    await auth.requestCode('robin@example.com', updates: true);
    expect(jsonDecode(api.requests.last.body), {
      'email': 'robin@example.com',
      'updates': true,
      'altcha': isA<String>(),
    });
    await logIn(container);
    expect(container.read(authProvider).value?.updatesSince, isNull);

    await auth.setUpdates(true);
    expect(container.read(authProvider).value?.updatesSince, isNotNull);
    await auth.setUpdates(false);
    expect(container.read(authProvider).value?.updatesSince, isNull);
  });

  test('a restart keeps the login, also offline', () async {
    final api = FakeApi();
    await logIn(await start(api));

    api.online = false;
    final restarted = await start(api);
    expect(restarted.read(authProvider).value?.email, 'robin@example.com');
  });

  test('an expired session logs out', () async {
    final api = FakeApi();
    await logIn(await start(api));

    api.validToken = null;
    final restarted = await start(api);
    await restarted.read(authProvider.notifier).refresh();
    expect(restarted.read(authProvider).value, isNull);
    expect((await start(api)).read(authProvider).value, isNull);
  });

  test('a 401 logs out', () async {
    final api = FakeApi();
    final container = await start(api);
    await logIn(container);

    api.validToken = 'rotated';
    await expectLater(container.read(authProvider.notifier).updateName('X'), throwsA(isA<ApiException>()));
    expect(container.read(authProvider).value, isNull);
  });

  test('logout works offline', () async {
    final api = FakeApi();
    final container = await start(api);
    await logIn(container);

    api.online = false;
    await container.read(authProvider.notifier).logout();
    expect(container.read(authProvider).value, isNull);
    expect((await start(api)).read(authProvider).value, isNull);
  });
}
