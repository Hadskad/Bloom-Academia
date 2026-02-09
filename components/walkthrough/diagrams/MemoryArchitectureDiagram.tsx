'use client';

export function MemoryArchitectureDiagram() {
  return (
    <svg
      viewBox="0 0 800 520"
      className="w-full h-auto"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Background */}
      <rect width="800" height="520" fill="#f8fafc" rx="12" />

      {/* Title */}
      <text x="400" y="35" textAnchor="middle" fill="#1e293b" fontSize="20" fontWeight="bold">
        3-Layer Memory Architecture
      </text>
      <text x="400" y="55" textAnchor="middle" fill="#64748b" fontSize="12">
        Personalization Through Contextual Memory
      </text>

      {/* Layer 1: User Profile Memory */}
      <g transform="translate(50, 80)">
        <rect width="700" height="120" rx="12" fill="#dbeafe" stroke="#3b82f6" strokeWidth="2" />
        <rect x="10" y="10" width="120" height="30" rx="6" fill="#3b82f6" />
        <text x="70" y="30" textAnchor="middle" fill="white" fontSize="11" fontWeight="bold">LAYER 1</text>

        <text x="150" y="30" fill="#1e40af" fontSize="14" fontWeight="bold">🧠 User Profile Memory (Long-term, Persistent)</text>

        <g transform="translate(20, 50)">
          <rect width="130" height="55" rx="6" fill="white" stroke="#93c5fd" strokeWidth="1" />
          <text x="65" y="20" textAnchor="middle" fill="#1e40af" fontSize="10" fontWeight="600">Identity</text>
          <text x="65" y="35" textAnchor="middle" fill="#3b82f6" fontSize="9">Name, Age, Grade</text>
          <text x="65" y="48" textAnchor="middle" fill="#3b82f6" fontSize="9">Disability Info</text>
        </g>

        <g transform="translate(170, 50)">
          <rect width="130" height="55" rx="6" fill="white" stroke="#93c5fd" strokeWidth="1" />
          <text x="65" y="20" textAnchor="middle" fill="#1e40af" fontSize="10" fontWeight="600">Learning Style</text>
          <text x="65" y="35" textAnchor="middle" fill="#3b82f6" fontSize="9">Visual / Auditory</text>
          <text x="65" y="48" textAnchor="middle" fill="#3b82f6" fontSize="9">Preferred pace</text>
        </g>

        <g transform="translate(320, 50)">
          <rect width="130" height="55" rx="6" fill="white" stroke="#93c5fd" strokeWidth="1" />
          <text x="65" y="20" textAnchor="middle" fill="#1e40af" fontSize="10" fontWeight="600">Strengths</text>
          <text x="65" y="35" textAnchor="middle" fill="#3b82f6" fontSize="9">Topics mastered</text>
          <text x="65" y="48" textAnchor="middle" fill="#3b82f6" fontSize="9">Quick understanding</text>
        </g>

        <g transform="translate(470, 50)">
          <rect width="130" height="55" rx="6" fill="white" stroke="#93c5fd" strokeWidth="1" />
          <text x="65" y="20" textAnchor="middle" fill="#1e40af" fontSize="10" fontWeight="600">Struggles</text>
          <text x="65" y="35" textAnchor="middle" fill="#3b82f6" fontSize="9">Difficult concepts</text>
          <text x="65" y="48" textAnchor="middle" fill="#3b82f6" fontSize="9">Areas needing focus</text>
        </g>

        <g transform="translate(620, 50)">
          <rect width="60" height="55" rx="6" fill="#bfdbfe" stroke="#93c5fd" strokeWidth="1" />
          <text x="30" y="25" textAnchor="middle" fill="#1e40af" fontSize="18">💾</text>
          <text x="30" y="45" textAnchor="middle" fill="#1e40af" fontSize="8" fontWeight="600">Supabase</text>
        </g>
      </g>

      {/* Arrow down */}
      <path d="M 400 205 L 400 225" stroke="#64748b" strokeWidth="2" markerEnd="url(#arrowDown)" />

      {/* Layer 2: Session Memory */}
      <g transform="translate(50, 230)">
        <rect width="700" height="120" rx="12" fill="#fef3c7" stroke="#f59e0b" strokeWidth="2" />
        <rect x="10" y="10" width="120" height="30" rx="6" fill="#f59e0b" />
        <text x="70" y="30" textAnchor="middle" fill="white" fontSize="11" fontWeight="bold">LAYER 2</text>

        <text x="150" y="30" fill="#92400e" fontSize="14" fontWeight="bold">💬 Session Memory (Current Learning Session)</text>

        <g transform="translate(20, 50)">
          <rect width="200" height="55" rx="6" fill="white" stroke="#fcd34d" strokeWidth="1" />
          <text x="100" y="20" textAnchor="middle" fill="#92400e" fontSize="10" fontWeight="600">Conversation History</text>
          <text x="100" y="35" textAnchor="middle" fill="#d97706" fontSize="9">Last 10 interactions</text>
          <text x="100" y="48" textAnchor="middle" fill="#d97706" fontSize="9">Student questions & AI responses</text>
        </g>

        <g transform="translate(240, 50)">
          <rect width="200" height="55" rx="6" fill="white" stroke="#fcd34d" strokeWidth="1" />
          <text x="100" y="20" textAnchor="middle" fill="#92400e" fontSize="10" fontWeight="600">Session Metadata</text>
          <text x="100" y="35" textAnchor="middle" fill="#d97706" fontSize="9">Current lesson, Agent active</text>
          <text x="100" y="48" textAnchor="middle" fill="#d97706" fontSize="9">Time in session, Progress</text>
        </g>

        <g transform="translate(460, 50)">
          <rect width="150" height="55" rx="6" fill="white" stroke="#fcd34d" strokeWidth="1" />
          <text x="75" y="20" textAnchor="middle" fill="#92400e" fontSize="10" fontWeight="600">Context Window</text>
          <text x="75" y="35" textAnchor="middle" fill="#d97706" fontSize="9">Builds prompt for</text>
          <text x="75" y="48" textAnchor="middle" fill="#d97706" fontSize="9">Gemini API calls</text>
        </g>

        <g transform="translate(630, 50)">
          <rect width="50" height="55" rx="6" fill="#fef08a" stroke="#fcd34d" strokeWidth="1" />
          <text x="25" y="25" textAnchor="middle" fill="#92400e" fontSize="18">⚡</text>
          <text x="25" y="45" textAnchor="middle" fill="#92400e" fontSize="8" fontWeight="600">RAM</text>
        </g>
      </g>

      {/* Arrow down */}
      <path d="M 400 355 L 400 375" stroke="#64748b" strokeWidth="2" markerEnd="url(#arrowDown)" />

      {/* Layer 3: Learning Analytics */}
      <g transform="translate(50, 380)">
        <rect width="700" height="120" rx="12" fill="#d1fae5" stroke="#10b981" strokeWidth="2" />
        <rect x="10" y="10" width="120" height="30" rx="6" fill="#10b981" />
        <text x="70" y="30" textAnchor="middle" fill="white" fontSize="11" fontWeight="bold">LAYER 3</text>

        <text x="150" y="30" fill="#065f46" fontSize="14" fontWeight="bold">📊 Learning Analytics (Insights & Patterns)</text>

        <g transform="translate(20, 50)">
          <rect width="160" height="55" rx="6" fill="white" stroke="#6ee7b7" strokeWidth="1" />
          <text x="80" y="20" textAnchor="middle" fill="#065f46" fontSize="10" fontWeight="600">Common Mistakes</text>
          <text x="80" y="35" textAnchor="middle" fill="#059669" fontSize="9">Pattern recognition</text>
          <text x="80" y="48" textAnchor="middle" fill="#059669" fontSize="9">Misconception tracking</text>
        </g>

        <g transform="translate(200, 50)">
          <rect width="160" height="55" rx="6" fill="white" stroke="#6ee7b7" strokeWidth="1" />
          <text x="80" y="20" textAnchor="middle" fill="#065f46" fontSize="10" fontWeight="600">Mastery Patterns</text>
          <text x="80" y="35" textAnchor="middle" fill="#059669" fontSize="9">Topics understood well</text>
          <text x="80" y="48" textAnchor="middle" fill="#059669" fontSize="9">Learning speed trends</text>
        </g>

        <g transform="translate(380, 50)">
          <rect width="160" height="55" rx="6" fill="white" stroke="#6ee7b7" strokeWidth="1" />
          <text x="80" y="20" textAnchor="middle" fill="#065f46" fontSize="10" fontWeight="600">Time Analytics</text>
          <text x="80" y="35" textAnchor="middle" fill="#059669" fontSize="9">Time per topic</text>
          <text x="80" y="48" textAnchor="middle" fill="#059669" fontSize="9">Optimal study periods</text>
        </g>

        <g transform="translate(560, 50)">
          <rect width="120" height="55" rx="6" fill="#a7f3d0" stroke="#6ee7b7" strokeWidth="1" />
          <text x="60" y="18" textAnchor="middle" fill="#065f46" fontSize="9" fontWeight="600">Powers</text>
          <text x="60" y="32" textAnchor="middle" fill="#065f46" fontSize="8">✓ Recommendations</text>
          <text x="60" y="44" textAnchor="middle" fill="#065f46" fontSize="8">✓ Personalization</text>
        </g>
      </g>

      {/* Arrow Marker Definition */}
      <defs>
        <marker id="arrowDown" markerWidth="10" markerHeight="7" refX="5" refY="7" orient="auto">
          <polygon points="0 0, 10 0, 5 7" fill="#64748b" />
        </marker>
      </defs>
    </svg>
  );
}
