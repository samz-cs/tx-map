# Texas Precinct Map – Usage Guide

This app visualizes Texas 2024 precinct results with interactive hovers, county rollups, and demographic filters.

## What you see
- Colored precincts (2024): color ramp based on Democratic margin from the CSV.
- Hover popups:
  - Zoom > 8: shows precinct details (county, GEOID, area if available, 2024 margin, votes).
  - Zoom ≤ 8: shows county-wide rollup (sum of votes across that county from the CSV).
- Outlines:
  - Zoom > 8: black outline for hovered precinct only.
  - Zoom ≤ 8: black outline for hovered county only.
- Summary (top-left): statewide totals for all precincts by default, or the subset matching your filters.
- Zoom box (bottom-left): live zoom value.

## Controls (top-right)
- Filters (2024):
  - Each filter has an operator (>) or (<) and a percent value.
  - Leave a value blank to ignore that filter.
  - Press Enter in a field or click “Apply” to filter.
  - Click “Clear” to reset values and return to statewide totals.
- Available filter fields (percentages computed from the CSV):
  - Hisp% = hispvap / vap
  - Asian% = asianvap / vap
  - Black% = blackvap / vap
  - Anglo% = anglovap / vap
  - Dem margin% (2024) = (votes_dem − votes_rep) / votes_total × 100
  - College enroll% = college_enroll / vap
  - Bachelors+% = bachelors_up_total_sum / vap

## Data sources
- Race demographic data is from the Texas Legislative Council's [website](https://data.capitol.texas.gov/dataset/vtds)
- Precinct shapes and election results are from the Texas data set of the NYT's [Github](https://github.com/nytimes/presidential-precinct-map-2024)
- college enrollment and educational attainment data are from Census tracts and blocks obtained from the NHGIS datasets [here](https://data2.nhgis.org/main). Census block and tract shapes used for calculations were also from here.

## Tech Stack
- JavaScript for UI functionality and MapBox for rendering
- GeoPandas and Python for geographic/demographic data reaggregation and joining
- Various MapBox APIs for hosting Tilesets on their platform


