/** Benchmark eligibility policy, separate from the source-measurement instrument. */
export const BENCHMARK_POLICY = {
  // UNCALIBRATED: 100 classified occurrences screens out incidental stylesheets;
  // one occurrence then moves the ratio by at most one percentage point.
  // This is a sample floor, not proof that adapters cover the whole repository.
  minOccurrences: 100,
  // UNCALIBRATED: three independent repositories are the smallest useful starting
  // set for a range and median; one or two observations cannot describe a corpus.
  minContributors: 3,
};
