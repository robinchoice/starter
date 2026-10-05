/// Every text the app shows, one class per language. A text missing in one
/// language is a compile error. Web and API have theirs in
/// packages/shared/src/messages.ts.
enum AppLocale {
  de(De()),
  en(En());

  const AppLocale(this.messages);
  final Messages messages;
}

abstract class Messages {
  const Messages();

  String get madeBy;

  /// Label of the language button, in the language it switches to
  String get otherLanguage;
  String get offline;
  String serverError(int status);
  String get loginIntro;
  String get codeSent;
  String get email;
  String get code;
  String get sendCode;
  String get logIn;
  String get otherEmail;
  String get locationDenied;
  String get locationUnavailable;
  String get myLocation;
  String get profile;
  String get name;
  String get save;
  String get saved;
  String get logOut;
}

class De extends Messages {
  const De();

  @override
  String get madeBy => 'ein Werkzeug von';
  @override
  String get otherLanguage => 'English';
  @override
  String get offline => 'Keine Verbindung zum Server';
  @override
  String serverError(int status) => 'Serverfehler ($status)';
  @override
  String get loginIntro => 'Kein Passwort nötig, wir schicken dir einen Code per Mail.';
  @override
  String get codeSent => 'Wir haben dir einen 6-stelligen Code geschickt.';
  @override
  String get email => 'E-Mail';
  @override
  String get code => 'Code';
  @override
  String get sendCode => 'Code schicken';
  @override
  String get logIn => 'Anmelden';
  @override
  String get otherEmail => 'Andere E-Mail / neuen Code';
  @override
  String get locationDenied => 'Standort nicht freigegeben';
  @override
  String get locationUnavailable => 'Standort nicht verfügbar';
  @override
  String get myLocation => 'Mein Standort';
  @override
  String get profile => 'Profil';
  @override
  String get name => 'Name';
  @override
  String get save => 'Speichern';
  @override
  String get saved => 'Gespeichert';
  @override
  String get logOut => 'Abmelden';
}

class En extends Messages {
  const En();

  @override
  String get madeBy => 'a tool by';
  @override
  String get otherLanguage => 'Deutsch';
  @override
  String get offline => 'No connection to the server';
  @override
  String serverError(int status) => 'Server error ($status)';
  @override
  String get loginIntro => "No password needed, we'll email you a code.";
  @override
  String get codeSent => 'We sent you a 6-digit code.';
  @override
  String get email => 'Email';
  @override
  String get code => 'Code';
  @override
  String get sendCode => 'Send code';
  @override
  String get logIn => 'Log in';
  @override
  String get otherEmail => 'Other email / new code';
  @override
  String get locationDenied => 'Location access not granted';
  @override
  String get locationUnavailable => 'Location unavailable';
  @override
  String get myLocation => 'My location';
  @override
  String get profile => 'Profile';
  @override
  String get name => 'Name';
  @override
  String get save => 'Save';
  @override
  String get saved => 'Saved';
  @override
  String get logOut => 'Log out';
}
