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
            244 Million Children
          </p>
          <p className="text-xl md:text-2xl text-gray-700">
            lack access to quality education worldwide
          </p>
        </div>

        {/* Image Grid */}
        <div className="grid md:grid-cols-2 gap-8 mb-12">
          {/* Empty Classroom Placeholder */}
          <div className="aspect-video bg-gradient-to-br from-gray-300 to-gray-400 rounded-xl shadow-lg flex items-center justify-center">
            <div className="text-center text-white">
              <p className="text-xl font-semibold">Image Placeholder</p>
              <p className="text-sm mt-2 opacity-90">Empty classrooms</p>
            </div>
          </div>

          {/* Overcrowded School Placeholder */}
          <div className="aspect-video bg-gradient-to-br from-gray-400 to-gray-500 rounded-xl shadow-lg flex items-center justify-center">
            <div className="text-center text-white">
              <p className="text-xl font-semibold">Image Placeholder</p>
              <p className="text-sm mt-2 opacity-90">Overcrowded schools</p>
            </div>
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
