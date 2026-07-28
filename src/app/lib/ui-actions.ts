import { toast } from 'sonner';

export async function copyToClipboard(text: string, label = 'Copied to clipboard') {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(label);
  } catch {
    toast.error('Could not copy to clipboard.');
  }
}

export function downloadTextFile(filename: string, content: string, mime = 'text/plain;charset=utf-8') {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadJsonFile(filename: string, data: unknown) {
  downloadTextFile(filename, JSON.stringify(data, null, 2), 'application/json;charset=utf-8');
}

export function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return { ...fallback, ...JSON.parse(raw) } as T;
  } catch {
    return fallback;
  }
}

export function saveToStorage<T>(key: string, data: T) {
  localStorage.setItem(key, JSON.stringify(data));
}

export type BulkUserRow = {
  fullName: string;
  email: string;
  phone?: string;
  role: 'legal_practitioner' | 'compliance_officer' | 'manager' | 'admin';
  department?: string;
};

export function parseBulkUserCsv(text: string): BulkUserRow[] {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length === 0) return [];

  const header = lines[0].split(',').map((c) => c.trim().toLowerCase());
  const hasHeader = header.includes('email') && header.includes('fullname');
  const dataLines = hasHeader ? lines.slice(1) : lines;

  const col = (name: string, fallback: number) => {
    const idx = header.indexOf(name);
    return idx >= 0 ? idx : fallback;
  };

  return dataLines
    .map((line) => {
      const parts = line.split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
      if (hasHeader) {
        const role = (parts[col('role', 3)] || 'legal_practitioner') as BulkUserRow['role'];
        return {
          fullName: parts[col('fullname', 0)] || parts[col('full_name', 0)],
          email: parts[col('email', 1)],
          phone: parts[col('phone', 2)] || undefined,
          role,
          department: parts[col('department', 4)] || undefined,
        };
      }
      const role = (parts[3] || 'legal_practitioner') as BulkUserRow['role'];
      return {
        fullName: parts[0],
        email: parts[1],
        phone: parts[2] || undefined,
        role,
        department: parts[4] || undefined,
      };
    })
    .filter((row) => row.fullName && row.email);
}

export function downloadBulkUserTemplate() {
  const csv =
    'fullName,email,phone,role,department\n' +
    'Jane Doe,jane.doe@example.com,+250788000000,legal_practitioner,Litigation\n';
  downloadTextFile('user-import-template.csv', csv, 'text/csv;charset=utf-8');
  toast.success('Template downloaded.');
}
