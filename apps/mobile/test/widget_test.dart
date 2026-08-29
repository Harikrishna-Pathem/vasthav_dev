import 'package:flutter_test/flutter_test.dart';
import 'package:vasthav_mobile/main.dart';
void main() { testWidgets('renders the foundation', (tester) async { await tester.pumpWidget(const VasthavApp()); expect(find.text('Welcome to VASTHAV'), findsOneWidget); }); }
