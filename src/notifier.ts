import { execFileSync } from 'node:child_process';
import type { UsageResult } from './types.js';

function notifyWindows(title: string, body: string, durationMs: number): void {
  const escapedTitle = title.replace(/'/g, "''");
  const escapedBody = body.replace(/'/g, "''");

  const psScript = `
    [void] [System.Reflection.Assembly]::LoadWithPartialName('System.Windows.Forms');
    $notification = New-Object System.Windows.Forms.NotifyIcon;
    $notification.Icon = [System.Drawing.SystemIcons]::Information;
    $notification.BalloonTipIcon = 'Info';
    $notification.BalloonTipTitle = '${escapedTitle}';
    $notification.BalloonTipText = '${escapedBody}';
    $notification.Visible = $true;
    $notification.ShowBalloonTip(${durationMs});
  `.trim().replace(/\s+/g, ' ');

  execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', psScript], { stdio: 'ignore' });
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
      notifyWindows(title, body, 5000);
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
