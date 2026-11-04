import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:latlong2/latlong.dart';
import 'package:starter/app.dart';
import 'package:starter/core/api.dart';

import 'fake_api.dart';

void main() {
  testWidgets('login with code leads to the map and logout back', (tester) async {
    FlutterSecureStorage.setMockInitialValues({});
    tester.platformDispatcher.localesTestValue = const [Locale('de', 'DE')];
    addTearDown(tester.platformDispatcher.clearLocalesTestValue);
    await tester.pumpWidget(ProviderScope(overrides: FakeApi().overrides, child: const App()));
    await tester.pumpAndSettle();

    await tester.enterText(find.byType(TextField), 'robin@example.com');
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.reset);
    for (final size in [const Size(280, 640), const Size(1024, 768), const Size(640, 360)]) {
      tester.view.physicalSize = size;
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull);
      expect(tester.widget<TextField>(find.byType(TextField)).controller!.text, 'robin@example.com');
    }
    await tester.dragUntilVisible(find.text('Code schicken'), find.byType(ListView), const Offset(0, -100));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Code schicken'));
    await tester.pumpAndSettle();
    await tester.enterText(find.byType(TextField).last, '123456');
    tester.view.physicalSize = const Size(768, 1024);
    await tester.pumpAndSettle();
    expect(tester.widget<TextField>(find.byType(TextField).last).controller!.text, '123456');
    await tester.tap(find.text('Anmelden'));
    await tester.pumpAndSettle();
    expect(find.byType(FlutterMap), findsOneWidget);
    final map = tester.widget<FlutterMap>(find.byType(FlutterMap)).mapController!;
    const center = LatLng(48.01, 7.85);
    map.move(center, 14);
    for (final size in [const Size(280, 640), const Size(1024, 768), const Size(768, 1024)]) {
      tester.view.physicalSize = size;
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull);
      expect(map.camera.center.latitude, closeTo(center.latitude, 0.00001));
      expect(map.camera.center.longitude, closeTo(center.longitude, 0.00001));
      expect(map.camera.zoom, 14);
    }

    await tester.tap(find.byIcon(Icons.person_outline));
    await tester.pumpAndSettle();
    expect(find.text('robin@example.com'), findsOneWidget);

    await tester.dragUntilVisible(find.text('Abmelden'), find.byType(ListView), const Offset(0, -200));
    await tester.tap(find.text('Abmelden'));
    await tester.pumpAndSettle();
    expect(find.text('Code schicken'), findsOneWidget);
  });

  testWidgets('profile keeps its draft through narrow, wide and keyboard resizes', (tester) async {
    FlutterSecureStorage.setMockInitialValues({
      'session_token': 'token-1',
      'user': '{"id":"u1","email":"robin@example.com","name":"robin"}',
    });
    tester.platformDispatcher.localesTestValue = const [Locale('de', 'DE')];
    addTearDown(tester.platformDispatcher.clearLocalesTestValue);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.reset);
    final api = FakeApi()..validToken = 'token-1';
    await tester.pumpWidget(ProviderScope(overrides: api.overrides, child: const App()));
    await tester.pumpAndSettle();
    await tester.tap(find.byIcon(Icons.person_outline));
    await tester.pumpAndSettle();
    await tester.enterText(find.byType(TextField), 'Unsaved tablet draft');

    for (final size in [const Size(280, 640), const Size(1024, 768), const Size(768, 1024), const Size(640, 360)]) {
      tester.view.physicalSize = size;
      tester.view.viewPadding = const FakeViewPadding(left: 32, right: 20, bottom: 24);
      tester.view.padding = FakeViewPadding(left: 32, right: 20, bottom: size.height < 400 ? 0 : 24);
      tester.view.viewInsets = FakeViewPadding(bottom: size.height < 400 ? 160 : 0);
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull);
      final field = tester.widget<TextField>(find.byType(TextField));
      expect(field.controller!.text, 'Unsaved tablet draft');
      final rect = tester.getRect(find.byType(TextField));
      expect(rect.left, greaterThanOrEqualTo(32));
      expect(rect.right, lessThanOrEqualTo(size.width - 20));
      expect(rect.width, lessThanOrEqualTo(600));
      await tester.drag(find.byIcon(Icons.bug_report_outlined), const Offset(-1000, 0));
      await tester.pumpAndSettle();
      expect(tester.getRect(find.byIcon(Icons.bug_report_outlined)).left, greaterThanOrEqualTo(32));
    }
    await tester.ensureVisible(find.text('Speichern'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Speichern'));
    await tester.pumpAndSettle();
    expect(api.user['name'], 'Unsaved tablet draft');
  });

  testWidgets('starts in the device language, the button switches and the choice stays', (tester) async {
    FlutterSecureStorage.setMockInitialValues({});
    tester.platformDispatcher.localesTestValue = const [Locale('fr', 'FR'), Locale('en', 'US')];
    addTearDown(tester.platformDispatcher.clearLocalesTestValue);
    final api = FakeApi();
    await tester.pumpWidget(ProviderScope(overrides: api.overrides, child: const App()));
    await tester.pumpAndSettle();

    await tester.enterText(find.byType(TextField), 'robin@example.com');
    await tester.tap(find.text('Send code'));
    await tester.pumpAndSettle();
    expect(api.requests.last.headers['accept-language'], 'en');

    await tester.tap(find.text('Deutsch'));
    await tester.pumpAndSettle();
    expect(find.text('Anmelden'), findsOneWidget);

    // A fresh scope is what the app gets after a restart
    await tester.pumpWidget(ProviderScope(key: UniqueKey(), overrides: FakeApi().overrides, child: const App()));
    await tester.pumpAndSettle();
    expect(find.text('Code schicken'), findsOneWidget);
  });

  testWidgets('an outdated build shows only the update screen', (tester) async {
    FlutterSecureStorage.setMockInitialValues({});
    tester.platformDispatcher.localesTestValue = const [Locale('de', 'DE')];
    addTearDown(tester.platformDispatcher.clearLocalesTestValue);
    await tester.pumpWidget(
      ProviderScope(
        overrides: [...FakeApi().overrides, updateRequiredProvider.overrideWith((ref) async => true)],
        child: const App(),
      ),
    );
    await tester.pumpAndSettle();
    expect(find.text('Update nötig'), findsOneWidget);
    expect(find.text('Jetzt aktualisieren'), findsOneWidget);
    expect(find.text('Code schicken'), findsNothing);
  });
}
