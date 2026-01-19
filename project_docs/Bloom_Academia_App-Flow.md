APP FLOW DOCUMENT
Bloom Academia
Complete User Journey Walkthrough
INTRODUCTION
Hey! Let me walk you through exactly how our AI school works, from the moment someone visits the site to when they're actually learning. Think of this as me sitting next to you, clicking through the app and explaining everything that happens.

For the hackathon demo, we've kept things super simple - no sign-up walls, no login screens. You just jump right in and start learning. Let's see how it all flows!
 
1. LANDING PAGE (First Impression)
URL: www.bloomacademia.com (or whatever we call it!)

What the user sees:
When someone first visits, they land on a stunning landing page that immediately communicates our vision. It's not a typical edtech homepage - this is different.

Hero Section
•	Big, bold headline: "The Future of Education Is Here"
•	Subheadline: "Every child deserves a world-class teacher. Now they have one."
•	Eye-catching demo video showing a real student learning fractions with voice + whiteboard
•	Two clear call-to-action buttons:
•	   • "Enroll Now" (primary button - bright, prominent)
•	   • "Learn More" (secondary button)

The Problem Section
As they scroll down, they see:
•	Powerful statistic: "244 million children worldwide lack access to education"
•	Images showing empty classrooms, overcrowded schools
•	Text explaining the global education crisis

The Solution Section
•	Title: "Meet Bloom Academia"
•	Three feature highlights with icons:
•	   1. Voice-based teaching that feels natural
•	   2. Interactive visual lessons synchronized with voice
•	   3. Personalized to how YOU learn

How It Works (Visual)
A real conversation, not a chatbot
Bloom teaches through interactive dialogue, adjusting how it explains concepts to match each student’s learning style and pace.
Demo Showcase
•	Video or interactive preview showing actual teaching session
•	Real student reactions/testimonials from beta testing

The Vision
•	Map showing global reach potential
•	Stats: "Access school from anywhere, learn any subject, in any language"
•	The big picture: Complete school infrastructure replacement. Imagine a world where everyone is a first class student because of easy access to high quality education

Final Call-to-Action
•	"Experience the Future of Learning"
•	Large "Enroll Now" button
•	Small text: "No sign-up required."

What happens when they click "Enroll Now":
They're immediately taken to the welcome screen - no barriers, no forms, just straight into the experience.
 
2. WELCOME SCREEN (Getting Started)
Okay, so they've clicked "Enroll Now" and now they're here. This is the first interactive screen where we prepare them for the learning experience.

What they see:
•	Clean, welcoming interface with the app logo at the top
•	Friendly greeting: "Welcome! Let's get you started."
•	Quick intro text: " You’re about to experience a new kind of education. Personalized, interactive, and built around you.."

Quick Setup (No Account Needed)
Since we can't use sign-up/login, here's how we handle it:

•	Simple form with just 3 fields:
•	   • "What’s your name?" (text input - first name only)
•	   • "How old are you?" (dropdown: 8, 9, 10, 11, 12, or "Other")
•	   • "What grade are you starting from?" (dropdown: Grade 3, 4, 5, or "Not sure")

•	Below the form: "We'll use this to personalize your lessons.”

Technical note(Not displayed): We store this in browser localStorage (no backend auth needed). If they close the browser, they can pick up where they left off on the same device.

Microphone Permission
•	Important message: "Click below to allow microphone access."
•	Button: "Enable Microphone"
•	When clicked, browser prompts for mic permission
•	If denied: Show helpful message explaining it's needed for voice teaching

Ready to Learn
•	Once name/age/grade entered and mic enabled:
•	Big green button: "Start Learning!"


What happens when they click "Start Learning":
They're taken directly to the Lesson Selection screen.
 
3. LESSON SELECTION SCREEN
Alright, now they're ready to learn! This screen shows them what they are going to study for the week.

Layout:

Top Bar
•	Left: App logo that clicks back to landing page
•	Center: Greeting - "Hi [Name]! Ready to learn?"
•	Right: Small settings icon (for later - adjusting volume, etc.)

Main Content Area
Section Title: “Start next Class"

We show class/lesson cards in a grid layout (2-3 cards per row on desktop, 1 on mobile). Each card represents one lesson:

Lesson Card Design:
•	Lesson title (e.g., "Introduction to Fractions")
•	Short description (1-2 lines): "Learn what fractions are using pizza and real-world examples”
•	Visual: Small icon or illustration related to the topic
•	Status badge (if they've started/completed):
•	   • Not started: "New" badge
•	   • In progress: "Continue" with progress bar (30% complete)
•	   • Completed: Green checkmark + "Review" option

Available Lessons (MVP):
1.	Introduction to Fractions (FEATURED - this is our main demo lesson)
2.	Comparing Fractions
3.	Adding Fractions
4.	Introduction to Decimals
5.	Basic Multiplication

The "Introduction to Fractions" card is highlighted/featured since it's our best demo.

Bottom Section
•	Coming soon preview: "More subjects coming soon: Science, English, History..."
•	Progress summary: "You've completed 0 of 5 classes. Keep going!"

What happens when they click a lesson card:
They're taken to the Lesson Intro screen for that specific lesson.
 
4. LESSON INTRO SCREEN
Before jumping into the actual teaching, we give them a quick preview of what they're about to learn. This sets expectations and gets them excited.

Example: They clicked on "Introduction to Fractions"

What They See
•	Back button (top-left) to return to lesson selection
•	Lesson title: "Introduction to Fractions"
•	Hero image or animation related to fractions (pizza, pie charts, etc.)

Lesson Overview Box
What you'll learn:
•	What fractions represent
•	How to read and write fractions
•	Real-world examples of fractions

Prerequisites: None - perfect for starting out!

How This Works Section
•	Icon + text: "I'll teach using voice"
•	Icon + text: "You'll see visual examples on the whiteboard"
•	Icon + text: "Ask questions anytime - interrupt me if confused!"
•	Icon + text: "Practice problems to test your understanding"

Microphone Check
•	Small box: "Quick check - is your microphone working?"
•	Green indicator if mic is active
•	If not: "Click here to enable microphone" button

Call to Action
•	Large, exciting button: "Start Class!"

What happens when they click "Start Class":
NOW the magic happens! They enter the actual Learning Interface - the core experience of the entire app.
 
5. LEARNING INTERFACE (The Core Experience)
This is it - the heart of the app. This is where they actually learn with the AI teacher. Everything else has been building up to this moment.

Design Philosophy:
Immersive, distraction-free, feels like you're in a one-on-one tutoring session. NO cluttered UI. Just you and your teacher.

5.1 Layout & UI Elements

The Whiteboard (Main Area):
•	Takes up basically the entire screen
•	Clean white/light gray background
•	This is where all the visual teaching happens
•	Content appears here as the AI teaches:
•	   • Lesson titles and headings
•	   • Diagrams (pizzas cut into slices, number lines, shapes)
•	   • Mathematical equations
•	   • Highlighted text and explanations
•	   • Practice problems

Everything appears with smooth animations synchronized to the AI's voice. Like watching a teacher draw on a real whiteboard, but digital and perfectly timed.

Minimal UI Overlay (Only Essentials)
Top-left corner:
•	Small "Exit" button (X icon) - if clicked, confirms "Class is still in progress, are you sure?"

Bottom-center:
•	Voice indicator - the main interactive element:
•	   • When AI is speaking: Pulsing waveform animation with text "Teaching..."
•	   • When AI is listening: Microphone icon pulsing with text "Listening..."
•	   • When waiting for student: Gentle pulse with text "Your turn to speak"

Bottom-right corner:
•	Progress indicator: "Step 2 of 8" (subtle, not distracting)
•	Lesson title: "Intro to Fractions" (very small, just for context)

That's it. No sidebars, no menus, no distractions. Just learning.
 
5.2 The Teaching Flow (Step-by-Step)
Let me walk you through exactly what happens during a lesson. This is the "Introduction to Fractions" lesson:

Step 1: Welcome & Introduction

The lesson starts. Whiteboard is blank.

AI speaks: "Hi [Name]! I'm so excited to teach you about fractions today. Have you ever shared a pizza with friends? Well, that's exactly what fractions are about - sharing things into equal parts. Let's dive in!"

While AI speaks:
•	Lesson title fades in at top: "Introduction to Fractions"
•	A pizza illustration appears in the center of whiteboard
•	Voice indicator shows pulsing animation: "Teaching..."

Student can interrupt at any time by just speaking. If they say "Wait, I don't understand," the AI pauses and adjusts.

Step 2: Core Concept Explanation

AI speaks: "Let's start simple. Imagine this pizza is cut into 4 equal slices. If you take 1 slice, you have 1 out of 4 pieces. We write this as 1/4. The bottom number tells us how many total pieces, and the top number tells us how many we're talking about."

While AI speaks:
•	Pizza diagram animates - dividing into 4 slices
•	One slice highlights in a different color
•	The fraction "1/4" appears next to it with an arrow
•	Labels appear: "numerator" (pointing to 1) and "denominator" (pointing to 4)

Everything times perfectly with the voice. When AI says "1 out of 4," that's exactly when "1/4" appears on screen.

Step 3: Check for Understanding

AI speaks: "Does that make sense so far? If I cut a pizza into 4 slices and you eat 1, what fraction did you eat?"

Voice indicator changes: "Listening..." (microphone icon pulsing)

Student responds: "One-fourth?"

AI recognizes answer and responds: "Exactly right! You're getting it. Let's try another example to make sure you really understand."

If student says "I don't know" or gets it wrong:
AI responds: "No worries! Let me explain it differently. Think of it like this..." [proceeds with alternative explanation using a different analogy]

Step 4: More Examples

AI speaks: "Great! Now let's look at a chocolate bar. If it has 8 pieces and you break off 3, what fraction is that?"

Whiteboard updates:
•	Pizza diagram fades out
•	Chocolate bar illustration appears, divided into 8 sections
•	3 sections highlight

Student responds: "Three-eighths?"

AI: "Perfect! You're really getting the hang of this. Let me show you how we write it."

Whiteboard shows: "3/8" appearing with nice animation

Step 5: Practice Problems

AI speaks: "Now it's your turn to try some on your own. I'll give you a few problems. Don't worry - I'm here if you need help!"

Whiteboard clears and shows:
"Problem 1: A sandwich is cut into 6 pieces. You eat 2 pieces. What fraction did you eat?"

Illustration of sandwich divided into 6 pieces appears.

Voice indicator: "Listening..."

Student answers: "Two-sixths"

AI: "Exactly! You can also simplify that to one-third, but we'll learn about simplifying later. Great job!"

Green checkmark appears on whiteboard. Confetti animation (subtle).

This pattern continues for 2-3 more practice problems, each getting slightly more complex.

Step 6: Lesson Summary & Encouragement

AI speaks: "Wow, [Name], you did amazing! Today you learned what fractions are, how to read them, and how they show parts of a whole. You can use fractions in real life - sharing food, measuring ingredients, telling time. I'm really proud of how quickly you picked this up!"

Whiteboard shows:
•	Summary box with key points:
•	   ✓ Fractions show parts of a whole
•	   ✓ Top number = parts you have
•	   ✓ Bottom number = total parts
•	Celebration graphic (trophy or star)

Step 7: What's Next

AI: "Ready to keep going? You could try 'Comparing Fractions' next, or take a break and come back later. What would you like to do?"

Voice indicator: "Listening..."

Student can respond with:
•	"Next lesson" → Goes to next recommended lesson
•	"Take a break" → Goes to completion screen
•	"Repeat this lesson" → Restarts current lesson
 
5.3 Interactive Elements During Learning
Throughout the lesson, several things can happen:

Student Interrupts Mid-Explanation:
•	Student says: "Wait, can you explain that again?"
•	AI immediately pauses current explanation
•	AI: "Of course! Let me go over that again. [Re-explains using different words/approach]"

Student Asks Unrelated Question:
•	Student: "What's your name?"
•	AI: "I'm your AI teacher! I don't have a traditional name, but you can call me whatever you'd like. Now, should we get back to learning about fractions, or would you like to take a break?"
•	Gently guides back to lesson while being friendly

Student Gets Frustrated:
•	Student: "This is too hard!"
•	AI detects emotion, adjusts approach
•	AI: "Hey, I totally understand - fractions can be tricky at first. Let's slow down and break this into even smaller steps. You're doing great, and I know you can get this!"
•	Provides easier example or more explanation

Technical Issue (e.g., couldn't hear student):
•	AI: "I'm sorry, I didn't quite catch that. Can you say it again?"
•	Voice indicator pulses more prominently: "Listening..."
 
6. LESSON COMPLETION SCREEN
After finishing a lesson, students see a celebration screen that summarizes their achievement.

What They See:

•	Big celebration animation (confetti, stars, trophy)
•	Headline: "Lesson Complete! 🎉"
•	Subheading: "You've mastered Introduction to Fractions"

Lesson Summary
Box showing:
•	Time spent: "15 minutes"
•	Problems solved: "5 out of 5 correct"
•	Mastery level: Progress bar showing 100%
•	What you learned:
•	   • What fractions represent
•	   • How to read fractions (numerator/denominator)
•	   • Real-world fraction examples

What's Next Section
Recommended Next Lesson:
•	Card for "Comparing Fractions" (highlighted as suggested next step)
•	"Now that you know what fractions are, learn how to compare them!"
•	Button: "Start Next Lesson"

Other Options
•	Button: "Back to Lessons" (returns to lesson selection)
•	Button: "Review This Lesson" (restarts the lesson)
•	Link: "I'm done for today" (goes to progress summary)
 
7. PROGRESS SUMMARY (Optional Exit Screen)
If student clicks "I'm done for today" or exits during/after lessons, they see this:

What They See:

•	Greeting: "Great work today, [Name]!"
•	Summary of today's session:
•	   • Time spent learning: "15 minutes"
•	   • Lessons completed: "1 lesson"
•	   • Topics mastered: "Introduction to Fractions"

Your Learning Journey
Visual progress map showing:
•	Completed lessons (green checkmarks)
•	Available next lessons (highlighted)
•	Locked lessons (grayed out with lock icons - need prerequisites)

Continue Learning
•	Button: "Continue Learning" (back to lesson selection)
•	Small text: "Your progress is saved. Come back anytime!"

8. TECHNICAL FLOWS & EDGE CASES
Let me explain what happens behind the scenes and how we handle various situations:

8.1 Data Persistence (No Account Needed)
How we save progress without login:
•	Using browser localStorage for all data:
•	   • Student name, age, grade
•	   • Completed lessons
•	   • Progress percentages
•	   • Time spent learning

•	Stored as JSON in localStorage with key: 'ai-school-progress'

Limitations:
•	Data is device/browser-specific (can't sync across devices)
•	If they clear browser data, progress is lost

User messaging:
•	On first visit: "Your progress will be saved on this device"
•	Subtle reminder: "Learning on a different device? Your progress is saved locally per browser"

8.2 Microphone Access Handling
Scenario 1: User grants microphone access
•	Green indicator shows: "Microphone ready ✓"
•	Proceeds normally to lessons

Scenario 2: User denies microphone access
•	Warning message appears:
•	"This app requires microphone access for voice conversations. Please enable it in your browser settings."
•	Show step-by-step instructions based on detected browser (Chrome, Safari, Firefox)
•	"Can't enable mic? You can still browse lessons, but won't be able to have voice conversations"

Scenario 3: Microphone suddenly stops working mid-lesson
•	AI detects no audio input
•	Pauses lesson, shows overlay: "I can't hear you. Check your microphone."
•	Option to test microphone or exit lesson

8.3 Connection Issues
Scenario: Internet connection drops during lesson
•	Detect connection loss (WebSocket disconnects)
•	Show overlay: "Connection lost. Trying to reconnect..."
•	Spinning loader
•	If reconnects within 10 seconds: "Back online! Let's continue."
•	If doesn't reconnect: "Can't connect. Please check your internet and try again."
•	Button: "Try Again" or "Exit Lesson"
•	Progress up to disconnection point is saved

8.4 Browser Compatibility
Supported browsers:
•	Chrome 90+
•	Safari 14+
•	Firefox 88+
•	Edge 90+

Unsupported browser detection:
•	If user visits on IE or very old browser:
•	Show message: "This app requires a modern browser. Please use Chrome, Safari, Firefox, or Edge."
•	Provide download links

8.5 Mobile Experience
Mobile-specific adaptations:
•	Whiteboard content is optimized for smaller screens
•	Font sizes automatically adjust
•	Voice indicator is more prominent (easier to tap)
•	Touch-friendly UI elements
•	Supports both portrait and landscape orientations

Mobile limitations:
•	Some browsers (especially iOS Safari) have stricter mic permissions
•	Show clear instructions for enabling mic on mobile
 
9. COMPLETE USER JOURNEY SCENARIOS
Let me show you three complete user journeys from start to finish:

Scenario A: First-Time User (Happy Path)
6.	Sees landing page → gets excited by demo video
7.	Clicks "Enroll Now"
8.	Welcome screen → enters name "Sarah", age "10", grade "4"
9.	Grants microphone permission
10.	Clicks "Start Class"
11.	Lesson selection → clicks "Introduction to Fractions"
12.	Lesson intro → reads overview → clicks "Start Lesson"
13.	Learning interface loads → AI greets Sarah by name
14.	Goes through entire fractions lesson:
15.	   • AI explains with pizza analogy
16.	   • Sarah asks clarifying question, AI explains differently
17.	   • Sarah completes 5 practice problems
18.	   • Gets encouragement from AI throughout
19.	Lesson completes → celebration screen
20.	Sees recommendation for "Comparing Fractions"
21.	Decides to take a break → clicks "I'm done for today"
22.	Progress summary shows 1 lesson completed
23.	Closes browser → progress saved in localStorage

Later that day:
24.	Returns to website → localStorage recognizes her
25.	Goes straight to lesson selection (no re-entering info)
26.	Sees "Introduction to Fractions" marked complete with checkmark
27.	Starts "Comparing Fractions" lesson

Scenario B: Struggling Student (Needs Help)
28.	Gets to learning interface → AI starts teaching fractions
29.	After first explanation, student says: "I don't get it"
30.	AI responds: "No problem! Let me explain it a different way..."
31.	Uses different analogy (chocolate bar instead of pizza)
32.	Student still confused, says: "This is hard"
33.	AI detects frustration, slows down:
34.	"Let's take this step by step. Forget fractions for a second. If you have 4 cookies and eat 1, how many are left?"
35.	Student: "Three"
36.	AI: "Exactly! Now, that 1 cookie you ate was 1 out of the 4 total cookies. That's a fraction - 1/4!"
37.	Student: "Ohh, I get it now!"
38.	AI: "See? You're smarter than you think! Let's practice."
39.	Continues with simpler practice problems
40.	Completes lesson successfully with AI's patient guidance

Scenario C: Quick Learner (Advanced)
41.	Starts "Introduction to Fractions" lesson
42.	AI begins basic explanation
43.	Student interrupts: "I already know this, can we skip ahead?"
44.	AI: "Great! Sounds like you've seen fractions before. Let me test your knowledge."
45.	AI gives harder problem immediately
46.	Student answers correctly
47.	AI: "Wow, you really do know this! Would you like to:
48.	   a) Complete this lesson quickly with harder problems
49.	   b) Skip to the next lesson (Comparing Fractions)"
50.	Student chooses to skip
51.	Lesson marked as complete
52.	Moves to more advanced lesson
 
10. COMPLETE NAVIGATION MAP
Here's every screen and how users can navigate between them:

Landing Page
•	→ Welcome Screen (via "Enroll Now" button)
•	→ Landing Page sections (via "Learn More" button / scroll)

Welcome Screen
•	→ Lesson Selection (via "Start Learning" button after setup)
•	← Landing Page (via logo click or back button)

Lesson Selection
•	→ Lesson Intro (via clicking any lesson card)
•	← Landing Page (via logo click)
•	→ Settings (via settings icon - future feature)

Lesson Intro
•	→ Learning Interface (via "Start Lesson" button)
•	← Lesson Selection (via back button)

Learning Interface
•	→ Completion Screen (when lesson finishes)
•	← Lesson Selection (via Exit button → confirmation dialog)
•	→ Progress Summary (via Exit during lesson)

Completion Screen
•	→ Next Lesson Intro (via "Start Next Lesson" button)
•	→ Lesson Selection (via "Back to Lessons" button)
•	→ Same Lesson Intro (via "Review This Lesson" button)
•	→ Progress Summary (via "I'm done for today" link)

Progress Summary
•	→ Lesson Selection (via "Continue Learning" button)
•	← Landing Page (via logo click)
 
11. DESIGN & UX NOTES
Color Scheme
•	Primary: Bright blue (#4A90E2) - trust, intelligence
•	Secondary: Green (#7ED321) - growth, success
•	Accent: Orange (#F5A623) - energy, excitement
•	Neutrals: White, light gray, dark gray for text
•	Whiteboard background: Soft off-white (#FAFAFA)

Typography
•	Headings: Bold, modern sans-serif (Inter or Poppins)
•	Body text: Clean, readable sans-serif (Open Sans or system font)
•	Whiteboard content: Slightly larger for readability

Animations
•	Keep smooth and purposeful (not distracting)
•	Fade-in: 300ms for text and images
•	Draw animation: 1-2 seconds for diagrams
•	Voice indicator: Continuous subtle pulse
•	Confetti: Only on major achievements, quick

Accessibility
•	High contrast text (WCAG AA compliant)
•	Large tap targets on mobile (min 44x44px)
•	Keyboard navigation support
•	Screen reader friendly (proper ARIA labels)
•	Captions option for voice (future feature)
 
12. SUMMARY
So that's the complete flow! Let me summarize the core path:

The 5-Minute Journey:
53.	Land on inspiring homepage → "Enroll Now"
54.	Enter name + age + grant mic → "Start Learning"
55.	Pick "Introduction to Fractions" → "Start Lesson"
56.	Experience voice + visual teaching for 15 minutes
57.	Complete lesson → celebrate → choose next lesson or take break

What makes this special:
•	Zero friction - no sign-up walls
•	Immediate value - learning starts in under 2 minutes
•	Immersive experience - feels like a real teacher
•	Personalized - AI adapts to each student's pace
•	Encouraging - celebrates wins, patient with struggles

The key to the hackathon demo is showing that core learning interface - that's where the magic happens. Everything else just needs to be smooth and get out of the way so the AI teaching can shine.

Questions? Confused about any part? Let me know and I'll explain further! 😊

* * * END OF APP FLOW * * *
