export const INTERVIEW_TYPES = [
  { id: 'behavioural', name: 'Behavioural', description: 'Focuses on past experiences and soft skills.' },
  { id: 'technical', name: 'Technical', description: 'Assesses role-specific knowledge and problem-solving.' },
  { id: 'case', name: 'Case Study', description: 'Evaluates analytical thinking and business logic.' },
];

export const ROLES = [
  'Software Engineer',
  'Product Manager',
  'Data Analyst',
  'Marketing Specialist',
  'Financial Analyst',
  'Consultant',
  'Sales Representative',
  'UX Designer',
];

export const DIFFICULTIES = [
  { id: 'entry', name: 'Entry Level' },
  { id: 'mid', name: 'Mid Level' },
  { id: 'senior', name: 'Senior' },
];

export const QUESTION_BANK: Record<string, string[]> = {
  behavioural: [
    "Tell me about a time you had to work under pressure to meet a deadline.",
    "Describe a situation where you had to collaborate with a difficult team member.",
    "Give an example of a time you made a mistake. How did you handle it?",
    "Tell me about a project you are most proud of. What was your role?",
    "Describe a time when you had to learn something new quickly."
  ],
  technical: [
    "Walk me through how you would design a URL shortener.",
    "What is the difference between a stack and a queue? Give a use case for each.",
    "How do you approach debugging a bug you cannot reproduce locally?",
    "Describe the difference between REST and GraphQL APIs.",
    "Tell me about a technical challenge you faced in a project and how you resolved it."
  ],
  case: [
    "Our client is a retail bank losing market share to fintech startups. Where would you start?",
    "How would you estimate the total market size for electric scooter rentals in Johannesburg?",
    "A product's user engagement has dropped 20% month-over-month. Walk me through your diagnosis.",
    "How would you prioritise a product roadmap with 30 feature requests and only 3 months of engineering capacity?",
    "A client wants to expand into Southeast Asia. What factors would you evaluate first?"
  ]
};
