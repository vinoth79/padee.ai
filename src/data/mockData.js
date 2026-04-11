// ─── STUDENT PROFILE ──────────────────────────────────────────────────────────
export const studentProfile = {
  name: 'Arjun Sharma',
  class: '10',
  school: 'Delhi Public School, R.K. Puram',
  avatar: 'AS',
  xp: 1840,
  level: 6,
  levelName: 'Scholar',
  nextLevelXP: 2400,
  streak: 7,
  longestStreak: 12,
  daysActive: 14,
  subjects: ['Physics', 'Chemistry', 'Mathematics', 'Biology', 'Computer Science'],
  joinedDays: 21,
}

// ─── SUBJECTS ─────────────────────────────────────────────────────────────────
export const subjects = [
  { id: 'physics', name: 'Physics', icon: '⚡', color: 'blue', bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200', accent: '#3b82f6', chapters: 15, completed: 6 },
  { id: 'chemistry', name: 'Chemistry', icon: '🧪', color: 'orange', bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-200', accent: '#f97316', chapters: 16, completed: 4 },
  { id: 'mathematics', name: 'Mathematics', icon: '📐', color: 'purple', bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-200', accent: '#9333ea', chapters: 15, completed: 8 },
  { id: 'biology', name: 'Biology', icon: '🌿', color: 'green', bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200', accent: '#22c55e', chapters: 16, completed: 5 },
  { id: 'cs', name: 'Computer Science', icon: '💻', color: 'cyan', bg: 'bg-cyan-100', text: 'text-cyan-700', border: 'border-cyan-200', accent: '#06b6d4', chapters: 9, completed: 3 },
]

// ─── CHAPTERS (Physics Class 10) ──────────────────────────────────────────────
export const physicsChapters = [
  {
    id: 'ch1', number: 1, name: 'Light — Reflection and Refraction',
    topics: [
      { id: 't1', name: 'Reflection of Light', mastery: 'mastered', doubts: 2 },
      { id: 't2', name: 'Spherical Mirrors', mastery: 'learning', doubts: 3 },
      { id: 't3', name: 'Refraction of Light', mastery: 'beginner', doubts: 1 },
      { id: 't4', name: 'Lenses and Lens Formula', mastery: 'not-started', doubts: 0 },
    ],
    progress: 55, status: 'in-progress',
  },
  {
    id: 'ch2', number: 10, name: 'The Human Eye and Colourful World',
    topics: [
      { id: 't5', name: 'Structure of the Human Eye', mastery: 'mastered', doubts: 1 },
      { id: 't6', name: 'Defects of Vision', mastery: 'mastered', doubts: 0 },
      { id: 't7', name: 'Dispersion of Light', mastery: 'learning', doubts: 2 },
    ],
    progress: 80, status: 'in-progress',
  },
  {
    id: 'ch3', number: 12, name: 'Electricity',
    topics: [
      { id: 't8', name: "Ohm's Law", mastery: 'mastered', doubts: 1 },
      { id: 't9', name: 'Resistance and Resistivity', mastery: 'learning', doubts: 4 },
      { id: 't10', name: 'Series & Parallel Circuits', mastery: 'beginner', doubts: 3 },
      { id: 't11', name: 'Power Formulas (P=VI)', mastery: 'not-started', doubts: 0 },
    ],
    progress: 35, status: 'in-progress',
  },
  {
    id: 'ch4', number: 13, name: 'Magnetic Effects of Electric Current',
    topics: [
      { id: 't12', name: 'Magnetic Field and Field Lines', mastery: 'not-started', doubts: 0 },
      { id: 't13', name: 'Electromagnetic Induction', mastery: 'not-started', doubts: 0 },
    ],
    progress: 0, status: 'not-started',
  },
]

// ─── MATH CHAPTERS ────────────────────────────────────────────────────────────
export const mathChapters = [
  { id: 'mch1', number: 1, name: 'Real Numbers', progress: 100, status: 'completed', topics: [] },
  { id: 'mch2', number: 2, name: 'Polynomials', progress: 100, status: 'completed', topics: [] },
  { id: 'mch3', number: 3, name: 'Pair of Linear Equations', progress: 75, status: 'in-progress', topics: [] },
  { id: 'mch4', number: 4, name: 'Quadratic Equations', progress: 40, status: 'in-progress', topics: [] },
  { id: 'mch5', number: 5, name: 'Arithmetic Progressions', progress: 0, status: 'not-started', topics: [] },
]

// ─── MCQ PRACTICE QUESTIONS ───────────────────────────────────────────────────
export const mcqQuestions = [
  {
    id: 'q1',
    subject: 'Physics',
    chapter: 'Electricity',
    topic: "Ohm's Law",
    difficulty: 'Medium',
    question: 'A wire has a resistance of 10 Ω. If the voltage across it is 5 V, what is the current flowing through it?',
    options: ['0.2 A', '0.5 A', '2 A', '50 A'],
    correct: 1,
    explanation: "Using Ohm's Law: I = V/R = 5/10 = 0.5 A. Remember: Current (I) equals Voltage (V) divided by Resistance (R). This is the fundamental relation in electric circuits.",
    xp: 5,
  },
  {
    id: 'q2',
    subject: 'Physics',
    chapter: 'Electricity',
    topic: 'Series & Parallel Circuits',
    difficulty: 'Hard',
    question: 'Three resistors of 2 Ω, 3 Ω, and 6 Ω are connected in parallel. What is the equivalent resistance?',
    options: ['11 Ω', '1 Ω', '3.67 Ω', '0.5 Ω'],
    correct: 1,
    explanation: 'For parallel circuits: 1/R = 1/2 + 1/3 + 1/6 = 3/6 + 2/6 + 1/6 = 6/6 = 1. Therefore R = 1 Ω. In parallel, equivalent resistance is always less than the smallest individual resistance.',
    xp: 5,
  },
  {
    id: 'q3',
    subject: 'Physics',
    chapter: 'Electricity',
    topic: 'Power Formulas',
    difficulty: 'Easy',
    question: 'A bulb rated 60 W is connected to a 220 V supply. What is the current through the bulb?',
    options: ['0.27 A', '2.7 A', '3.6 A', '13200 A'],
    correct: 0,
    explanation: 'Power P = V × I, so I = P/V = 60/220 ≈ 0.27 A. This is why high-power appliances draw more current and require thicker wires.',
    xp: 5,
  },
  {
    id: 'q4',
    subject: 'Mathematics',
    chapter: 'Quadratic Equations',
    topic: 'Nature of Roots',
    difficulty: 'Medium',
    question: 'For the equation 2x² - 4x + 2 = 0, the discriminant is:',
    options: ['8', '0', '-8', '16'],
    correct: 1,
    explanation: 'Discriminant D = b² - 4ac = (-4)² - 4(2)(2) = 16 - 16 = 0. When D = 0, the equation has two equal real roots. Here both roots are x = 1.',
    xp: 5,
  },
  {
    id: 'q5',
    subject: 'Mathematics',
    chapter: 'Quadratic Equations',
    topic: 'Solving Equations',
    difficulty: 'Easy',
    question: 'Which of the following is a solution of x² - 5x + 6 = 0?',
    options: ['x = 1', 'x = 2', 'x = 4', 'x = 6'],
    correct: 1,
    explanation: 'Factoring: x² - 5x + 6 = (x-2)(x-3) = 0. So x = 2 or x = 3. Verify: 2² - 5(2) + 6 = 4 - 10 + 6 = 0 ✓',
    xp: 5,
  },
]

// ─── DESCRIPTIVE QUESTIONS ────────────────────────────────────────────────────
export const descriptiveQuestions = [
  {
    id: 'dq1',
    subject: 'Physics',
    chapter: 'Electricity',
    question: 'Explain the difference between series and parallel circuits with examples. (3 marks)',
    marks: 3,
    modelAnswer: 'In a series circuit, all components are connected end-to-end in a single path. The same current flows through all components, but voltage divides. If one component fails, the entire circuit breaks.\n\nIn a parallel circuit, components are connected across the same two points, providing multiple paths. The same voltage appears across all components, but current divides. If one component fails, others continue working.\n\nExample: Series — old fairy lights (one goes out, all go out). Parallel — household wiring (one appliance off, others work).',
    keyPoints: ['Series: single path, same current', 'Parallel: multiple paths, same voltage', 'Real-world examples', 'Effect of failure'],
  },
  {
    id: 'dq2',
    subject: 'Biology',
    chapter: 'Life Processes',
    question: 'Describe the process of photosynthesis and write its chemical equation. (5 marks)',
    marks: 5,
    modelAnswer: 'Photosynthesis is the process by which green plants prepare their own food using sunlight, carbon dioxide, and water.\n\nProcess:\n1. Chlorophyll in leaves absorbs sunlight energy\n2. Water molecules are split (photolysis)\n3. CO₂ from air combines with hydrogen\n4. Glucose is formed and oxygen is released\n\nChemical equation:\n6CO₂ + 6H₂O → C₆H₁₂O₆ + 6O₂\n\nThis occurs in two stages: light reactions (in thylakoid) and Calvin cycle (in stroma).',
    keyPoints: ['Definition', 'Role of chlorophyll', 'Chemical equation', 'Products', 'Location in cell'],
  },
]

// ─── CODING QUESTIONS ─────────────────────────────────────────────────────────
export const codingQuestions = [
  {
    id: 'cq1',
    subject: 'Computer Science',
    chapter: 'Python Basics',
    difficulty: 'Easy',
    question: 'Write a Python program to find all prime numbers between 1 and 50.',
    sampleInput: 'None (no input required)',
    sampleOutput: '2 3 5 7 11 13 17 19 23 29 31 37 41 43 47',
    constraints: 'Use a loop and a helper function is_prime(n)',
    starterCode: `def is_prime(n):
    # Write your code here
    pass

# Print all primes from 1 to 50
for num in range(2, 51):
    if is_prime(num):
        print(num, end=' ')`,
    modelSolution: `def is_prime(n):
    if n < 2:
        return False
    for i in range(2, int(n**0.5) + 1):
        if n % i == 0:
            return False
    return True

for num in range(2, 51):
    if is_prime(num):
        print(num, end=' ')`,
  },
]

// ─── MOCK AI RESPONSES ────────────────────────────────────────────────────────
export const mockAIResponses = {
  osmosis: {
    default: `Here's how osmosis works:

**Step 1 — What is osmosis?**
Osmosis is the movement of water molecules through a *selectively permeable membrane* from a region of higher water concentration to lower water concentration.

**Step 2 — The key condition**
The membrane must be selectively permeable — it allows water to pass but blocks larger solute molecules (like dissolved salts or sugar).

**Step 3 — Direction of movement**
Water always moves from *hypotonic* (dilute) solution → *hypertonic* (concentrated) solution. This continues until equilibrium is reached.

**Step 4 — Real example**
When you put a raisin in water, it swells up — water enters the raisin cells by osmosis. When you put a cucumber in salt water, it shrinks — water leaves by osmosis.

💡 *CBSE tip: Always mention "selectively permeable membrane" and "concentration gradient" in your exam answers.*`,

    simpler: `Think of osmosis like this 🌊

Imagine a room with two sections separated by a special wall with tiny holes:
- Left side: mostly water + a little sugar
- Right side: water + lots of sugar

The tiny holes only let water through (not sugar).

**What happens?** Water rushes from left (less sugar) to right (more sugar) trying to "balance things out."

That's osmosis! Water moves through a special membrane to balance concentrations on both sides.

🍇 Raisin in water = swells up (water goes in)
🥒 Cucumber in salt = shrinks (water goes out)`,

    examStyle: `**Osmosis — Board Exam Answer (3 marks)**

**Definition:** Osmosis is the spontaneous movement of water molecules through a *selectively permeable membrane* from a region of its higher concentration (hypotonic solution) to a region of its lower concentration (hypertonic solution) until equilibrium is achieved.

**Key Features:**
1. Requires a selectively permeable membrane
2. Movement is along the concentration gradient
3. Only solvent (water) molecules move, not solute

**Significance in living organisms:** Osmosis regulates water balance in plant and animal cells. It is responsible for the absorption of water by plant roots from the soil.`,
  },

  ohmsLaw: {
    default: `**Ohm's Law — Step by Step Explanation**

**Step 1 — Statement**
Ohm's Law states that the current (I) flowing through a conductor is *directly proportional* to the voltage (V) across it, provided temperature and physical conditions remain constant.

**Step 2 — The Formula**
V = I × R
Where:
- V = Voltage (in Volts, V)
- I = Current (in Amperes, A)
- R = Resistance (in Ohms, Ω)

**Step 3 — Rearranging for different unknowns**
- Find current: I = V/R
- Find resistance: R = V/I
- Find voltage: V = I × R

**Step 4 — Example**
A 6V battery is connected to a 2Ω resistor.
Current = 6/2 = **3 A**

💡 *Memory trick: "VIR" — Voltage = Current × Resistance*`,
  },

  quadratic: {
    default: `**Solving Quadratic Equations — Complete Guide**

**Step 1 — What is a Quadratic Equation?**
An equation of the form **ax² + bx + c = 0** where a ≠ 0.

**Step 2 — Three Methods to Solve**

**Method 1: Factoring**
x² - 5x + 6 = 0
→ Find two numbers that multiply to 6 and add to -5
→ (-2) and (-3) work!
→ (x - 2)(x - 3) = 0
→ x = 2 or x = 3

**Method 2: Quadratic Formula**
x = (-b ± √(b² - 4ac)) / 2a

**Method 3: Completing the Square**
For simple cases, add and subtract (b/2)²

**Step 3 — Check your answer**
Always substitute back: 2² - 5(2) + 6 = 4 - 10 + 6 = 0 ✓`,
  },

  circuitSeries: {
    evaluation: {
      score: 2,
      total: 3,
      percentage: 67,
      correct: ['Correctly explained that series circuits have a single path for current flow', 'Mentioned that same current flows through all components'],
      missed: ['Did not mention the effect on voltage (voltage divides in series)', 'Missing real-world example to illustrate the concept'],
      tip: 'Always use CBSE keywords like "potential difference" instead of "voltage" and include a diagram if the question is worth 3+ marks.',
      modelAnswer: 'In a series circuit, components are connected end-to-end forming a single path. The same current (I) flows through all components but the potential difference (voltage) divides across them. Total resistance = R₁ + R₂ + R₃. Example: Old-style fairy lights where if one bulb fuses, the circuit breaks and all lights go off.',
    },
  },

  worksheet: {
    class10Physics: `**WORKSHEET — Class 10 Physics**
*Chapter 12: Electricity | Mixed Questions | Medium Difficulty*

---

**SECTION A — Multiple Choice Questions (1 mark each)**

1. A conductor has resistance 5 Ω. When a potential difference of 10 V is applied, the current through it is:
   (a) 0.5 A  (b) 2 A  (c) 50 A  (d) 15 A

2. Three resistors 3 Ω, 6 Ω, and 9 Ω are connected in series. The equivalent resistance is:
   (a) 3 Ω  (b) 6 Ω  (c) 18 Ω  (d) 1.6 Ω

3. The SI unit of electric power is:
   (a) Volt  (b) Ampere  (c) Watt  (d) Joule

---

**SECTION B — Short Answer Questions (2 marks each)**

4. State Ohm's Law and write its mathematical expression.

5. A bulb is marked 100W – 220V. Find its resistance and the current through it during normal operation.

6. Why are household appliances connected in parallel rather than in series?

---

**SECTION C — Long Answer Questions (3 marks each)**

7. Draw a circuit diagram showing three resistors in parallel. Derive the formula for equivalent resistance in a parallel combination.

8. A torch uses two cells of 1.5 V each connected in series. The resistance of the bulb is 6 Ω. Calculate: (a) total EMF, (b) current through the circuit, (c) power dissipated.`,
  },
}

// ─── TEST QUESTIONS ───────────────────────────────────────────────────────────
export const testQuestions = [
  { id: 'tq1', type: 'mcq', question: "State Ohm's Law — which formula is correct?", options: ['V = I + R', 'V = I × R', 'V = I / R', 'V = R / I'], correct: 1, marks: 1 },
  { id: 'tq2', type: 'mcq', question: 'What is the unit of electric resistance?', options: ['Ampere', 'Volt', 'Ohm', 'Watt'], correct: 2, marks: 1 },
  { id: 'tq3', type: 'mcq', question: 'In a parallel circuit, the voltage across each branch is:', options: ['Different', 'Zero', 'Same', 'Half'], correct: 2, marks: 1 },
  { id: 'tq4', type: 'mcq', question: '5 resistors of 10 Ω each connected in series. Total resistance is:', options: ['2 Ω', '10 Ω', '50 Ω', '0.5 Ω'], correct: 2, marks: 1 },
  { id: 'tq5', type: 'mcq', question: 'The formula for electric power is:', options: ['P = V/I', 'P = V × I', 'P = I/V', 'P = V²/I'], correct: 1, marks: 1 },
  { id: 'tq6', type: 'mcq', question: 'Which device converts electrical energy into mechanical energy?', options: ['Generator', 'Electric motor', 'Transformer', 'Resistor'], correct: 1, marks: 1 },
  { id: 'tq7', type: 'mcq', question: 'Resistance of a wire depends on its:', options: ['Colour only', 'Length and area', 'Weight', 'Temperature only'], correct: 1, marks: 1 },
  { id: 'tq8', type: 'mcq', question: 'A 60W bulb is used for 5 hours. Electrical energy consumed is:', options: ['12 Wh', '300 Wh', '65 Wh', '0.3 Wh'], correct: 1, marks: 1 },
  { id: 'tq9', type: 'mcq', question: 'The direction of conventional current is:', options: ['Opposite to electron flow', 'Same as electron flow', 'Perpendicular', 'Random'], correct: 0, marks: 1 },
  { id: 'tq10', type: 'mcq', question: 'Resistivity of a material depends on:', options: ['Length of wire', 'Area of cross-section', 'Nature of material', 'All of the above'], correct: 2, marks: 1 },
  { id: 'tq11', type: 'short', question: 'Define electric current and state its SI unit.', marks: 2 },
  { id: 'tq12', type: 'short', question: 'A wire of resistance 12 Ω is bent to form a circle. What is the resistance between two diametrically opposite points?', marks: 2 },
  { id: 'tq13', type: 'short', question: 'Why does the resistance of a wire increase with temperature?', marks: 2 },
  { id: 'tq14', type: 'short', question: 'Distinguish between EMF and terminal voltage of a cell.', marks: 2 },
  { id: 'tq15', type: 'short', question: 'An electric iron consumes energy at 840 W when at full heat and 360 W at medium. Estimate the current at both settings. (V = 220V)', marks: 2 },
]

// ─── TEST RESULTS DATA ────────────────────────────────────────────────────────
export const mockTestResult = {
  testName: 'Chapter 12 — Electricity',
  totalQuestions: 15,
  mcqAnswered: 10,
  shortAnswered: 5,
  score: 32,
  total: 40,
  percentage: 80,
  timeTaken: '24 min 38 sec',
  timeAllotted: '30 min',
  previousScore: 72,
  improvement: 8,
  sectionBreakdown: [
    { section: 'MCQ (10)', score: 9, total: 10, accuracy: 90 },
    { section: 'Short Answer (5)', score: 8, total: 10, accuracy: 80 },
  ],
  questionResults: [
    { id: 'tq1', correct: true, yourAnswer: 1, correctAnswer: 1 },
    { id: 'tq2', correct: true, yourAnswer: 2, correctAnswer: 2 },
    { id: 'tq3', correct: true, yourAnswer: 2, correctAnswer: 2 },
    { id: 'tq4', correct: true, yourAnswer: 2, correctAnswer: 2 },
    { id: 'tq5', correct: false, yourAnswer: 0, correctAnswer: 1 },
    { id: 'tq6', correct: true, yourAnswer: 1, correctAnswer: 1 },
    { id: 'tq7', correct: true, yourAnswer: 1, correctAnswer: 1 },
    { id: 'tq8', correct: false, yourAnswer: 0, correctAnswer: 1 },
    { id: 'tq9', correct: true, yourAnswer: 0, correctAnswer: 0 },
    { id: 'tq10', correct: true, yourAnswer: 2, correctAnswer: 2 },
  ],
  aiInsights: {
    strongTopics: ["Ohm's Law", 'Series vs Parallel', 'Basic definitions'],
    weakTopics: ['Power formula applications', 'Energy calculations'],
    recommendation: 'Practice 10 questions on Power Formula (P=VI) and Energy = P×t',
  },
  xpEarned: 50,
}

// ─── PROGRESS DATA ────────────────────────────────────────────────────────────
export const progressData = {
  subjectHealth: [
    { subject: 'Physics', icon: '⚡', color: 'blue', accuracy: 78, trend: 'up', status: 'Improving' },
    { subject: 'Mathematics', icon: '📐', color: 'purple', accuracy: 85, trend: 'up', status: 'Strong' },
    { subject: 'Chemistry', icon: '🧪', color: 'orange', accuracy: 62, trend: 'down', status: 'Needs Work' },
    { subject: 'Biology', icon: '🌿', color: 'green', accuracy: 74, trend: 'stable', status: 'Improving' },
    { subject: 'Computer Science', icon: '💻', color: 'cyan', accuracy: 91, trend: 'up', status: 'Strong' },
  ],
  weakAreas: [
    { chapter: 'Chapter 12 — Electricity', topic: 'Power Formulas (P=VI)', subject: 'Physics', lastPracticed: '7 days ago', color: 'blue' },
    { chapter: 'Chapter 13 — Electromagnetism', topic: 'Electromagnetic Induction', subject: 'Physics', lastPracticed: 'Never', color: 'blue' },
    { chapter: 'Chapter 5 — Periodic Classification', topic: 'Periodicity of Properties', subject: 'Chemistry', lastPracticed: '3 days ago', color: 'orange' },
    { chapter: 'Chapter 4 — Carbon Compounds', topic: 'Functional Groups', subject: 'Chemistry', lastPracticed: '5 days ago', color: 'orange' },
  ],
  recentActivity: [
    { type: 'test', label: 'Chapter 12 Test', score: '80%', time: '2h ago', icon: '📋', color: 'purple' },
    { type: 'practice', label: 'Electricity MCQs', score: '9/10', time: 'Yesterday', icon: '⚡', color: 'blue' },
    { type: 'doubt', label: 'Osmosis doubt solved', score: '+10 XP', time: 'Yesterday', icon: '💬', color: 'green' },
    { type: 'practice', label: 'Quadratic Equations', score: '7/10', time: '2 days ago', icon: '📐', color: 'purple' },
  ],
  streakCalendar: [
    true, true, false, true, true, true, true,
    true, false, true, true, true, false, true,
    true, true, true, false, true, true, true,
  ],
}

// ─── BADGES ───────────────────────────────────────────────────────────────────
export const badges = [
  { id: 'b1', name: 'First Doubt', icon: '💬', desc: 'Asked your first doubt', unlocked: true, progress: 1, total: 1, color: 'purple' },
  { id: 'b2', name: 'Curious Mind', icon: '🧠', desc: 'Asked 10 doubts', unlocked: true, progress: 12, total: 10, color: 'blue' },
  { id: 'b3', name: 'Snap & Learn', icon: '📸', desc: 'Uploaded a photo doubt', unlocked: true, progress: 1, total: 1, color: 'pink' },
  { id: 'b4', name: 'Practice Champion', icon: '🏆', desc: 'Answer 50 questions', unlocked: true, progress: 50, total: 50, color: 'yellow' },
  { id: 'b5', name: 'Perfect Score', icon: '⭐', desc: '100% on any test', unlocked: false, progress: 80, total: 100, color: 'gold' },
  { id: 'b6', name: 'Speed Runner', icon: '⚡', desc: 'Finish quiz in half the time', unlocked: false, progress: 0, total: 1, color: 'cyan' },
  { id: 'b7', name: '7-Day Streak', icon: '🔥', desc: '7 days in a row', unlocked: true, progress: 7, total: 7, color: 'orange' },
  { id: 'b8', name: 'Night Owl', icon: '🦉', desc: 'Studied after 10 PM', unlocked: true, progress: 1, total: 1, color: 'indigo' },
  { id: 'b9', name: '14-Day Streak', icon: '🔥', desc: '14 days in a row', unlocked: false, progress: 7, total: 14, color: 'orange' },
  { id: 'b10', name: 'Topic Master', icon: '💪', desc: '100% mastery on any topic', unlocked: false, progress: 80, total: 100, color: 'green' },
  { id: 'b11', name: 'Subject Star', icon: '🌟', desc: '80%+ across all chapters', unlocked: false, progress: 3, total: 15, color: 'gold' },
  { id: 'b12', name: 'Challenge Champ', icon: '🎯', desc: 'Complete 5 daily challenges', unlocked: false, progress: 2, total: 5, color: 'teal' },
  { id: 'b13', name: 'Concept Legend', icon: '🎓', desc: 'Reach Level 8', unlocked: false, progress: 6, total: 8, color: 'purple' },
]

// ─── LEVELS ───────────────────────────────────────────────────────────────────
export const levels = [
  { level: 1, name: 'Curious Learner', xpRequired: 0, icon: '🌱' },
  { level: 2, name: 'Question Raiser', xpRequired: 100, icon: '🔍' },
  { level: 3, name: 'Concept Explorer', xpRequired: 300, icon: '🧭' },
  { level: 4, name: 'Problem Solver', xpRequired: 600, icon: '💡' },
  { level: 5, name: 'Concept Master', xpRequired: 1000, icon: '🎯' },
  { level: 6, name: 'Scholar', xpRequired: 1600, icon: '📚' },
  { level: 7, name: 'Top Achiever', xpRequired: 2400, icon: '🏅' },
  { level: 8, name: 'Einstein Mode', xpRequired: 3500, icon: '⭐' },
]

// ─── TEACHER DATA ─────────────────────────────────────────────────────────────
export const teacherProfile = {
  name: 'Ms. Priya Nair',
  school: 'Delhi Public School, R.K. Puram',
  subject: 'Physics',
  classes: ['Class 10A', 'Class 10B', 'Class 11A'],
  avatar: 'PN',
}

export const teacherRecentCreations = [
  { id: 'wk1', type: 'worksheet', title: 'Electricity — Mixed Practice', class: 'Class 10A', chapter: 'Ch. 12', date: '2 days ago', questions: 15 },
  { id: 'wk2', type: 'test', title: 'Unit Test — Light & Electricity', class: 'Class 10B', chapter: 'Ch. 10–12', date: '5 days ago', questions: 25 },
  { id: 'wk3', type: 'worksheet', title: 'Human Eye — Defects of Vision', class: 'Class 10A', chapter: 'Ch. 11', date: '1 week ago', questions: 10 },
]

export const classPerformanceData = [
  {
    class: 'Class 10A',
    students: 38,
    avgScore: 72,
    participation: 95,
    lastTest: 'Ch. 12 Electricity',
    weakChapters: ["Ohm's Law", 'Power Formulas', 'Parallel Circuits'],
    students_list: [
      { name: 'Arjun Sharma', score: 80, streak: 7, weak: 'Power Formulas', status: 'Good' },
      { name: 'Meera Patel', score: 65, streak: 3, weak: 'Series Circuits', status: 'Needs attention' },
      { name: 'Rohan Gupta', score: 45, streak: 1, weak: 'Ohm\'s Law basics', status: 'At risk' },
      { name: 'Ananya Singh', score: 90, streak: 14, weak: 'None identified', status: 'Excellent' },
      { name: 'Kabir Khan', score: 72, streak: 5, weak: 'Power calculations', status: 'Good' },
      { name: 'Sneha Reddy', score: 58, streak: 2, weak: 'Resistivity', status: 'Needs attention' },
    ],
  },
  {
    class: 'Class 10B',
    students: 35,
    avgScore: 68,
    participation: 89,
    lastTest: 'Ch. 12 Electricity',
    weakChapters: ['Refraction', 'Lens Formula', 'Power'],
    students_list: [],
  },
]

// ─── LIVE CLASS MOCK RESPONSES ────────────────────────────────────────────────
export const liveClassMockResponses = {
  mcqs: [
    {
      topic: "Ohm's Law",
      questions: [
        "Q1. The resistance of a conductor is 4 Ω and the current through it is 3 A. The potential difference across it is:\n(a) 12 V  (b) 1.3 V  (c) 7 V  (d) 0.75 V\n✅ Answer: (a) 12 V",
        "Q2. Which of the following graphs represents Ohm's Law correctly?\n(a) V vs I — straight line through origin\n(b) V vs I — curved line\n(c) V vs I — horizontal line\n(d) V vs I — vertical line\n✅ Answer: (a) — V is directly proportional to I",
        "Q3. A 3 Ω and 6 Ω resistor are in series. Total resistance is:\n(a) 2 Ω  (b) 4.5 Ω  (c) 9 Ω  (d) 18 Ω\n✅ Answer: (c) 9 Ω",
        "Q4. When resistance is doubled and voltage stays the same, current:\n(a) Doubles  (b) Halves  (c) Stays same  (d) Quadruples\n✅ Answer: (b) Halves (I = V/R)",
        "Q5. The slope of V-I graph for a conductor gives its:\n(a) Conductance  (b) Current  (c) Resistance  (d) Power\n✅ Answer: (c) Resistance",
      ],
    },
  ],
  explanation: `**Ohm's Law — Simple Explanation for Class**

Georg Simon Ohm discovered that for a metallic conductor at constant temperature, the current flowing through it is directly proportional to the potential difference across it.

**Key formula:** V = I × R

**Analogy:** Think of electricity like water in a pipe.
• Voltage = Water pressure
• Current = Flow rate of water
• Resistance = Narrowness of the pipe

More pressure → more flow
Narrower pipe → less flow

This is exactly how voltage, current, and resistance relate!

**Important: This law works only when:**
1. Temperature is constant
2. The conductor is a metallic/ohmic conductor`,

  poll: `**Quick Poll for Class:**

"Which combination gives maximum current for a 12V battery?"

(A) 4 resistors of 3Ω each in SERIES
(B) 4 resistors of 3Ω each in PARALLEL
(C) 2 in series, 2 in parallel
(D) Single 12Ω resistor

✅ Correct: **(B) — Parallel gives lowest equivalent resistance (0.75Ω), hence maximum current**

Show of hands for each option!`,

  summary: `**Class Summary — Today's Lesson**
*Chapter 12: Electricity | Class 10*

**Topics Covered:**
1. Ohm's Law — V = IR
2. Series combination of resistors (R_total = R₁ + R₂ + R₃)
3. Parallel combination (1/R = 1/R₁ + 1/R₂ + 1/R₃)

**Key Formulas to Remember:**
• V = IR (Ohm's Law)
• R_series = R₁ + R₂ + ...
• 1/R_parallel = 1/R₁ + 1/R₂ + ...
• P = VI = I²R = V²/R

**Homework:**
• NCERT Exercise 12.1 to 12.5
• Solve 5 numerical problems from the practice worksheet

**Next Class:** Magnetic effects of electric current`,
}

// ─── JEE/NEET PREVIEW DATA ────────────────────────────────────────────────────
export const jeeNeetPreviewData = {
  jee: {
    title: 'JEE Foundation Track',
    subtitle: 'Physics, Chemistry, Mathematics',
    description: 'Build the conceptual depth needed for JEE — starting from your CBSE foundation.',
    topics: [
      { name: 'Rotational Motion', tag: 'Beyond CBSE', difficulty: 'Hard' },
      { name: 'Electrostatics (Advanced)', tag: 'JEE Pattern', difficulty: 'Hard' },
      { name: 'Complex Numbers', tag: 'JEE Maths', difficulty: 'Medium' },
      { name: 'Chemical Equilibrium', tag: 'Physical Chem', difficulty: 'Hard' },
    ],
    unlockLevel: 7,
    color: 'from-blue-600 to-purple-600',
    icon: '🚀',
  },
  neet: {
    title: 'NEET Foundation Track',
    subtitle: 'Physics, Chemistry, Biology',
    description: 'Go deeper into Biology and Chemistry concepts that NEET demands.',
    topics: [
      { name: 'Genetics & Evolution', tag: 'NEET Pattern', difficulty: 'Medium' },
      { name: 'Human Physiology (Advanced)', tag: 'Beyond CBSE', difficulty: 'Hard' },
      { name: 'Organic Chemistry', tag: 'NEET Chemistry', difficulty: 'Hard' },
      { name: 'Plant Physiology', tag: 'NEET Biology', difficulty: 'Medium' },
    ],
    unlockLevel: 7,
    color: 'from-green-600 to-teal-600',
    icon: '🧬',
  },
}

// ─── DAILY GOAL ──────────────────────────────────────────────────────────────
export const dailyGoal = {
  target: 50,
  current: 35,
  breakdown: { doubts: 10, practice: 15, revision: 10, test: 0 },
  streakAtRisk: true, // student hasn't hit goal today yet
}

// ─── WEAK TOPICS (AI-detected) ──────────────────────────────────────────────
export const weakTopics = [
  { topic: 'Power & Energy (P=VI)', subject: 'Physics', chapter: 'Electricity', accuracy: 35, attempts: 6, icon: '⚡', color: 'blue' },
  { topic: 'Periodic Classification', subject: 'Chemistry', chapter: 'Periodic Table', accuracy: 42, attempts: 4, icon: '🧪', color: 'orange' },
  { topic: 'Arithmetic Progressions', subject: 'Mathematics', chapter: 'AP', accuracy: 0, attempts: 0, icon: '📐', color: 'purple' },
]

// ─── REVISION CARDS (for 2-min revision) ────────────────────────────────────
export const revisionCards = [
  { front: "What is Ohm's Law?", back: 'V = I × R — Voltage equals Current times Resistance', topic: "Ohm's Law", subject: 'Physics' },
  { front: 'What happens to current when resistance doubles?', back: 'Current halves (I = V/R, V is constant)', topic: "Ohm's Law", subject: 'Physics' },
  { front: 'Series circuit: how does total resistance work?', back: 'R_total = R₁ + R₂ + R₃ (resistances add up)', topic: 'Circuits', subject: 'Physics' },
  { front: 'Parallel circuit: what stays the same?', back: 'Voltage stays the same across all branches', topic: 'Circuits', subject: 'Physics' },
  { front: 'Formula for electric power?', back: 'P = V × I = I²R = V²/R', topic: 'Power', subject: 'Physics' },
]

// ─── DAILY CHALLENGES ─────────────────────────────────────────────────────────
export const dailyChallenges = [
  {
    id: 'dc1',
    title: 'Electricity Blitz',
    subject: 'Physics',
    chapter: 'Chapter 12',
    questions: 5,
    timeLimit: 8,
    xpReward: 30,
    difficulty: 'Medium',
    icon: '⚡',
    color: 'blue',
    bestScore: '4/5 in 52s',
  },
  {
    id: 'dc2',
    title: 'Math Sprint',
    subject: 'Mathematics',
    chapter: 'Quadratic Equations',
    questions: 5,
    timeLimit: 10,
    xpReward: 30,
    difficulty: 'Hard',
    icon: '📐',
    color: 'purple',
    bestScore: null,
  },
]

// ─── RECENT WINS ─────────────────────────────────────────────────────────────
export const recentWins = [
  { id: 'w1', badge: '🔥', title: '7-Day Streak', when: 'Today', color: 'orange' },
  { id: 'w2', badge: '🧠', title: 'Curious Mind', when: 'Yesterday', color: 'blue' },
  { id: 'w3', badge: '📸', title: 'Snap & Learn', when: '3 days ago', color: 'pink' },
]

// ─── TEACHER AI ALERTS ───────────────────────────────────────────────────────
export const teacherAIAlerts = [
  {
    id: 'ta1',
    type: 'struggle',
    icon: '⚠️',
    severity: 'high',
    message: '8 students scored below 40% on Ohm\'s Law this week',
    action: 'Generate remedial worksheet',
    actionScreen: 'worksheet',
    time: '2 hours ago',
  },
  {
    id: 'ta2',
    type: 'decline',
    icon: '📉',
    severity: 'medium',
    message: 'Priya Patel\'s performance dropped 15% this week',
    action: 'View student details',
    actionScreen: 'students',
    time: '5 hours ago',
  },
  {
    id: 'ta3',
    type: 'completion',
    icon: '✅',
    severity: 'low',
    message: 'Class 10B completed Chapter 12 — Electricity',
    action: 'Generate chapter test',
    actionScreen: 'test-generator',
    time: 'Yesterday',
  },
  {
    id: 'ta4',
    type: 'streak',
    icon: '🔥',
    severity: 'low',
    message: 'Ananya Singh hit a 21-day streak — consider recognition',
    action: 'View student',
    actionScreen: 'students',
    time: 'Yesterday',
  },
]

// ─── TEACHER SPOTLIGHT STUDENTS ──────────────────────────────────────────────
export const spotlightStudents = [
  { name: 'Rohan Gupta', avatar: 'RG', insight: 'Scored 45% — hasn\'t practiced in 5 days', status: 'At risk', action: 'Assign practice set', color: 'red' },
  { name: 'Meera Patel', avatar: 'MP', insight: 'Struggling with Series Circuits specifically', status: 'Needs help', action: 'Send targeted worksheet', color: 'amber' },
  { name: 'Sneha Reddy', avatar: 'SR', insight: 'Dropped from 75% to 58% in 2 weeks', status: 'Declining', action: 'Review performance', color: 'amber' },
]

// ─── PARENT SUMMARY ───────────────────────────────────────────────────────────
export const parentSummaryData = {
  student: 'Arjun Sharma',
  class: 'Class 10',
  week: 'Week of Apr 7, 2026',
  summary: {
    activeDays: 6,
    doubtsAsked: 12,
    practiceQuestions: 48,
    testsCompleted: 2,
    avgScore: 78,
    streakDays: 7,
    xpEarned: 180,
  },
  highlights: [
    'Scored 80% in the Chapter 12 Electricity test — improved by 8% from last week!',
    'Completed 7-day streak — showing consistent study habits.',
    'Strong performance in Mathematics (85% accuracy).',
  ],
  concerns: [
    'Chemistry accuracy has dropped to 62% — may need extra practice on Periodic Classification.',
  ],
  teacherNote: 'Arjun is performing well above class average. His doubt-solving sessions show genuine curiosity and engagement.',
}
