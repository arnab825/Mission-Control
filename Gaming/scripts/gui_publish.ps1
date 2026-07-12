param()

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$form = New-Object System.Windows.Forms.Form
$form.Text = "Publish Release"
$form.Size = New-Object System.Drawing.Size(400, 450)
$form.StartPosition = "CenterScreen"
$form.FormBorderStyle = "FixedDialog"
$form.MaximizeBox = $false

# Title Label & TextBox
$labelTitle = New-Object System.Windows.Forms.Label
$labelTitle.Text = "Title:"
$labelTitle.Location = New-Object System.Drawing.Point(10, 20)
$labelTitle.AutoSize = $true
$form.Controls.Add($labelTitle)

$textTitle = New-Object System.Windows.Forms.TextBox
$textTitle.Location = New-Object System.Drawing.Point(80, 20)
$textTitle.Size = New-Object System.Drawing.Size(280, 20)
$form.Controls.Add($textTitle)

# Type Label & ComboBox
$labelType = New-Object System.Windows.Forms.Label
$labelType.Text = "Type:"
$labelType.Location = New-Object System.Drawing.Point(10, 60)
$labelType.AutoSize = $true
$form.Controls.Add($labelType)

$comboType = New-Object System.Windows.Forms.ComboBox
$comboType.Location = New-Object System.Drawing.Point(80, 60)
$comboType.Size = New-Object System.Drawing.Size(120, 20)
$comboType.DropDownStyle = [System.Windows.Forms.ComboBoxStyle]::DropDownList
$comboType.Items.Add("patch")
$comboType.Items.Add("minor")
$comboType.Items.Add("major")
$comboType.SelectedIndex = 0
$form.Controls.Add($comboType)

# Changes Label & Multiline TextBox
$labelChanges = New-Object System.Windows.Forms.Label
$labelChanges.Text = "Changes:`n(One per line)"
$labelChanges.Location = New-Object System.Drawing.Point(10, 100)
$labelChanges.AutoSize = $true
$form.Controls.Add($labelChanges)

$textChanges = New-Object System.Windows.Forms.TextBox
$textChanges.Location = New-Object System.Drawing.Point(80, 100)
$textChanges.Size = New-Object System.Drawing.Size(280, 150)
$textChanges.Multiline = $true
$textChanges.ScrollBars = "Vertical"
$form.Controls.Add($textChanges)

# Image URL Label & TextBox
$labelImage = New-Object System.Windows.Forms.Label
$labelImage.Text = "Image URL:`n(Optional)"
$labelImage.Location = New-Object System.Drawing.Point(10, 270)
$labelImage.AutoSize = $true
$form.Controls.Add($labelImage)

$textImage = New-Object System.Windows.Forms.TextBox
$textImage.Location = New-Object System.Drawing.Point(80, 275)
$textImage.Size = New-Object System.Drawing.Size(280, 20)
$form.Controls.Add($textImage)

# Buttons
$btnPublish = New-Object System.Windows.Forms.Button
$btnPublish.Text = "Publish"
$btnPublish.Location = New-Object System.Drawing.Point(180, 340)
$btnPublish.Size = New-Object System.Drawing.Size(80, 30)
$btnPublish.DialogResult = "OK"
$form.Controls.Add($btnPublish)

$btnCancel = New-Object System.Windows.Forms.Button
$btnCancel.Text = "Cancel"
$btnCancel.Location = New-Object System.Drawing.Point(280, 340)
$btnCancel.Size = New-Object System.Drawing.Size(80, 30)
$btnCancel.DialogResult = "Cancel"
$form.Controls.Add($btnCancel)

$form.AcceptButton = $btnPublish
$form.CancelButton = $btnCancel

$result = $form.ShowDialog()

if ($result -eq [System.Windows.Forms.DialogResult]::OK) {
    if (-not $textTitle.Text) {
        [System.Windows.Forms.MessageBox]::Show("Title is required.", "Error", [System.Windows.Forms.MessageBoxButtons]::OK, [System.Windows.Forms.MessageBoxIcon]::Error)
        return
    }

    $title = $textTitle.Text
    $type = $comboType.SelectedItem
    $changes = $textChanges.Text -split "`r`n|`n" | Where-Object { $_.Trim() -ne "" }
    $image = $textImage.Text

    $publishScript = Join-Path $PSScriptRoot "publish.ps1"
    
    $args = @("-Title", "`"$title`"", "-Type", $type)
    if ($image) {
        $args += "-Image"
        $args += "`"$image`""
    }
    
    if ($changes.Count -gt 0) {
        $args += "-Changes"
        foreach ($change in $changes) {
            $args += "`"$change`""
        }
    }

    Write-Host "Running: .\publish.ps1 $args" -ForegroundColor Cyan
    Invoke-Expression "& `"$publishScript`" $args"
}
