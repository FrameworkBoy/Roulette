!macro customInstall
  DetailPrint "Encerrando instâncias anteriores..."
  nsExec::Exec 'taskkill /F /IM "Roulette.exe" /T'
  Sleep 1000
!macroend

!macro customUnInstall
  DetailPrint "Encerrando instâncias anteriores..."
  nsExec::Exec 'taskkill /F /IM "Roulette.exe" /T'
  Sleep 1000
!macroend
