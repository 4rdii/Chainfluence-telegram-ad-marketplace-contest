import { useState, useEffect, useRef } from 'react';
import { dlog, type LogEntry } from '../lib/debug-log';

export function DebugPanel() {
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [open, setOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return dlog.subscribe(() => setEntries(dlog.getEntries()));
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current && open) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [entries, open]);

  const errorCount = entries.filter(e => e.level === 'error').length;

  return (
    <>
      {/* Floating toggle button */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          position: 'fixed',
          bottom: open ? 'calc(40vh + 8px)' : 80,
          right: 8,
          zIndex: 99999,
          background: errorCount > 0 ? '#ef4444' : '#3b82f6',
          color: '#fff',
          border: 'none',
          borderRadius: '50%',
          width: 36,
          height: 36,
          fontSize: 14,
          fontWeight: 'bold',
          cursor: 'pointer',
          boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
        }}
      >
        {open ? '×' : `🐛${errorCount > 0 ? errorCount : ''}`}
      </button>

      {/* Log panel */}
      {open && (
        <div
          style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            height: '40vh',
            zIndex: 99998,
            background: '#0a0a0a',
            borderTop: '2px solid #333',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Header */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '4px 8px',
            borderBottom: '1px solid #333',
            fontSize: 11,
            color: '#888',
            gap: 6,
          }}>
            <span>Debug Log ({entries.length})</span>
            <div style={{ display: 'flex', gap: 4 }}>
              <button
                onClick={() => {
                  const text = entries.map(e => `${e.time} ${e.level.toUpperCase()} ${e.message}`).join('\n');
                  navigator.clipboard.writeText(text).then(
                    () => dlog.info('Copied to clipboard'),
                    () => {
                      // Fallback for environments where clipboard API fails
                      const ta = document.createElement('textarea');
                      ta.value = text;
                      ta.style.position = 'fixed';
                      ta.style.opacity = '0';
                      document.body.appendChild(ta);
                      ta.select();
                      document.execCommand('copy');
                      document.body.removeChild(ta);
                      dlog.info('Copied to clipboard (fallback)');
                    }
                  );
                }}
                style={{ background: 'none', border: '1px solid #555', color: '#aaa', borderRadius: 4, padding: '2px 8px', fontSize: 10, cursor: 'pointer' }}
              >
                Copy All
              </button>
              <button
                onClick={() => dlog.clear()}
                style={{ background: 'none', border: '1px solid #555', color: '#aaa', borderRadius: 4, padding: '2px 8px', fontSize: 10, cursor: 'pointer' }}
              >
                Clear
              </button>
            </div>
          </div>

          {/* Entries */}
          <div ref={scrollRef} style={{ flex: 1, overflow: 'auto', padding: '4px 8px', userSelect: 'text', WebkitUserSelect: 'text' }}>
            {entries.length === 0 && (
              <div style={{ color: '#555', fontSize: 11, padding: 8 }}>No logs yet.</div>
            )}
            {entries.map((entry, i) => (
              <div key={i} style={{
                fontSize: 10,
                lineHeight: '14px',
                fontFamily: 'monospace',
                color: entry.level === 'error' ? '#ef4444' : entry.level === 'warn' ? '#eab308' : '#a3a3a3',
                borderBottom: '1px solid #1a1a1a',
                padding: '2px 0',
                wordBreak: 'break-all',
              }}>
                <span style={{ color: '#555' }}>{entry.time}</span>{' '}
                <span style={{ fontWeight: 'bold' }}>{entry.level.toUpperCase()}</span>{' '}
                {entry.message}
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
