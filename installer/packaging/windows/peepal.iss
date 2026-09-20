; Inno Setup script for the Windows installer.
;
; Build with:
;   iscc /DVersion=1.4.0 /DBinDir=..\..\dist\windows_amd64 packaging\windows\peepal.iss
;
; The .exe this produces is a thin wrapper: it copies the two Go programs into
; Program Files, then runs peepal-installer.exe, which does the real work
; (database, downloads, service registration).

#ifndef Version
  #define Version "0.0.0"
#endif
#ifndef BinDir
  #define BinDir "..\..\dist\windows_amd64"
#endif

[Setup]
AppId={{9C1F3B4E-6D3A-4C21-9A2F-6E7B1D2A5C08}
AppName=Peepal ERP
AppVersion={#Version}
AppPublisher=Peepal
DefaultDirName={autopf}\PeepalRP
DefaultGroupName=Peepal
DisableProgramGroupPage=yes
OutputBaseFilename=PeepalSetup-{#Version}
Compression=lzma2/max
SolidCompression=yes
WizardStyle=modern
; The installer creates services and writes to Program Files.
PrivilegesRequired=admin
ArchitecturesInstallIn64BitMode=x64compatible
ArchitecturesAllowed=x64compatible
UninstallDisplayIcon={app}\bin\peepal-agent.exe

[Files]
Source: "{#BinDir}\peepal-installer.exe"; DestDir: "{app}\bin"; Flags: ignoreversion
Source: "{#BinDir}\peepal-agent.exe";     DestDir: "{app}\bin"; Flags: ignoreversion

[Icons]
Name: "{group}\Open Peepal";      Filename: "http://localhost/"
Name: "{group}\Uninstall Peepal"; Filename: "{uninstallexe}"
Name: "{autodesktop}\Peepal";     Filename: "http://localhost/"; Tasks: desktopicon

[Tasks]
Name: "desktopicon"; Description: "Create a desktop shortcut to Peepal"; GroupDescription: "Shortcuts:"

[Run]
; Runs in a console window so the administrator can answer the setup
; questions (admin account, local AI, update policy).
Filename: "{app}\bin\peepal-installer.exe"; \
  Parameters: "--dir ""{app}"""; \
  StatusMsg: "Setting up Peepal. This window will ask a few questions..."; \
  Flags: waituntilterminated

[UninstallRun]
; Removes the scheduled task and the program files but keeps the database.
Filename: "{app}\bin\peepal-installer.exe"; \
  Parameters: "--uninstall --unattended --keep-data --dir ""{app}"""; \
  Flags: runhidden waituntilterminated; RunOnceId: "PeepalUninstall"
