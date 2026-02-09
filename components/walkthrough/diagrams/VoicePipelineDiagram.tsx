'use client';

export function VoicePipelineDiagram() {
  return (
    <svg
      viewBox="0 0 800 450"
      className="w-full h-auto"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Background */}
      <rect width="800" height="450" fill="#f8fafc" rx="12" />

      {/* Title */}
      <text x="400" y="35" textAnchor="middle" fill="#1e293b" fontSize="20" fontWeight="bold">
        Voice Pipeline Architecture
      </text>
      <text x="400" y="55" textAnchor="middle" fill="#64748b" fontSize="12">
        Real-time Voice Learning: Soniox STT → Gemini 3 Flash → Google TTS
      </text>

      {/* Student */}
      <g transform="translate(30, 100)">
        <circle cx="50" cy="50" r="45" fill="#dbeafe" stroke="#3b82f6" strokeWidth="2" />
        <text x="50" y="40" textAnchor="middle" fontSize="28">🧑‍🎓</text>
        <text x="50" y="65" textAnchor="middle" fill="#1e40af" fontSize="10" fontWeight="600">Student</text>
        <text x="50" y="115" textAnchor="middle" fill="#3b82f6" fontSize="9">Speaks question</text>
      </g>

      {/* Arrow 1 */}
      <g transform="translate(125, 140)">
        <path d="M 0 10 L 70 10" stroke="#3b82f6" strokeWidth="2" markerEnd="url(#blueArrow)" />
        <text x="35" y="0" textAnchor="middle" fill="#3b82f6" fontSize="8">Audio Stream</text>
      </g>

      {/* Soniox STT */}
      <g transform="translate(200, 90)">
        <rect width="130" height="100" rx="12" fill="#fef3c7" stroke="#f59e0b" strokeWidth="2" />
        <text x="65" y="25" textAnchor="middle" fill="#92400e" fontSize="11" fontWeight="bold">🎤 Soniox STT</text>
        <text x="65" y="45" textAnchor="middle" fill="#d97706" fontSize="9">Speech-to-Text</text>
        <rect x="15" y="55" width="100" height="35" rx="6" fill="#fbbf24" />
        <text x="65" y="72" textAnchor="middle" fill="#78350f" fontSize="8">WebSocket</text>
        <text x="65" y="84" textAnchor="middle" fill="#78350f" fontSize="8">Real-time</text>
      </g>

      {/* Arrow 2 */}
      <g transform="translate(335, 140)">
        <path d="M 0 10 L 70 10" stroke="#f59e0b" strokeWidth="2" markerEnd="url(#orangeArrow)" />
        <text x="35" y="0" textAnchor="middle" fill="#f59e0b" fontSize="8">Transcript</text>
      </g>

      {/* Gemini 3 Flash */}
      <g transform="translate(410, 70)">
        <rect width="160" height="140" rx="12" fill="#ddd6fe" stroke="#8b5cf6" strokeWidth="3" />
        <text x="80" y="25" textAnchor="middle" fill="#5b21b6" fontSize="11" fontWeight="bold">🧠 Gemini 3 Flash</text>
        <text x="80" y="42" textAnchor="middle" fill="#7c3aed" fontSize="9">AI Teaching Engine</text>

        <rect x="10" y="55" width="140" height="75" rx="6" fill="white" stroke="#c4b5fd" strokeWidth="1" />
        <text x="80" y="72" textAnchor="middle" fill="#5b21b6" fontSize="8" fontWeight="600">Processing:</text>
        <text x="80" y="86" textAnchor="middle" fill="#7c3aed" fontSize="7">• Multi-agent routing</text>
        <text x="80" y="98" textAnchor="middle" fill="#7c3aed" fontSize="7">• Context from memory</text>
        <text x="80" y="110" textAnchor="middle" fill="#7c3aed" fontSize="7">• SVG diagram generation</text>
        <text x="80" y="122" textAnchor="middle" fill="#7c3aed" fontSize="7">• Streaming response</text>
      </g>

      {/* Arrow 3 */}
      <g transform="translate(575, 140)">
        <path d="M 0 10 L 70 10" stroke="#8b5cf6" strokeWidth="2" markerEnd="url(#purpleArrow)" />
        <text x="35" y="0" textAnchor="middle" fill="#8b5cf6" fontSize="8">Text + SVG</text>
      </g>

      {/* Google TTS */}
      <g transform="translate(650, 90)">
        <rect width="120" height="100" rx="12" fill="#d1fae5" stroke="#10b981" strokeWidth="2" />
        <text x="60" y="25" textAnchor="middle" fill="#065f46" fontSize="11" fontWeight="bold">🔊 Google TTS</text>
        <text x="60" y="45" textAnchor="middle" fill="#059669" fontSize="9">Text-to-Speech</text>
        <rect x="10" y="55" width="100" height="35" rx="6" fill="#6ee7b7" />
        <text x="60" y="72" textAnchor="middle" fill="#065f46" fontSize="8">Neural2 Voice</text>
        <text x="60" y="84" textAnchor="middle" fill="#065f46" fontSize="8">Natural sound</text>
      </g>

      {/* Return path - Audio to Student */}
      <g transform="translate(30, 250)">
        <path d="M 740 0 L 740 50 L 50 50 L 50 0" fill="none" stroke="#10b981" strokeWidth="2" strokeDasharray="6,3" markerEnd="url(#greenArrow)" />
        <text x="400" y="70" textAnchor="middle" fill="#10b981" fontSize="9">Audio Response (Teacher Voice)</text>
      </g>

      {/* Latency info box */}
      <g transform="translate(200, 320)">
        <rect width="400" height="110" rx="10" fill="white" stroke="#e2e8f0" strokeWidth="1" />
        <text x="200" y="25" textAnchor="middle" fill="#334155" fontSize="12" fontWeight="bold">⚡ Performance Optimizations</text>

        <g transform="translate(20, 40)">
          <rect width="170" height="55" rx="6" fill="#fef3c7" stroke="#fcd34d" strokeWidth="1" />
          <text x="85" y="20" textAnchor="middle" fill="#92400e" fontSize="9" fontWeight="600">Streaming Response</text>
          <text x="85" y="35" textAnchor="middle" fill="#d97706" fontSize="8">18-36% latency reduction</text>
          <text x="85" y="48" textAnchor="middle" fill="#d97706" fontSize="8">No wait for full response</text>
        </g>

        <g transform="translate(210, 40)">
          <rect width="170" height="55" rx="6" fill="#dbeafe" stroke="#93c5fd" strokeWidth="1" />
          <text x="85" y="20" textAnchor="middle" fill="#1e40af" fontSize="9" fontWeight="600">Temp API Keys</text>
          <text x="85" y="35" textAnchor="middle" fill="#3b82f6" fontSize="8">Secure STT connection</text>
          <text x="85" y="48" textAnchor="middle" fill="#3b82f6" fontSize="8">Auto-refresh & retry logic</text>
        </g>
      </g>

      {/* Code file links box */}
      <g transform="translate(620, 320)">
        <rect width="150" height="110" rx="10" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="1" />
        <text x="75" y="22" textAnchor="middle" fill="#334155" fontSize="10" fontWeight="bold">📁 Key Files</text>
        <text x="75" y="42" textAnchor="middle" fill="#3b82f6" fontSize="8">VoiceInput.tsx</text>
        <text x="75" y="56" textAnchor="middle" fill="#3b82f6" fontSize="8">agent-manager.ts</text>
        <text x="75" y="70" textAnchor="middle" fill="#3b82f6" fontSize="8">google-tts.ts</text>
        <text x="75" y="84" textAnchor="middle" fill="#3b82f6" fontSize="8">multi-ai-stream/route.ts</text>
        <text x="75" y="100" textAnchor="middle" fill="#64748b" fontSize="7">(click to view code)</text>
      </g>

      {/* Arrow Markers */}
      <defs>
        <marker id="blueArrow" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
          <polygon points="0 0, 10 3.5, 0 7" fill="#3b82f6" />
        </marker>
        <marker id="orangeArrow" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
          <polygon points="0 0, 10 3.5, 0 7" fill="#f59e0b" />
        </marker>
        <marker id="purpleArrow" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
          <polygon points="0 0, 10 3.5, 0 7" fill="#8b5cf6" />
        </marker>
        <marker id="greenArrow" markerWidth="10" markerHeight="7" refX="3.5" refY="0" orient="auto">
          <polygon points="0 7, 3.5 0, 7 7" fill="#10b981" />
        </marker>
      </defs>
    </svg>
  );
}
