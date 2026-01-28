import { Globe, Languages, GraduationCap } from 'lucide-react';

export function Vision() {
  const stats = [
    {
      icon: Globe,
      title: 'Access from Anywhere',
      description: 'Learn from any location with an internet connection',
    },
    {
      icon: GraduationCap,
      title: 'Learn Any Subject',
      description: 'Comprehensive curriculum across all major subjects',
    },
    {
      icon: Languages,
      title: 'In Any Language',
      description: 'Breaking language barriers to education',
    },
  ];

  return (
    <section className="py-20 px-4 bg-gradient-to-b from-blue-50 to-white">
      <div className="max-w-6xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            Our Vision:
          </h2>
          <p className="text-xl text-gray-700 max-w-3xl mx-auto">
           A world where a child’s future is no longer limited by geography, disability, income, or access to teachers, where every child, anywhere on Earth, grows up with a world class education. Bloom Academia exists to become the first truly universal school: one that listens, adapts, and delivers world‑class teaching, personalized to every child. In Sha Allah, we aim to build the infrastructure that makes quality education a human constant, not a privilege.
          </p>
        </div>

        {/* Global Reach Map */}
        <div className="mb-16">
          <div className="rounded-2xl shadow-2xl overflow-hidden bg-gray-100">
            <img
              src="/images/world-map.png"
              alt="World map showing Bloom Academia's global reach and accessibility"
              className="w-full h-auto"
            />
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid md:grid-cols-3 gap-8 mb-12">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div key={index} className="text-center">
                <div className="bg-primary/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Icon className="text-primary w-10 h-10" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  {stat.title}
                </h3>
                <p className="text-gray-700">
                  {stat.description}
                </p>
              </div>
            );
          })}
        </div>

        {/* Big Picture Statement */}
        <div className="bg-gradient-to-r from-primary/10 to-accent/10 rounded-2xl p-8 md:p-12 border-l-4 border-primary">
          <p className="text-2xl md:text-3xl font-bold text-gray-900 text-center">
            Complete School Infrastructure Replacement
          </p>
          <p className="text-lg md:text-xl text-gray-700 text-center mt-4">
            Democratizing access to world-class education for every child, everywhere
          </p>
        </div>
      </div>
    </section>
  );
}
