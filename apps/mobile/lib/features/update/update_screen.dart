import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../config.dart';
import '../../core/brand.dart';
import '../../core/locale.dart';

/// Replaces the app when the API no longer serves this build.
class UpdateScreen extends ConsumerWidget {
  const UpdateScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final t = ref.watch(messagesProvider);
    final store = defaultTargetPlatform == TargetPlatform.iOS
        ? 'https://apps.apple.com/app/id$appStoreId'
        : 'https://play.google.com/store/apps/details?id=$appId';
    return Scaffold(
      bottomNavigationBar: const PleasanceFooter(),
      body: SafeArea(
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 420),
            child: ListView(
              padding: const EdgeInsets.all(24),
              shrinkWrap: true,
              children: [
                Text(t.updateTitle, style: theme.textTheme.headlineMedium, textAlign: TextAlign.center),
                const SizedBox(height: 8),
                Text(
                  t.updateRequired(appName),
                  textAlign: TextAlign.center,
                  style: theme.textTheme.bodyMedium?.copyWith(color: theme.colorScheme.outline),
                ),
                const SizedBox(height: 24),
                FilledButton(
                  onPressed: () => launchUrl(Uri.parse(store), mode: LaunchMode.externalApplication),
                  child: Text(t.updateNow),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
