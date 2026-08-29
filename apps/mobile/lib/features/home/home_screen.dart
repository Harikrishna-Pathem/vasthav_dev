import 'package:flutter/material.dart';
import '../../l10n/app_localizations.dart';

class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});
  @override
  Widget build(BuildContext context) {
    final strings = AppLocalizations.of(context)!;
    return Scaffold(appBar: AppBar(title: Text(strings.appTitle)), body: Center(child: Text(strings.welcome)));
  }
}
