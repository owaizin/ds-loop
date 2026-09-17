# census

Component inventory. Scan the component library and its consumers, cluster
near-duplicate components, rank by usage × blast radius.

Status: **agent procedure**. No component clusterer CLI is shipped. Grouping
and consolidation decisions below are review judgments.

## Intended shape

1. Enumerate every component in the library and every hand-rolled primitive in
   consumer code (`<button class=…>`, bespoke `<input type=checkbox>` wrappers).
2. Cluster by structural + prop-shape similarity: "these four are all a button".
3. For each cluster, rank members by import count (usage) and by how many screens
   break if it changes (blast radius).
4. Output an inventory table + a de-duplication map: which implementation becomes
   canonical, which get migrated, which stay separate because their intent differs.

## Rule that carries over

Only consolidate things used 3+ times with the **same intent**. Two buttons that
look alike but serve different purposes stay separate — an abstraction over two
different intents costs more than the duplication it removes.

The 3-use threshold is common practice, not a measurement from this project;
where the target repository states its own, use that.
