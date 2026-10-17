import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../config.dart';
import '../../core/auth.dart';
import '../../core/brand.dart';
import '../../core/locale.dart';
import '../feedback/feedback_button.dart';
import '../feedback/feedback_sheet.dart';

class ProfileScreen extends ConsumerStatefulWidget {
  const ProfileScreen({super.key});

  @override
  ConsumerState<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends ConsumerState<ProfileScreen> {
  late final _name = TextEditingController(text: ref.read(authProvider).value?.name);
  bool _busy = false;

  @override
  void dispose() {
    _name.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (_name.text.trim().isEmpty) return;
    setState(() => _busy = true);
    try {
      await ref.read(authProvider.notifier).updateName(_name.text.trim());
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(ref.read(messagesProvider).saved)));
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _setUpdates(bool on) async {
    try {
      await ref.read(authProvider.notifier).setUpdates(on);
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
    }
  }

  Future<void> _addPasskey() async {
    final t = ref.read(messagesProvider);
    String? message;
    try {
      if (await ref.read(authProvider.notifier).addPasskey()) message = t.passkeyAdded;
    } catch (e) {
      message = e.toString();
    }
    if (mounted && message != null) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message)));
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = ref.watch(authProvider).value;
    final t = ref.watch(messagesProvider);
    return Scaffold(
      appBar: AppBar(title: Text(t.profile)),
      bottomNavigationBar: const PleasanceFooter(),
      body: ListView(
        padding: const EdgeInsets.all(24),
        children: [
          Text(user?.email ?? '', style: Theme.of(context).textTheme.bodyLarge),
          const SizedBox(height: 16),
          TextField(
            controller: _name,
            maxLength: 255,
            decoration: InputDecoration(labelText: t.name),
            onSubmitted: (_) => _save(),
          ),
          FilledButton(onPressed: _busy ? null : _save, child: Text(t.save)),
          const SizedBox(height: 16),
          SwitchListTile(
            contentPadding: EdgeInsets.zero,
            title: Text(t.updatesByMail),
            subtitle: Text(t.updatesHint(appName)),
            value: user?.updatesSince != null,
            onChanged: (on) => _setUpdates(on),
          ),
          ListTile(
            contentPadding: EdgeInsets.zero,
            leading: const Icon(Icons.fingerprint),
            title: Text(t.addPasskey),
            subtitle: Text(t.passkeyHint),
            onTap: _addPasskey,
          ),
          const SizedBox(height: 16),
          OutlinedButton.icon(
            onPressed: () => showFeedbackSheet(context, ref, FeedbackKind.idea),
            icon: const Icon(Icons.chat_bubble_outline),
            label: Text(t.giveFeedback),
          ),
          SwitchListTile(
            contentPadding: EdgeInsets.zero,
            title: Text(t.testMode),
            subtitle: Text(t.testModeHint),
            value: ref.watch(testModeProvider).value ?? false,
            onChanged: (on) => ref.read(testModeProvider.notifier).set(on),
          ),
          const SizedBox(height: 8),
          OutlinedButton(
            onPressed: () => ref.read(authProvider.notifier).logout(),
            child: Text(t.logOut),
          ),
        ],
      ),
    );
  }
}
