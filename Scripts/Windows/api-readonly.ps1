$BaseUrl = if ($env:BASE_URL) { $env:BASE_URL } else { "http://localhost:8080" }
$SlotId = if ($env:SLOT_ID) { $env:SLOT_ID } else { "1" }
$ClientId = if ($env:CLIENT_ID) { $env:CLIENT_ID } else { "1" }

Write-Host "Base URL: $BaseUrl"
Write-Host "Slot ID: $SlotId"
Write-Host "Client ID: $ClientId"
Write-Host ""

function Invoke-GetRequest {
    param (
        [string]$Path
    )

    $url = "$BaseUrl$Path"
    Write-Host "==> GET $url"
    Invoke-RestMethod -Method Get -Uri $url | ConvertTo-Json -Depth 10
    Write-Host ""
}

# Slots
Invoke-GetRequest "/api/slots"
Invoke-GetRequest "/api/slots/$SlotId/bank"

# Clients
$clientsPath = "/api/slots/$SlotId/clients"
$clientsUrl = "$BaseUrl$clientsPath"
Write-Host "==> GET $clientsUrl"
$clients = Invoke-RestMethod -Method Get -Uri $clientsUrl
$clients | ConvertTo-Json -Depth 10
Write-Host ""

$clientList = @($clients)
$clientCount = $clientList.Count
$clientLabel = if ($clientCount -eq 1) { "client" } else { "clients" }
$verb = if ($clientCount -eq 1) { "exists" } else { "exist" }
if ($clientCount -gt 0) {
    foreach ($client in $clientList) {
        $id = $client.id
        Invoke-GetRequest "/api/slots/$SlotId/clients/$id"
        Invoke-GetRequest "/api/slots/$SlotId/clients/$id/transactions"
    }
}

Write-Host "Only $clientCount $clientLabel $verb in save file $SlotId."
Write-Host "Please create new clients if you wish to display more data."
Write-Host ""

# Investments & Charts
Invoke-GetRequest "/api/slots/$SlotId/investments/sp500"
Invoke-GetRequest "/api/slots/$SlotId/charts/clients"
