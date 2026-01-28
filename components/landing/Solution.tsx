import { Mic, BookOpen, User } from 'lucide-react';

export function Solution() {
  const features = [
    {
      icon: Mic,
      title: 'Voice-Based Teaching',
      description: 'Natural conversations that feel like talking to a real teacher. No typing, just speaking.',
    },
    {
      icon: BookOpen,
      title: 'Interactive Visual Lessons',
      description: 'Dynamic whiteboards synchronized with voice instruction. See concepts come to life in real-time.',
    },
    {
      icon: User,
      title: 'Personalized Learning',
      description: 'Bloom adapts to your learning style, pace, and needs. Every lesson is tailored just for you.',
    },
  ];

  return (
    <section className="py-20 px-4 bg-gradient-to-b from-white to-blue-50">
      <div className="max-w-6xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            Bloom Academia
          </h2>
          <p className="text-xl text-gray-700 max-w-3xl mx-auto">
            A revolutionary AI-powered school that brings world-class education to every student, everywhere.
          </p>
        </div>

        {/* Feature Cards */}
        <div className="grid md:grid-cols-3 gap-8">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div
                key={index}
                className="bg-white rounded-xl p-8 shadow-lg hover:shadow-xl transition-shadow border border-gray-100"
              >
                <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mb-6">
                  <Icon className="text-primary w-8 h-8" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">
                  {feature.title}
                </h3>
                <p className="text-gray-700 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
