# Embedded report fonts

Inter and Manrope are redistributed under the SIL Open Font License 1.1.
The complete notices are in `inter-OFL.txt` and `manrope-OFL.txt`. Exported HTML
also embeds the applicable notice in its style block so it travels with the font.

`fonts.json` records the Fontsource package versions, archive integrity and
SHA-256 hashes of each unmodified WOFF2 subset used in reports. Verified on
15 October 2026 against the downloaded `@fontsource-variable/inter@5.3.0` and
`@fontsource-variable/manrope@5.3.0` packages and their bundled LICENSE files.
No font binaries were modified. Inter retains seven normal variable subsets;
Manrope uses the normal variable Latin subset.

Two supplied raster decorations had no retained provenance record. They are no
longer embedded in the assessment renderer; independently written CSS gradients
provide the decoration. This record does not assert redistribution rights for
those removed images.
