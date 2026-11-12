import 'dart:convert';
import 'dart:math';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:starter/core/api.dart';
import 'package:starter/core/brand.dart';
import 'package:starter/core/dock.dart';

const _tile =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="24"/></svg>';

final _apps = {
  'apps': [
    {
      'name': 'Music Hub',
      'url': 'https://hub.pleasance.org',
      'icon': 'https://pleasance.org/img/werkzeuge/musichub.svg',
      'band': {'from': 1.35, 'to': 2.2},
    },
    {
      'name': 'Döner',
      'url': 'https://doener-api.pleasance.org',
      'icon': 'https://pleasance.org/img/werkzeuge/doener.svg',
      'band': {'from': 2.55, 'to': 3.2},
    },
    {
      'name': 'Savor',
      'url': 'https://savor.pleasance.org',
      'icon': 'https://pleasance.org/img/werkzeuge/savor.svg',
      'band': {'from': 5.5, 'to': 6.45},
      'desktop': true,
    },
  ],
};

Future<List<http.Request>> _pumpFooter(WidgetTester tester) async {
  FlutterSecureStorage.setMockInitialValues({});
  tester.platformDispatcher.localesTestValue = const [Locale('de', 'DE')];
  addTearDown(tester.platformDispatcher.clearLocalesTestValue);
  final requests = <http.Request>[];
  final client = MockClient((request) async {
    requests.add(request);
    if (request.url.toString() == pleasanceAppsUrl) {
      return http.Response.bytes(utf8.encode(jsonEncode(_apps)), 200);
    }
    if (request.url.path.startsWith('/img/werkzeuge/')) return http.Response(_tile, 200);
    return http.Response('', 404);
  });
  await tester.pumpWidget(
    ProviderScope(
      overrides: [httpClientProvider.overrideWithValue(client)],
      child: const MaterialApp(
        home: Scaffold(body: SizedBox.expand(), bottomNavigationBar: PleasanceFooter()),
      ),
    ),
  );
  await tester.pumpAndSettle();
  return requests;
}

void main() {
  test('the dock grows around the finger and never overlaps or leaves the screen', () {
    final random = Random(7);
    for (var run = 0; run < 500; run++) {
      final sizes = [for (var i = 0; i < 4 + random.nextInt(6); i++) random.nextBool() ? 40.0 : 24.0];
      const max = 390.0 - 8;
      final pointer = random.nextBool() ? null : random.nextDouble() * 390;
      final row = dockLayout(
        sizes: sizes,
        gap: 8,
        grow: 0.45,
        reach: 2.5,
        center: 40 + random.nextDouble() * 300,
        pointer: pointer,
        min: 8,
        max: max,
      );
      for (var i = 0; i < row.length; i++) {
        expect(row[i].size, greaterThanOrEqualTo(sizes[i]));
        if (pointer == null) expect(row[i].size, sizes[i]);
        if (i > 0) expect(row[i].left, closeTo(row[i - 1].left + row[i - 1].size + 8, 1e-9));
      }
      expect(row.first.left, greaterThanOrEqualTo(8 - 1e-9));
      if (row.last.left + row.last.size > max + 1e-9) {
        // Only when the row is wider than the screen, then it starts at the left edge
        expect(row.first.left, 8);
      }
    }
  });

  test('apps.json with anything but web links is rejected', () {
    expect(parsePleasanceApps(_apps), hasLength(3));
    final bad = jsonDecode(jsonEncode(_apps)) as Map<String, Object?>;
    ((bad['apps'] as List).first as Map)['url'] = 'javascript:alert(1)';
    expect(() => parsePleasanceApps(bad), throwsFormatException);
  });

  testWidgets('tapping the band pops up the apps, sliding shows their names', (tester) async {
    final requests = await _pumpFooter(tester);
    expect(requests, isEmpty, reason: 'the list loads on first use only');
    expect(find.bySemanticsLabel('ein Werkzeug von Pleasance'), findsOneWidget);

    await tester.tap(find.bySemanticsLabel('Werkzeuge von Pleasance'));
    await tester.pumpAndSettle();
    expect(requests.first.url.toString(), pleasanceAppsUrl);
    expect(find.bySemanticsLabel('Music Hub'), findsOneWidget);
    expect(find.bySemanticsLabel('Savor, Desktop-App'), findsOneWidget);

    // Sliding onto an icon names it, like the Dock
    final doener = tester.getCenter(find.bySemanticsLabel('Döner'));
    final gesture = await tester.startGesture(doener + const Offset(0, 30));
    await gesture.moveTo(doener);
    await tester.pump();
    expect(find.text('Döner', findRichText: true), findsOneWidget);
    await gesture.moveTo(doener + const Offset(0, 200));
    await gesture.up();
    await tester.pump();

    // A tap next to the dock closes it
    await tester.tapAt(const Offset(20, 20));
    await tester.pumpAndSettle();
    expect(find.bySemanticsLabel('Music Hub'), findsNothing);
  });
}
