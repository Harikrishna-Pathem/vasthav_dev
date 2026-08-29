import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'features/home/home_screen.dart';
import 'l10n/app_localizations.dart';

final _router = GoRouter(routes: [GoRoute(path: '/', builder: (_, __) => const HomeScreen())]);
void main() => runApp(const ProviderScope(child: VasthavApp()));
class VasthavApp extends StatelessWidget {
  const VasthavApp({super.key});
  @override
  Widget build(BuildContext context) => MaterialApp.router(
    onGenerateTitle: (context) => AppLocalizations.of(context)!.appTitle,
    routerConfig: _router,
    localizationsDelegates: const [AppLocalizations.delegate, GlobalMaterialLocalizations.delegate, GlobalWidgetsLocalizations.delegate, GlobalCupertinoLocalizations.delegate],
    supportedLocales: const [Locale('en'), Locale('te'), Locale('hi')],
    theme: ThemeData(colorSchemeSeed: Colors.indigo, useMaterial3: true),
  );
}
