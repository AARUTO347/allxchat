$json = Get-Content 'src/registry/modules.json' -Raw | ConvertFrom-Json
$modules = $json.modules
Write-Host "Total: $($modules.Count)"
Write-Host "Last 5:"
$modules[-5..-1] | ForEach-Object { Write-Host "$($_.id) | $($_.name) | $($_.category) | $($_.bus) | $($_.api)" }

$bjson = Get-Content 'src/registry/boards.json' -Raw | ConvertFrom-Json
$boards = $bjson.boards
Write-Host "`nBoards: $($boards.Count)"
Write-Host "Last 3:"
$boards[-3..-1] | ForEach-Object { Write-Host "$($_.id) | $($_.name) | $($_.family)" }
Write-Host "First keys: $($boards[0].PSObject.Properties.Name -join ', ')"