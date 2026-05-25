import { execFileSync } from 'node:child_process';
import type { UsageResult } from './types.js';

function notifyWindows(title: string, body: string, durationMs: number): void {
  const escapeXml = (str: string) => str.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });

  const escapedTitle = escapeXml(title);
  const escapedBody = escapeXml(body);

  const cleanTitle = title.toLowerCase().replace(/[^a-z0-9]/g, '');
  const tag = `ai-usage-${cleanTitle || 'default'}`;

  const psScript = `
    try {
      [Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] | Out-Null
      $xmlString = @"
<toast>
  <visual>
    <binding template="ToastGeneric">
      <text>${escapedTitle}</text>
      <text>${escapedBody}</text>
    </binding>
  </visual>
</toast>
"@
      $xml = New-Object Windows.Data.Xml.Dom.XmlDocument
      $xml.LoadXml($xmlString)
      $toast = New-Object Windows.UI.Notifications.ToastNotification $xml
      $toast.Tag = '${tag}'
      $toast.Group = 'ai-usage-watch'
      [Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier('AI Usage Watch').Show($toast)
    } catch {
      [void] [System.Reflection.Assembly]::LoadWithPartialName('System.Windows.Forms');
      $notification = New-Object System.Windows.Forms.NotifyIcon;
      $notification.Icon = [System.Drawing.SystemIcons]::Information;
      $notification.BalloonTipIcon = 'Info';
      $notification.BalloonTipTitle = '${title.replace(/'/g, "''")}';
      $notification.BalloonTipText = '${body.replace(/'/g, "''")}';
      $notification.Visible = $true;
      $notification.ShowBalloonTip(${durationMs});
    }
  `.trim();

  try {
    const buffer = Buffer.from(psScript, 'utf-16le');
    const base64 = buffer.toString('base64');
    execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-EncodedCommand', base64], { stdio: 'ignore' });
  } catch {
    // Best-effort
  }
}

export function notify(title: string, body: string): void {
  try {
    if (process.platform === 'win32') {
      notifyWindows(title, body, 12000);
    } else {
      execFileSync('notify-send', ['-u', 'low', '-t', '12000', title, body], { stdio: 'ignore' });
    }
  } catch {
    // Desktop notifications are best-effort only.
  }
}

export function notifyStart(enabled: boolean, title = '🔋 OpenCode Go', body = '🔍 Checking your usage...'): void {
  if (!enabled) return;

  try {
    if (process.platform === 'win32') {
      // No-op on Windows to prevent notification spam and Action Center queuing lag.
      return;
    } else {
      execFileSync('notify-send', ['-u', 'low', '-t', '5000', title, body], { stdio: 'ignore' });
    }
  } catch {
    // Desktop notifications are best-effort only.
  }
}

export function maybeNotify(enabled: boolean, title: string, body: string): void {
  if (enabled) notify(title, body);
}

export function formatUsageNotification(usages: UsageResult[]): string {
  return usages.map(usage => {
    const resetLine = usage.reset ? ` ↻ ${usage.reset}` : '';
    return `${usage.name}: ${usage.bars} ${usage.pct}%${resetLine}`;
  }).join('\n');
}
