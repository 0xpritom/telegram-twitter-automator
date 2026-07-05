Add-Type -AssemblyName System.Drawing
$img = [System.Drawing.Image]::FromFile('C:\Users\tamim\.gemini\antigravity\brain\c49f3958-669b-44ac-b00e-defb4e9f4933\global_auto_reply_logo_1783181254394.jpg')
$img.Save('d:\Anti_gravity_Workspace\twitter-auto-commenter\icon.png', [System.Drawing.Imaging.ImageFormat]::Png)
$img.Dispose()
