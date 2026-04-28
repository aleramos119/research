export const PUBLICATION_TAGS = [
  { value: "review", label: "Review", relational: false },
  { value: "rebuttal", label: "Rebuttal", relational: true },
  { value: "replication", label: "Replication", relational: true },
  { value: "retraction", label: "Retraction", relational: true },
  { value: "correction", label: "Correction", relational: true },
  { value: "survey", label: "Survey", relational: false },
  { value: "meta_analysis", label: "Meta-analysis", relational: false },
  { value: "case_study", label: "Case Study", relational: false },
  { value: "tutorial", label: "Tutorial", relational: false },
  { value: "benchmark", label: "Benchmark", relational: false },
  { value: "software", label: "Software", relational: false },
];

export const RELATIONAL_TAGS = new Set(
  PUBLICATION_TAGS.filter((t) => t.relational).map((t) => t.value),
);

export const tagLabel = (value) =>
  PUBLICATION_TAGS.find((t) => t.value === value)?.label ?? value;
