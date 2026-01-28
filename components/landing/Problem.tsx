export function Problem() {
  return (
    <section id="problem-section" className="py-20 px-4 bg-white">
      <div className="max-w-6xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            The Global Education Crisis
          </h2>
        </div>

        {/* Statistic Highlight */}
        <div className="bg-gradient-to-r from-error/10 to-accent/10 rounded-2xl p-8 md:p-12 mb-12 border-l-4 border-error">
          <p className="text-3xl md:text-5xl font-bold text-error mb-4">
            251 Million Children
          </p>
          <p className="text-xl md:text-2xl text-gray-700">
            lack access to quality education worldwide
          </p>
        </div>

        {/* Image Grid */}
        <div className="grid md:grid-cols-2 gap-8 mb-12">
          {/* Empty Classroom */}
          <div>
            <div className="aspect-video rounded-xl shadow-lg overflow-hidden mb-3">
              <img
                src="/images/empty-class.jpg"
                alt="Empty classroom showing lack of access to education"
                className="w-full h-full object-cover"
              />
            </div>
            <p className="text-center text-gray-600 text-sm md:text-base italic">
              Empty classrooms due to pandemics
            </p>
          </div>

          {/* Overcrowded School */}
          <div>
            <div className="aspect-video rounded-xl shadow-lg overflow-hidden mb-3">
              <img
                src="/images/overcrowded-school.jpg"
                alt="Overcrowded school classroom"
                className="w-full h-full object-cover"
              />
            </div>
            <p className="text-center text-gray-600 text-sm md:text-base italic">
              Overcrowded classrooms due to insufficient school infrastructure
            </p>
          </div>
        </div>

        {/* Explanation Text */}
        <div className="prose prose-lg max-w-4xl mx-auto text-gray-700">
          <p className="text-center text-lg md:text-xl leading-relaxed">
            Millions of children around the world face barriers to education: lack of qualified teachers,
            overcrowded classrooms, limited resources, and geographical isolation. Traditional education
            systems struggle to provide personalized attention and quality instruction to every student
            who needs it.
          </p>
        </div>
      </div>
    </section>
  );
}
