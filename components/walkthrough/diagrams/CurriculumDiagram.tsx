'use client';

export function CurriculumDiagram() {
  return (
    <svg
      viewBox="0 0 800 500"
      className="w-full h-auto"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Background */}
      <rect width="800" height="500" fill="#f8fafc" rx="12" />

      {/* Title */}
      <text x="400" y="35" textAnchor="middle" fill="#1e293b" fontSize="20" fontWeight="bold">
        Curriculum Sequencing System
      </text>
      <text x="400" y="55" textAnchor="middle" fill="#64748b" fontSize="12">
        Adaptive Learning Paths with Prerequisites & Mastery Tracking
      </text>

      {/* Left side: Curriculum Path */}
      <g transform="translate(30, 80)">
        <rect width="350" height="390" rx="10" fill="white" stroke="#e2e8f0" strokeWidth="1" />
        <text x="175" y="25" textAnchor="middle" fill="#334155" fontSize="14" fontWeight="bold">📚 Math Curriculum Path (Grade 5)</text>

        {/* Lesson 1 - Completed */}
        <g transform="translate(20, 45)">
          <rect width="310" height="50" rx="8" fill="#d1fae5" stroke="#10b981" strokeWidth="2" />
          <text x="40" y="22" fill="#065f46" fontSize="11" fontWeight="600">1. Number Sense Basics</text>
          <text x="40" y="38" fill="#059669" fontSize="9">Prerequisites: None</text>
          <circle cx="280" cy="25" r="12" fill="#10b981" />
          <text x="280" y="29" textAnchor="middle" fill="white" fontSize="10">✓</text>
          <text x="245" y="45" fill="#059669" fontSize="8">Mastery: 92%</text>
        </g>

        {/* Lesson 2 - Completed */}
        <g transform="translate(20, 105)">
          <rect width="310" height="50" rx="8" fill="#d1fae5" stroke="#10b981" strokeWidth="2" />
          <text x="40" y="22" fill="#065f46" fontSize="11" fontWeight="600">2. Understanding Whole Numbers</text>
          <text x="40" y="38" fill="#059669" fontSize="9">Prerequisites: Lesson 1</text>
          <circle cx="280" cy="25" r="12" fill="#10b981" />
          <text x="280" y="29" textAnchor="middle" fill="white" fontSize="10">✓</text>
          <text x="245" y="45" fill="#059669" fontSize="8">Mastery: 88%</text>
        </g>

        {/* Lesson 3 - Current */}
        <g transform="translate(20, 165)">
          <rect width="310" height="50" rx="8" fill="#fef3c7" stroke="#f59e0b" strokeWidth="3" />
          <text x="40" y="22" fill="#92400e" fontSize="11" fontWeight="600">3. Introduction to Fractions</text>
          <text x="40" y="38" fill="#d97706" fontSize="9">Prerequisites: Lesson 2</text>
          <circle cx="280" cy="25" r="12" fill="#f59e0b" />
          <text x="280" y="30" textAnchor="middle" fill="white" fontSize="14">▶</text>
          <text x="245" y="45" fill="#d97706" fontSize="8">In Progress</text>
        </g>

        {/* Lesson 4 - Locked */}
        <g transform="translate(20, 225)">
          <rect width="310" height="50" rx="8" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="1" strokeDasharray="4,2" />
          <text x="40" y="22" fill="#94a3b8" fontSize="11" fontWeight="600">4. Comparing Fractions</text>
          <text x="40" y="38" fill="#94a3b8" fontSize="9">Prerequisites: Lesson 3 (80% mastery)</text>
          <circle cx="280" cy="25" r="12" fill="#cbd5e1" />
          <text x="280" y="29" textAnchor="middle" fill="#64748b" fontSize="10">🔒</text>
        </g>

        {/* Lesson 5 - Locked */}
        <g transform="translate(20, 285)">
          <rect width="310" height="50" rx="8" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="1" strokeDasharray="4,2" />
          <text x="40" y="22" fill="#94a3b8" fontSize="11" fontWeight="600">5. Adding Fractions</text>
          <text x="40" y="38" fill="#94a3b8" fontSize="9">Prerequisites: Lesson 4 (80% mastery)</text>
          <circle cx="280" cy="25" r="12" fill="#cbd5e1" />
          <text x="280" y="29" textAnchor="middle" fill="#64748b" fontSize="10">🔒</text>
        </g>

        {/* More indicator */}
        <text x="175" y="365" textAnchor="middle" fill="#94a3b8" fontSize="11">• • • more lessons • • •</text>
      </g>

      {/* Right side: Algorithm */}
      <g transform="translate(420, 80)">
        <rect width="350" height="390" rx="10" fill="white" stroke="#e2e8f0" strokeWidth="1" />
        <text x="175" y="25" textAnchor="middle" fill="#334155" fontSize="14" fontWeight="bold">⚙️ Sequencing Algorithm</text>

        {/* Step 1 */}
        <g transform="translate(20, 50)">
          <rect width="310" height="60" rx="8" fill="#dbeafe" stroke="#3b82f6" strokeWidth="1" />
          <circle cx="25" cy="30" r="15" fill="#3b82f6" />
          <text x="25" y="35" textAnchor="middle" fill="white" fontSize="12" fontWeight="bold">1</text>
          <text x="55" y="25" fill="#1e40af" fontSize="10" fontWeight="600">Load Curriculum Path</text>
          <text x="55" y="42" fill="#3b82f6" fontSize="9">Get lessons for subject + grade level</text>
        </g>

        {/* Step 2 */}
        <g transform="translate(20, 120)">
          <rect width="310" height="60" rx="8" fill="#ddd6fe" stroke="#8b5cf6" strokeWidth="1" />
          <circle cx="25" cy="30" r="15" fill="#8b5cf6" />
          <text x="25" y="35" textAnchor="middle" fill="white" fontSize="12" fontWeight="bold">2</text>
          <text x="55" y="25" fill="#5b21b6" fontSize="10" fontWeight="600">Skip Completed Lessons</text>
          <text x="55" y="42" fill="#7c3aed" fontSize="9">Filter out lessons with mastery ≥ 80%</text>
        </g>

        {/* Step 3 */}
        <g transform="translate(20, 190)">
          <rect width="310" height="60" rx="8" fill="#fef3c7" stroke="#f59e0b" strokeWidth="1" />
          <circle cx="25" cy="30" r="15" fill="#f59e0b" />
          <text x="25" y="35" textAnchor="middle" fill="white" fontSize="12" fontWeight="bold">3</text>
          <text x="55" y="25" fill="#92400e" fontSize="10" fontWeight="600">Check Prerequisites</text>
          <text x="55" y="42" fill="#d97706" fontSize="9">Verify all required lessons are mastered</text>
        </g>

        {/* Step 4 */}
        <g transform="translate(20, 260)">
          <rect width="310" height="60" rx="8" fill="#d1fae5" stroke="#10b981" strokeWidth="1" />
          <circle cx="25" cy="30" r="15" fill="#10b981" />
          <text x="25" y="35" textAnchor="middle" fill="white" fontSize="12" fontWeight="bold">4</text>
          <text x="55" y="25" fill="#065f46" fontSize="10" fontWeight="600">Return Next Available Lesson</text>
          <text x="55" y="42" fill="#059669" fontSize="9">Auto-assign to student dashboard</text>
        </g>

        {/* Key Feature Box */}
        <g transform="translate(20, 330)">
          <rect width="310" height="50" rx="8" fill="#fce7f3" stroke="#ec4899" strokeWidth="2" />
          <text x="155" y="22" textAnchor="middle" fill="#9d174d" fontSize="10" fontWeight="bold">🎯 Mastery-Based Progression</text>
          <text x="155" y="40" textAnchor="middle" fill="#db2777" fontSize="9">80% score required to unlock next lesson</text>
        </g>
      </g>

      {/* Connection Arrow */}
      <path d="M 380 275 L 420 275" stroke="#64748b" strokeWidth="2" markerEnd="url(#arrowRight)" strokeDasharray="4,2" />

      {/* Arrow Marker Definition */}
      <defs>
        <marker id="arrowRight" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
          <polygon points="0 0, 10 3.5, 0 7" fill="#64748b" />
        </marker>
      </defs>
    </svg>
  );
}
