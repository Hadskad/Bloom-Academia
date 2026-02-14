'use client';

export function DisabilitySupportDiagram() {
  return (
    <svg
      viewBox="0 0 800 550"
      className="w-full h-auto"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Background */}
      <rect width="800" height="550" fill="#f8fafc" rx="12" />

      {/* Title */}
      <text x="400" y="35" textAnchor="middle" fill="#1e293b" fontSize="20" fontWeight="bold">
        Disability Support Plan
      </text>
      <text x="400" y="55" textAnchor="middle" fill="#64748b" fontSize="12">
        Inclusive Education: Features in development + Future Roadmap
      </text>

      {/* Currently Implemented Section */}
      <g transform="translate(30, 75)">
        <rect width="355" height="210" rx="10" fill="#d1fae5" stroke="#10b981" strokeWidth="2" />
        <rect x="10" y="10" width="180" height="25" rx="6" fill="#10b981" />
        <text x="100" y="28" textAnchor="middle" fill="white" fontSize="11" fontWeight="bold">✅ In Development</text>

        {/* Learning Disabilities */}
        <g transform="translate(15, 50)">
          <rect width="155" height="70" rx="6" fill="white" stroke="#6ee7b7" strokeWidth="1" />
          <text x="78" y="18" textAnchor="middle" fill="#065f46" fontSize="10" fontWeight="600">📖 Learning Disabilities</text>
          <text x="78" y="35" textAnchor="middle" fill="#059669" fontSize="8">• Dyslexia support</text>
          <text x="78" y="48" textAnchor="middle" fill="#059669" fontSize="8">• Dyscalculia adaptations</text>
          <text x="78" y="61" textAnchor="middle" fill="#059669" fontSize="8">• Slower pace options</text>
        </g>

        {/* Attention Disorders */}
        <g transform="translate(185, 50)">
          <rect width="155" height="70" rx="6" fill="white" stroke="#6ee7b7" strokeWidth="1" />
          <text x="78" y="18" textAnchor="middle" fill="#065f46" fontSize="10" fontWeight="600">🎯 Attention Disorders</text>
          <text x="78" y="35" textAnchor="middle" fill="#059669" fontSize="8">• ADHD-friendly pacing</text>
          <text x="78" y="48" textAnchor="middle" fill="#059669" fontSize="8">• Short lesson chunks</text>
          <text x="78" y="61" textAnchor="middle" fill="#059669" fontSize="8">• Frequent breaks</text>
        </g>

        {/* Cognitive */}
        <g transform="translate(15, 130)">
          <rect width="155" height="70" rx="6" fill="white" stroke="#6ee7b7" strokeWidth="1" />
          <text x="78" y="18" textAnchor="middle" fill="#065f46" fontSize="10" fontWeight="600">🧠 Cognitive Support</text>
          <text x="78" y="35" textAnchor="middle" fill="#059669" fontSize="8">• Autism spectrum</text>
          <text x="78" y="48" textAnchor="middle" fill="#059669" fontSize="8">• Clear instructions</text>
          <text x="78" y="61" textAnchor="middle" fill="#059669" fontSize="8">• Predictable flow</text>
        </g>

        {/* Other */}
        <g transform="translate(185, 130)">
          <rect width="155" height="70" rx="6" fill="white" stroke="#6ee7b7" strokeWidth="1" />
          <text x="78" y="18" textAnchor="middle" fill="#065f46" fontSize="10" fontWeight="600">♿ Physical Support</text>
          <text x="78" y="35" textAnchor="middle" fill="#059669" fontSize="8">• Voice-first interaction</text>
          <text x="78" y="48" textAnchor="middle" fill="#059669" fontSize="8">• No keyboard required</text>
          <text x="78" y="61" textAnchor="middle" fill="#059669" fontSize="8">• Motor impairment friendly</text>
        </g>
      </g>

      {/* Future Roadmap Section */}
      <g transform="translate(415, 75)">
        <rect width="355" height="210" rx="10" fill="#fef3c7" stroke="#f59e0b" strokeWidth="2" />
        <rect x="10" y="10" width="150" height="25" rx="6" fill="#f59e0b" />
        <text x="85" y="28" textAnchor="middle" fill="white" fontSize="11" fontWeight="bold">🚀 Future Roadmap</text>

        {/* Deaf Support */}
        <g transform="translate(15, 50)">
          <rect width="155" height="70" rx="6" fill="white" stroke="#fcd34d" strokeWidth="1" />
          <text x="78" y="18" textAnchor="middle" fill="#92400e" fontSize="10" fontWeight="600">🦻 Deaf/Hard of Hearing</text>
          <text x="78" y="35" textAnchor="middle" fill="#d97706" fontSize="8">• Real-time captions</text>
          <text x="78" y="48" textAnchor="middle" fill="#d97706" fontSize="8">• Sign language avatars</text>
          <text x="78" y="61" textAnchor="middle" fill="#d97706" fontSize="8">• Visual-only mode</text>
        </g>

        {/* Blind Support */}
        <g transform="translate(185, 50)">
          <rect width="155" height="70" rx="6" fill="white" stroke="#fcd34d" strokeWidth="1" />
          <text x="78" y="18" textAnchor="middle" fill="#92400e" fontSize="10" fontWeight="600">👁️ Blind/Low Vision</text>
          <text x="78" y="35" textAnchor="middle" fill="#d97706" fontSize="8">• Screen reader support</text>
          <text x="78" y="48" textAnchor="middle" fill="#d97706" fontSize="8">• Audio descriptions</text>
          <text x="78" y="61" textAnchor="middle" fill="#d97706" fontSize="8">• Haptic feedback</text>
        </g>

        {/* Speech Impairment */}
        <g transform="translate(15, 130)">
          <rect width="155" height="70" rx="6" fill="white" stroke="#fcd34d" strokeWidth="1" />
          <text x="78" y="18" textAnchor="middle" fill="#92400e" fontSize="10" fontWeight="600">🗣️ Speech Impairment</text>
          <text x="78" y="35" textAnchor="middle" fill="#d97706" fontSize="8">• Text input fallback</text>
          <text x="78" y="48" textAnchor="middle" fill="#d97706" fontSize="8">• AAC device integration</text>
          <text x="78" y="61" textAnchor="middle" fill="#d97706" fontSize="8">• Gesture recognition</text>
        </g>

        {/* Motor Disabilities */}
        <g transform="translate(185, 130)">
          <rect width="155" height="70" rx="6" fill="white" stroke="#fcd34d" strokeWidth="1" />
          <text x="78" y="18" textAnchor="middle" fill="#92400e" fontSize="10" fontWeight="600">🖐️ Severe Motor</text>
          <text x="78" y="35" textAnchor="middle" fill="#d97706" fontSize="8">• Eye tracking support</text>
          <text x="78" y="48" textAnchor="middle" fill="#d97706" fontSize="8">• Switch access</text>
          <text x="78" y="61" textAnchor="middle" fill="#d97706" fontSize="8">• Head movement control</text>
        </g>
      </g>

      {/* How it works section */}
      <g transform="translate(30, 300)">
        <rect width="740" height="120" rx="10" fill="white" stroke="#e2e8f0" strokeWidth="1" />
        <text x="370" y="25" textAnchor="middle" fill="#334155" fontSize="12" fontWeight="bold">🔧 How Disability Support Works</text>

        {/* Step 1 */}
        <g transform="translate(20, 40)">
          <rect width="165" height="65" rx="6" fill="#dbeafe" stroke="#93c5fd" strokeWidth="1" />
          <text x="82" y="18" textAnchor="middle" fill="#1e40af" fontSize="9" fontWeight="600">1. Registration</text>
          <text x="82" y="35" textAnchor="middle" fill="#3b82f6" fontSize="8">Student selects</text>
          <text x="82" y="48" textAnchor="middle" fill="#3b82f6" fontSize="8">accommodations needed</text>
          <text x="82" y="60" textAnchor="middle" fill="#3b82f6" fontSize="7">(dyslexia, ADHD, etc.)</text>
        </g>

        {/* Arrow */}
        <path d="M 195 72 L 210 72" stroke="#64748b" strokeWidth="1.5" markerEnd="url(#smallArrow)" />

        {/* Step 2 */}
        <g transform="translate(210, 40)">
          <rect width="165" height="65" rx="6" fill="#fef3c7" stroke="#fcd34d" strokeWidth="1" />
          <text x="82" y="18" textAnchor="middle" fill="#92400e" fontSize="9" fontWeight="600">2. Profile Memory</text>
          <text x="82" y="35" textAnchor="middle" fill="#d97706" fontSize="8">Stored in Layer 1</text>
          <text x="82" y="48" textAnchor="middle" fill="#d97706" fontSize="8">of memory system</text>
          <text x="82" y="60" textAnchor="middle" fill="#d97706" fontSize="7">(persistent across sessions)</text>
        </g>

        {/* Arrow */}
        <path d="M 385 72 L 400 72" stroke="#64748b" strokeWidth="1.5" markerEnd="url(#smallArrow)" />

        {/* Step 3 */}
        <g transform="translate(400, 40)">
          <rect width="165" height="65" rx="6" fill="#ddd6fe" stroke="#c4b5fd" strokeWidth="1" />
          <text x="82" y="18" textAnchor="middle" fill="#5b21b6" fontSize="9" fontWeight="600">3. Context Builder</text>
          <text x="82" y="35" textAnchor="middle" fill="#7c3aed" fontSize="8">Injects accommodations</text>
          <text x="82" y="48" textAnchor="middle" fill="#7c3aed" fontSize="8">into AI prompt</text>
          <text x="82" y="60" textAnchor="middle" fill="#7c3aed" fontSize="7">(agent-manager.ts)</text>
        </g>

        {/* Arrow */}
        <path d="M 575 72 L 590 72" stroke="#64748b" strokeWidth="1.5" markerEnd="url(#smallArrow)" />

        {/* Step 4 */}
        <g transform="translate(590, 40)">
          <rect width="130" height="65" rx="6" fill="#d1fae5" stroke="#6ee7b7" strokeWidth="1" />
          <text x="65" y="18" textAnchor="middle" fill="#065f46" fontSize="9" fontWeight="600">4. Adapted Teaching</text>
          <text x="65" y="35" textAnchor="middle" fill="#059669" fontSize="8">Gemini adjusts:</text>
          <text x="65" y="48" textAnchor="middle" fill="#059669" fontSize="7">• Pace & complexity</text>
          <text x="65" y="60" textAnchor="middle" fill="#059669" fontSize="7">• Visual clarity</text>
        </g>
      </g>

      {/* Global Impact Vision */}
      <g transform="translate(30, 435)">
        <rect width="740" height="100" rx="10" fill="#ede9fe" stroke="#8b5cf6" strokeWidth="2" />
        <text x="370" y="25" textAnchor="middle" fill="#5b21b6" fontSize="12" fontWeight="bold">🌍 Global Impact Vision</text>
        <text x="370" y="50" textAnchor="middle" fill="#6d28d9" fontSize="10">
          Bloom Academia aims to make quality education accessible to ALL children worldwide,
        </text>
        <text x="370" y="68" textAnchor="middle" fill="#6d28d9" fontSize="10">
          regardless of physical or cognitive abilities. Every child deserves a personalized AI teacher.
        </text>
        <text x="370" y="88" textAnchor="middle" fill="#7c3aed" fontSize="9" fontStyle="italic">
          "Education is not a privilege, it's a right — and technology can make it truly universal."
        </text>
      </g>

      {/* Arrow Marker */}
      <defs>
        <marker id="smallArrow" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
          <polygon points="0 0, 8 3, 0 6" fill="#64748b" />
        </marker>
      </defs>
    </svg>
  );
}
