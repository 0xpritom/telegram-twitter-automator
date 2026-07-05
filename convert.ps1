Add-Type -AssemblyName System.Drawing
$img = [System.Drawing.Image]::FromFile('d:\Anti_gravity_Workspace\twitter-auto-commenter\icon.jpg')
$img.Save('d:\Anti_gravity_Workspace\twitter-auto-commenter\icon.png', [System.Drawing.Imaging.ImageFormat]::Png)
$img.Dispose()
