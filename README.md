# Texas Precinct Map – Usage Guide

This app visualizes Texas 2024 precinct results with interactive hovers, county rollups, 3D visualizations, and demographic filters. This was inspired by the [NYT's Extremely Detailed Map of the 2024 Election](https://www.nytimes.com/interactive/2025/us/elections/2024-election-map-precinct-results.html). I spent hours exploring it and I thought it would be cool to make my own version with more insights.

## What you see
- Colored precincts (2024): color ramp based on Democratic margin from the CSV.
- Hover popups:
  - Zoom > 8: shows precinct details (county, GEOID, area if available, 2024 margin, votes).
  - Zoom ≤ 8: shows county-wide rollup (sum of votes across that county from the CSV).
- Outlines:
  - Zoom > 8: black outline for hovered precinct only. In 3D view, the hovered precinct is green.
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
  - White% = anglovap / vap
  - Dem margin% (2024) = (votes_dem − votes_rep) / votes_total × 100
  - College Student%% = college_enroll / vap
  - College Educated% = bachelors+ / vap
  - margin shift (20-24) = 2024_dem_margin_of_victory - 2020_dem_margin_of_victory
  - Avg Household Income = aggregate income / # of households


## Data sources
- Race demographic data is from the Texas Legislative Council's [website](https://data.capitol.texas.gov/dataset/vtds)
- Precinct shapes and election results are from the Texas data set of the NYT's [Github](https://github.com/nytimes/presidential-precinct-map-2024)
- college enrollment, income, and educational attainment data are from Census tracts and blocks obtained from the NHGIS datasets [here](https://data2.nhgis.org/main). Census block and tract shapes used for calculations were also from here.

## Tech Stack
- JavaScript for UI functionality and MapBox for rendering
- GeoPandas, Pandas and Python for geographic/demographic data reaggregation and joining
- Various MapBox APIs for hosting Tilesets on their platform
- intro.js for guide UI

## Examples and Other Visualizations
![alt text](https://github.com/samz-cs/tx-map/blob/main/hisp_shift.png?raw=true)


