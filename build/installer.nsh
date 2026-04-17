!macro customInit
  nsExec::Exec 'taskkill /F /IM "Roulette.exe" /T'
  Pop $0
  Sleep 1500
  RMDir /r "$LOCALAPPDATA\Programs\Roulette"
!macroend

!macro customUnInstall
  nsExec::Exec 'taskkill /F /IM "Roulette.exe" /T'
  Pop $0
  Sleep 1500
!macroend
