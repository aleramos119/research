export const SUBJECTS = [
  // Physics
  { group: "Physics", value: "physics.cond-mat", label: "Condensed Matter" },
  { group: "Physics", value: "physics.hep", label: "High Energy Physics" },
  {
    group: "Physics",
    value: "physics.gr-qc",
    label: "General Relativity & Quantum Cosmology",
  },
  { group: "Physics", value: "physics.quant-ph", label: "Quantum Physics" },
  {
    group: "Physics",
    value: "physics.atom",
    label: "Atomic, Molecular & Optical Physics",
  },
  { group: "Physics", value: "physics.nuclear", label: "Nuclear Physics" },
  { group: "Physics", value: "physics.fluid", label: "Fluid Dynamics" },
  { group: "Physics", value: "physics.plasma", label: "Plasma Physics" },
  { group: "Physics", value: "physics.other", label: "Physics (Other)" },
  // Astrophysics
  { group: "Astrophysics", value: "astro.cosmology", label: "Cosmology" },
  { group: "Astrophysics", value: "astro.galaxies", label: "Galaxies" },
  {
    group: "Astrophysics",
    value: "astro.he",
    label: "High Energy Astrophysics",
  },
  {
    group: "Astrophysics",
    value: "astro.planets",
    label: "Planetary Science",
  },
  {
    group: "Astrophysics",
    value: "astro.solar",
    label: "Solar & Stellar Astrophysics",
  },
  {
    group: "Astrophysics",
    value: "astro.instruments",
    label: "Astronomical Instrumentation",
  },
  // Mathematics
  {
    group: "Mathematics",
    value: "math.ag",
    label: "Algebraic Geometry",
  },
  { group: "Mathematics", value: "math.analysis", label: "Analysis" },
  {
    group: "Mathematics",
    value: "math.combinatorics",
    label: "Combinatorics",
  },
  {
    group: "Mathematics",
    value: "math.dg",
    label: "Differential Geometry",
  },
  {
    group: "Mathematics",
    value: "math.logic",
    label: "Logic & Foundations",
  },
  { group: "Mathematics", value: "math.nt", label: "Number Theory" },
  { group: "Mathematics", value: "math.probability", label: "Probability" },
  { group: "Mathematics", value: "math.topology", label: "Topology" },
  {
    group: "Mathematics",
    value: "math.other",
    label: "Mathematics (Other)",
  },
  // Computer Science
  {
    group: "Computer Science",
    value: "cs.ai",
    label: "Artificial Intelligence",
  },
  { group: "Computer Science", value: "cs.cv", label: "Computer Vision" },
  {
    group: "Computer Science",
    value: "cs.crypto",
    label: "Cryptography & Security",
  },
  { group: "Computer Science", value: "cs.db", label: "Databases" },
  {
    group: "Computer Science",
    value: "cs.ds",
    label: "Data Structures & Algorithms",
  },
  {
    group: "Computer Science",
    value: "cs.hci",
    label: "Human-Computer Interaction",
  },
  { group: "Computer Science", value: "cs.ml", label: "Machine Learning" },
  { group: "Computer Science", value: "cs.networks", label: "Networking" },
  {
    group: "Computer Science",
    value: "cs.pl",
    label: "Programming Languages",
  },
  {
    group: "Computer Science",
    value: "cs.se",
    label: "Software Engineering",
  },
  {
    group: "Computer Science",
    value: "cs.other",
    label: "Computer Science (Other)",
  },
  // Biology
  { group: "Biology", value: "bio.cell", label: "Cell Biology" },
  { group: "Biology", value: "bio.ecology", label: "Ecology & Evolution" },
  {
    group: "Biology",
    value: "bio.genomics",
    label: "Genomics & Bioinformatics",
  },
  { group: "Biology", value: "bio.molecular", label: "Molecular Biology" },
  { group: "Biology", value: "bio.neuroscience", label: "Neuroscience" },
  { group: "Biology", value: "bio.other", label: "Biology (Other)" },
  // Medicine
  { group: "Medicine", value: "med.cardiology", label: "Cardiology" },
  { group: "Medicine", value: "med.genetics", label: "Medical Genetics" },
  { group: "Medicine", value: "med.imaging", label: "Medical Imaging" },
  { group: "Medicine", value: "med.oncology", label: "Oncology" },
  { group: "Medicine", value: "med.pharmacology", label: "Pharmacology" },
  {
    group: "Medicine",
    value: "med.public",
    label: "Public Health & Epidemiology",
  },
  { group: "Medicine", value: "med.other", label: "Medicine (Other)" },
  // Chemistry
  { group: "Chemistry", value: "chem.organic", label: "Organic Chemistry" },
  {
    group: "Chemistry",
    value: "chem.physical",
    label: "Physical Chemistry",
  },
  { group: "Chemistry", value: "chem.materials", label: "Materials Science" },
  { group: "Chemistry", value: "chem.other", label: "Chemistry (Other)" },
  // Earth Sciences
  {
    group: "Earth Sciences",
    value: "earth.atmospheric",
    label: "Atmospheric Science",
  },
  {
    group: "Earth Sciences",
    value: "earth.geo",
    label: "Geophysics & Geology",
  },
  { group: "Earth Sciences", value: "earth.ocean", label: "Oceanography" },
  {
    group: "Earth Sciences",
    value: "earth.other",
    label: "Earth Sciences (Other)",
  },
  // Economics
  {
    group: "Economics",
    value: "econ.finance",
    label: "Finance & Economics",
  },
  { group: "Economics", value: "econ.macro", label: "Macroeconomics" },
  { group: "Economics", value: "econ.micro", label: "Microeconomics" },
  { group: "Economics", value: "econ.other", label: "Economics (Other)" },
  // Social Sciences
  {
    group: "Social Sciences",
    value: "soc.anthropology",
    label: "Anthropology",
  },
  { group: "Social Sciences", value: "soc.linguistics", label: "Linguistics" },
  {
    group: "Social Sciences",
    value: "soc.political",
    label: "Political Science",
  },
  { group: "Social Sciences", value: "soc.psychology", label: "Psychology" },
  { group: "Social Sciences", value: "soc.sociology", label: "Sociology" },
  {
    group: "Social Sciences",
    value: "soc.other",
    label: "Social Sciences (Other)",
  },
  // Statistics
  { group: "Statistics", value: "stat.applied", label: "Applied Statistics" },
  {
    group: "Statistics",
    value: "stat.methods",
    label: "Statistical Methodology",
  },
  { group: "Statistics", value: "stat.theory", label: "Statistical Theory" },
  // Engineering
  { group: "Engineering", value: "eng.civil", label: "Civil Engineering" },
  {
    group: "Engineering",
    value: "eng.electrical",
    label: "Electrical Engineering",
  },
  {
    group: "Engineering",
    value: "eng.mechanical",
    label: "Mechanical Engineering",
  },
  {
    group: "Engineering",
    value: "eng.other",
    label: "Engineering (Other)",
  },
  // Other
  { group: "Other", value: "other", label: "Other / Interdisciplinary" },
];

export const SUBJECT_GROUPS = [...new Set(SUBJECTS.map((s) => s.group))];

export const subjectLabel = (value) =>
  SUBJECTS.find((s) => s.value === value)?.label ?? value;
