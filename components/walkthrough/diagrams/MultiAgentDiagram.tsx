'use client';

export function MultiAgentDiagram() {
  return (
    <svg
      viewBox="0 0 800 500"
      className="w-full h-auto"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Background */}
      <rect width="800" height="500" fill="#f8fafc" rx="12" />

      {/* Title */}
      <text x="400" y="35" textAnchor="middle" className="text-lg font-bold" fill="#1e293b" fontSize="20" fontWeight="bold">
        Multi-AI Agent Architecture
      </text>
      <text x="400" y="55" textAnchor="middle" fill="#64748b" fontSize="12">
        8 Specialized Agents with Smart Routing + Quality Control
      </text>

      {/* Student Input */}
      <g transform="translate(50, 200)">
        <rect width="100" height="80" rx="8" fill="#dbeafe" stroke="#3b82f6" strokeWidth="2" />
        <text x="50" y="35" textAnchor="middle" fill="#1e40af" fontSize="12" fontWeight="600">Student</text>
        <text x="50" y="50" textAnchor="middle" fill="#1e40af" fontSize="12" fontWeight="600">Voice Input</text>
        <text x="50" y="68" textAnchor="middle" fill="#3b82f6" fontSize="20">🎤</text>
      </g>

      {/* Arrow to Coordinator */}
      <path d="M 155 240 L 200 240" stroke="#3b82f6" strokeWidth="2" markerEnd="url(#arrowhead)" />

      {/* Coordinator (Central Hub) */}
      <g transform="translate(205, 180)">
        <rect width="130" height="120" rx="12" fill="#fef3c7" stroke="#f59e0b" strokeWidth="3" />
        <text x="65" y="30" textAnchor="middle" fill="#92400e" fontSize="14" fontWeight="bold">🧑‍🏫 Coordinator</text>
        <text x="65" y="50" textAnchor="middle" fill="#92400e" fontSize="10">Routes requests to</text>
        <text x="65" y="65" textAnchor="middle" fill="#92400e" fontSize="10">appropriate specialist</text>
        <rect x="15" y="80" width="100" height="28" rx="4" fill="#fbbf24" />
        <text x="65" y="99" textAnchor="middle" fill="#78350f" fontSize="9" fontWeight="600">Smart Routing Logic</text>
      </g>

      {/* Specialist Agents */}
      {/* Math Agent */}
      <g transform="translate(400, 70)">
        <rect width="90" height="60" rx="8" fill="#ddd6fe" stroke="#8b5cf6" strokeWidth="2" />
        <text x="45" y="25" textAnchor="middle" fill="#5b21b6" fontSize="11" fontWeight="600">📊 Math</text>
        <text x="45" y="42" textAnchor="middle" fill="#6d28d9" fontSize="9">Specialist</text>
      </g>

      {/* Science Agent */}
      <g transform="translate(510, 70)">
        <rect width="90" height="60" rx="8" fill="#d1fae5" stroke="#10b981" strokeWidth="2" />
        <text x="45" y="25" textAnchor="middle" fill="#065f46" fontSize="11" fontWeight="600">🔬 Science</text>
        <text x="45" y="42" textAnchor="middle" fill="#059669" fontSize="9">Specialist</text>
      </g>

      {/* English Agent */}
      <g transform="translate(620, 70)">
        <rect width="90" height="60" rx="8" fill="#fce7f3" stroke="#ec4899" strokeWidth="2" />
        <text x="45" y="25" textAnchor="middle" fill="#9d174d" fontSize="11" fontWeight="600">📚 English</text>
        <text x="45" y="42" textAnchor="middle" fill="#db2777" fontSize="9">Specialist</text>
      </g>

      {/* History Agent */}
      <g transform="translate(400, 150)">
        <rect width="90" height="60" rx="8" fill="#fee2e2" stroke="#ef4444" strokeWidth="2" />
        <text x="45" y="25" textAnchor="middle" fill="#991b1b" fontSize="11" fontWeight="600">🏛️ History</text>
        <text x="45" y="42" textAnchor="middle" fill="#dc2626" fontSize="9">Specialist</text>
      </g>

      {/* Art Agent */}
      <g transform="translate(510, 150)">
        <rect width="90" height="60" rx="8" fill="#fef9c3" stroke="#eab308" strokeWidth="2" />
        <text x="45" y="25" textAnchor="middle" fill="#854d0e" fontSize="11" fontWeight="600">🎨 Art</text>
        <text x="45" y="42" textAnchor="middle" fill="#ca8a04" fontSize="9">Specialist</text>
      </g>

      {/* Support Agents */}
      {/* Assessor */}
      <g transform="translate(400, 280)">
        <rect width="100" height="70" rx="8" fill="#e0e7ff" stroke="#6366f1" strokeWidth="2" />
        <text x="50" y="25" textAnchor="middle" fill="#3730a3" fontSize="11" fontWeight="600">📋 Assessor</text>
        <text x="50" y="42" textAnchor="middle" fill="#4f46e5" fontSize="9">Evaluates mastery</text>
        <text x="50" y="55" textAnchor="middle" fill="#4f46e5" fontSize="9">& triggers quizzes</text>
      </g>

      {/* Motivator */}
      <g transform="translate(520, 280)">
        <rect width="100" height="70" rx="8" fill="#ccfbf1" stroke="#14b8a6" strokeWidth="2" />
        <text x="50" y="25" textAnchor="middle" fill="#134e4a" fontSize="11" fontWeight="600">💪 Motivator</text>
        <text x="50" y="42" textAnchor="middle" fill="#0d9488" fontSize="9">Encouragement</text>
        <text x="50" y="55" textAnchor="middle" fill="#0d9488" fontSize="9">& emotional support</text>
      </g>

      {/* Validator Agent - Quality Control Oversight */}
      <g transform="translate(640, 230)">
        {/* Glow effect for premium feel */}
        <rect width="130" height="95" rx="10" fill="url(#validatorGradient)" stroke="#f59e0b" strokeWidth="3" filter="url(#glow)" />

        {/* Header with shield icon */}
        <text x="65" y="22" textAnchor="middle" fill="#78350f" fontSize="12" fontWeight="bold">🛡️ Validator</text>

        {/* Model badge */}
        <rect x="20" y="28" width="90" height="16" rx="8" fill="#fbbf24" />
        <text x="65" y="39" textAnchor="middle" fill="#78350f" fontSize="8" fontWeight="600">Gemini 3 Pro</text>

        {/* Description */}
        <text x="65" y="54" textAnchor="middle" fill="#92400e" fontSize="9">Background quality</text>
        <text x="65" y="66" textAnchor="middle" fill="#92400e" fontSize="9">control (5 checks)</text>

        {/* Deferred correction note */}
        <text x="65" y="82" textAnchor="middle" fill="#d97706" fontSize="7.5">Deferred self-correction</text>
        <text x="65" y="91" textAnchor="middle" fill="#d97706" fontSize="7.5">on rejection</text>
      </g>

      {/* Connection Lines from Coordinator to Specialists */}
      <line x1="335" y1="220" x2="400" y2="100" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="4,2" />
      <line x1="335" y1="220" x2="510" y2="100" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="4,2" />
      <line x1="335" y1="220" x2="620" y2="100" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="4,2" />
      <line x1="335" y1="240" x2="400" y2="180" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="4,2" />
      <line x1="335" y1="240" x2="510" y2="180" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="4,2" />
      <line x1="335" y1="270" x2="400" y2="280" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="4,2" />
      <line x1="335" y1="270" x2="520" y2="280" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="4,2" />

      {/* Validator Connection Lines - Background validation from teaching specialists */}
      {/* Math → Validator */}
      <line x1="490" y1="100" x2="640" y2="260" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="3,3" opacity="0.6" />
      {/* Science → Validator */}
      <line x1="600" y1="100" x2="665" y2="230" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="3,3" opacity="0.6" />
      {/* English → Validator */}
      <line x1="710" y1="105" x2="705" y2="230" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="3,3" opacity="0.6" />
      {/* History → Validator */}
      <line x1="490" y1="180" x2="640" y2="250" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="3,3" opacity="0.6" />
      {/* Art → Validator */}
      <line x1="600" y1="180" x2="655" y2="230" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="3,3" opacity="0.6" />

      {/* Background validation label */}
      <text x="595" y="175" fill="#d97706" fontSize="8" fontStyle="italic">async validation</text>

      {/* Smart Routing Logic Box */}
      <g transform="translate(20, 370)">
        <rect width="760" height="115" rx="8" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="1" />
        <text x="380" y="25" textAnchor="middle" fill="#334155" fontSize="12" fontWeight="bold">Smart Routing Algorithm + Quality Control</text>

        <text x="30" y="50" fill="#475569" fontSize="10">1️⃣ Check if specialist already active → Fast path (direct to specialist)</text>
        <text x="30" y="68" fill="#475569" fontSize="10">2️⃣ If lesson complete → Auto-route to Assessor for evaluation</text>
        <text x="30" y="86" fill="#475569" fontSize="10">3️⃣ If specialist requests handoff → Route to Motivator for encouragement</text>
        <text x="30" y="104" fill="#d97706" fontSize="10" fontWeight="600">4️⃣ After specialist response → Validator runs background check (5 validations, deferred self-correction)</text>
      </g>

      {/* Arrow Marker Definition */}
      <defs>
        <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
          <polygon points="0 0, 10 3.5, 0 7" fill="#3b82f6" />
        </marker>

        {/* Validator gradient for premium look */}
        <linearGradient id="validatorGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style={{stopColor: '#fef3c7', stopOpacity: 1}} />
          <stop offset="100%" style={{stopColor: '#fde68a', stopOpacity: 1}} />
        </linearGradient>

        {/* Glow effect for validator */}
        <filter id="glow">
          <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
    </svg>
  );
}
