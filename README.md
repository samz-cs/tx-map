# Texas Precinct Map – Usage Guide

This app visualizes Texas 2024 precinct results with interactive hovers, county rollups, 3D visualizations, and demographic filters. This was inspired by the [NYT's Extremely Detailed Map of the 2024 Election](https://www.nytimes.com/interactive/2025/us/elections/2024-election-map-precinct-results.html). I spent hours exploring it and I thought it would be cool to make my own version with more insights.

## What you see
- Colored precincts (2024): color ramp based on Democratic margin from the CSV.
- Hover popups:
  - Zoom > 8: shows precinct details (county, GEOID, area, 2024 margin, votes).
  - Zoom ≤ 8: shows county-wide details.
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
      - Note: Median Household income is more representative because high earners skew averages, but I wasn't able to find median income information for precincts. The closest thing I found was Census block-group aggregate income, and distributed the aggregate into the precincts using Census blocks as the geographic intermediary. 


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
### Across the state, areas with high Hispanic concentrations shifted towards the GOP
![alt text](https://github.com/samz-cs/tx-map/blob/main/hisp_shift.png?raw=true)
#### Settings for this map
- Color mode: Shift 
- 3D metric: Hispanic%
- Max height (m): 60,000
- Contrast: 3

Each block represents a voting precinct. The height shows the precinct’s Hispanic population percentage — taller columns indicate a higher share of Hispanic residents (100% Hispanic being the tallest). The color in the map shows how the precinct’s vote shifted from 2020 to 2024: Bluer precincts moved more Democratic, while redder precincts shifted more Republican.

### Areas with high Black concentrations remain Democratic strongholds
![alt text](https://github.com/samz-cs/tx-map/blob/main/black_margin_200k_5_100votes.png?raw=true)
#### Settings for this map
- Color mode: Dem Margin
- Filters: > 100 votes
- 3D metric: Black%
- Max height (m): 200,000
- Contrast: 5

### However, Democrats also lost many voters in those same areas
![alt text]([black_shift_200k_5_100votes.png](https://github.com/samz-cs/tx-map/blob/main/black_shift_200k_5_100votes.png?raw=true))
#### Settings for this map
- Color mode: Shift
- Filters: > 100 votes
- 3D metric: Black%
- Max height (m): 200,000
- Contrast: 5



