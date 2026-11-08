# Generates the PNG app icons referenced by public/manifest.webmanifest.
# Requires Windows PowerShell (System.Drawing).
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$root = Split-Path -Parent $PSScriptRoot
$publicDir = Join-Path $root 'public'
if (-not (Test-Path $publicDir)) {
  throw "Missing public directory: $publicDir"
}

function New-RoundedRectPath {
  param(
    [float]$X,
    [float]$Y,
    [float]$Width,
    [float]$Height,
    [float]$Radius
  )
  $diameter = [Math]::Min($Radius * 2, [Math]::Min($Width, $Height))
  $path = New-Object System.Drawing.Drawing2D.GraphicsPath
  $path.AddArc($X, $Y, $diameter, $diameter, 180, 90)
  $path.AddArc($X + $Width - $diameter, $Y, $diameter, $diameter, 270, 90)
  $path.AddArc($X + $Width - $diameter, $Y + $Height - $diameter, $diameter, $diameter, 0, 90)
  $path.AddArc($X, $Y + $Height - $diameter, $diameter, $diameter, 90, 90)
  $path.CloseFigure()
  return $path
}

function New-Icon {
  param(
    [int]$Size,
    [bool]$Maskable,
    [string]$OutputPath
  )

  $scale = 4
  $canvasSize = $Size * $scale
  $unit = $canvasSize / 512.0

  $bitmap = New-Object System.Drawing.Bitmap($canvasSize, $canvasSize)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
  $graphics.Clear([System.Drawing.Color]::Transparent)

  $topColor = [System.Drawing.ColorTranslator]::FromHtml('#34D399')
  $bottomColor = [System.Drawing.ColorTranslator]::FromHtml('#047857')
  $fullRect = New-Object System.Drawing.RectangleF(0, 0, $canvasSize, $canvasSize)
  $backgroundBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
    $fullRect,
    $topColor,
    $bottomColor,
    45.0
  )

  if ($Maskable) {
    $graphics.FillRectangle($backgroundBrush, $fullRect)
  } else {
    $backgroundPath = New-RoundedRectPath -X 0 -Y 0 -Width $canvasSize -Height $canvasSize -Radius (128 * $unit)
    $graphics.FillPath($backgroundBrush, $backgroundPath)
    $backgroundPath.Dispose()
  }

  $white = [System.Drawing.Brushes]::White
  $bubble = New-RoundedRectPath -X (144 * $unit) -Y (136 * $unit) -Width (224 * $unit) -Height (176 * $unit) -Radius (28 * $unit)
  $graphics.FillPath($white, $bubble)
  $bubble.Dispose()

  $tailPoints = @(
    (New-Object System.Drawing.PointF((244 * $unit), (296 * $unit))),
    (New-Object System.Drawing.PointF((180.8 * $unit), (356.4 * $unit))),
    (New-Object System.Drawing.PointF((168 * $unit), (356.4 * $unit))),
    (New-Object System.Drawing.PointF((168 * $unit), (292 * $unit)))
  )
  $graphics.FillPolygon($white, $tailPoints)

  $green = [System.Drawing.ColorTranslator]::FromHtml('#047857')
  $linePen = New-Object System.Drawing.Pen($green, (21 * $unit))
  $linePen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $linePen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
  $graphics.DrawLine($linePen, 208 * $unit, 204 * $unit, 304 * $unit, 204 * $unit)
  $graphics.DrawLine($linePen, 208 * $unit, 244 * $unit, 272 * $unit, 244 * $unit)
  $linePen.Dispose()

  $badgeFill = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml('#111B21'))
  $badgeOutline = New-Object System.Drawing.Pen([System.Drawing.Color]::White, (24 * $unit))
  $badgeRect = New-Object System.Drawing.RectangleF(
    (304 * $unit),
    (312 * $unit),
    (128 * $unit),
    (128 * $unit)
  )
  $graphics.FillEllipse($badgeFill, $badgeRect)
  $graphics.DrawEllipse($badgeOutline, $badgeRect)

  $checkPen = New-Object System.Drawing.Pen([System.Drawing.Color]::White, (18 * $unit))
  $checkPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $checkPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
  $checkPen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
  $graphics.DrawLines(
    $checkPen,
    @(
      (New-Object System.Drawing.PointF((344 * $unit), (376 * $unit))),
      (New-Object System.Drawing.PointF((360 * $unit), (392 * $unit))),
      (New-Object System.Drawing.PointF((392 * $unit), (360 * $unit)))
    )
  )
  $checkPen.Dispose()
  $badgeOutline.Dispose()
  $badgeFill.Dispose()
  $backgroundBrush.Dispose()
  $graphics.Dispose()

  $finalBitmap = New-Object System.Drawing.Bitmap($Size, $Size)
  $finalGraphics = [System.Drawing.Graphics]::FromImage($finalBitmap)
  $finalGraphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $finalGraphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $finalGraphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
  $finalGraphics.DrawImage($bitmap, 0, 0, $Size, $Size)
  $finalGraphics.Dispose()

  $finalBitmap.Save($OutputPath, [System.Drawing.Imaging.ImageFormat]::Png)
  $finalBitmap.Dispose()
  $bitmap.Dispose()
}

New-Icon -Size 192 -Maskable $false -OutputPath (Join-Path $publicDir 'icon-192.png')
New-Icon -Size 512 -Maskable $false -OutputPath (Join-Path $publicDir 'icon-512.png')
New-Icon -Size 512 -Maskable $true -OutputPath (Join-Path $publicDir 'icon-maskable-512.png')

Write-Output 'Generated icon-192.png, icon-512.png, and icon-maskable-512.png.'
