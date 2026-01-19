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
            Bloom teaches through interactive dialogue, adjusting how it explains concepts to match
            each student's learning style and pace.
          </p>
        </div>

        {/* Demo Showcase Placeholder */}
        <div className="mb-12">
          <div className="aspect-video bg-gradient-to-br from-primary/20 to-accent/20 rounded-2xl shadow-2xl flex items-center justify-center border-2 border-primary/30">
            <div className="text-center">
              <div className="text-6xl mb-4">🎬</div>
              <p className="text-2xl font-semibold text-gray-800">Interactive Preview Placeholder</p>
              <p className="text-gray-600 mt-2 max-w-md mx-auto px-4">
                Video or interactive demo showing actual teaching session
              </p>
            </div>
          </div>
        </div>

        {/* Student Testimonials Placeholder */}
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-success/10 border border-success/30 rounded-xl p-6">
            <p className="text-gray-700 italic mb-4">
              "Student testimonial placeholder - Real feedback from beta testing will go here"
            </p>
            <p className="text-sm text-gray-600 font-semibold">- Student Name, Grade X</p>
          </div>
          <div className="bg-success/10 border border-success/30 rounded-xl p-6">
            <p className="text-gray-700 italic mb-4">
              "Student testimonial placeholder - Real feedback from beta testing will go here"
            </p>
            <p className="text-sm text-gray-600 font-semibold">- Student Name, Grade X</p>
          </div>
        </div>
      </div>
    </section>
  );
}
