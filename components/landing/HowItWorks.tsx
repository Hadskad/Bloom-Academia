export function HowItWorks() {
  return (
    <section className="py-20 px-4 bg-white">
      <div className="max-w-6xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            Learning that listens, adapts, and grows with you.
          </h2>
          <p className="text-xl text-gray-700 max-w-3xl mx-auto">
            Bloom teaches through interactive dialogue, adjusting how concepts are explained, to match
            each student's learning style and pace.
          </p>
        </div>

        {/* Demo Showcase */}
        <div className="mb-12">
          <div className="aspect-video rounded-2xl shadow-2xl overflow-hidden">
            <img
              src="/images/student-learning.png"
              alt="Student learning fractions with voice and whiteboard"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
