# Texas Precinct Map – About the App and Its Data

This [interactive app](https://samz-cs.github.io/tx-map/) visualizes the 2024 Presidential election in Texas with precinct and county level results, 3D visualizations, and demographic filters. This was inspired by the [NYT's Extremely Detailed Map of the 2024 Election](https://www.nytimes.com/interactive/2025/us/elections/2024-election-map-precinct-results.html). I spent hours exploring it and I thought it would be cool to build my own version with more insights.

## Available demographic data for precincts:
  - Hispanic% = hispanic VAP (voting age population) / total VAP
  - Asian% = asian VAP / total VAP
  - Black% = black VAP / total VAP
  - White% = anglo VAP / total VAP
  - Dem margin% (2024) = (Harris votes − Trump votes) / total votes 
  - College Student% = 4 year college enrollment / total VAP
  - College Educated% = educational attainment of bachelors and above / total VAP
  - margin shift (20-24) = 2024 Dem margin of victory (%) - 2020 Dem margin of victory (%)
  - Avg Household Income = aggregate income / # of households
      - Note: Median Household income is more representative because high earners skew averages, but I wasn't able to find median income information for precincts. The closest thing I found was Census block-group aggregate income, and distributed the aggregate into the precincts using Census blocks as the geographic intermediary. 


## Data sources
- Race demographic data is from the Texas Legislative Council's [website](https://data.capitol.texas.gov/dataset/vtds)
- Precinct shapes and election results are from the Texas data set of the NYT's [Github](https://github.com/nytimes/presidential-precinct-map-2024)
- college enrollment, income, and educational attainment data are from Census tracts and blocks obtained from the NHGIS datasets [here](https://data2.nhgis.org/main). Census block and tract shapes used for calculations were also from here.
- Dasymetric mapping was used to distribute demographic populations in precincts from Census blocks and tracts.

## Tech Stack
- JavaScript for UI functionality and MapBox for rendering
- GeoPandas, Pandas and Python for geographic/demographic data reaggregation and joining
- Various MapBox APIs for hosting Tilesets on their platform
- intro.js for guide UI

## Examples and Other Visualizations
The following graphs and plots were made directly from the map or with data from the map.
### Across the state, areas with high Hispanic concentrations shifted towards the GOP
<img
src="https://github.com/samz-cs/tx-map/blob/main/hisp_shift.png?raw=true"
width="80%"
/>
#### Settings for this map
- Color mode: Shift 
- 3D metric: Hispanic%
- Max height (m): 60,000
- Contrast: 3

Each block represents a voting precinct. The height shows the precinct’s Hispanic population percentage — taller columns indicate a higher share of Hispanic residents (100% Hispanic being the tallest). The color in the map shows how the precinct’s vote shifted from 2020 to 2024: Bluer precincts moved more Democratic, while redder precincts shifted more Republican.

### Generally, at similar Hispanic population levels, lower-income areas shifted further to the right than higher-income areas.
<img
src="https://github.com/samz-cs/tx-map/blob/d37aeb9f4df708122c99f7678dd3c93b85a48509/acc_hisp_inc_2D_bin.png"
width="70%"
/>

Each cell shows the 2020 to 2024 shift for all precincts that match the row (income range) and column (hispanic VAP %) values. 
- Moving up the grid: shifts are more Republican
- Moving left to right on the grid: shifts are less pronounced

### Areas with high Black concentrations remain Democratic strongholds
<img
src="https://github.com/samz-cs/tx-map/blob/main/black_margin_200k_5_100votes.png?raw=true"
width="80%"
/>
#### Settings for this map
- Color mode: Dem Margin
- Filters: > 100 votes
- 3D metric: Black%
- Max height (m): 200,000
- Contrast: 5

### However, Democrats also lost many voters in those same areas

<img
src="https://github.com/samz-cs/tx-map/blob/main/black_shift_200k_5_100votes.png?raw=true"
width="80%"
/>
#### Settings for this map
- Color mode: Shift
- Filters: > 100 votes
- 3D metric: Black%
- Max height (m): 200,000
- Contrast: 5

### Counties with high College-Educated concentrations had higher turnout
<img
src="https://github.com/samz-cs/tx-map/blob/main/WLS_edu_turnout.png?raw=true"
width="80%"
/>

County-level analysis was chosen for this plot because turnout in precincts varies a lot depending on its location within the community. Certain areas may not have a lot of residents, but could have a polling place that is easily accessible by people who do not live in the precinct. For example, the precinct below had a polling location in a middle school. The VAP turnout was more than 200%.

<img
src="https://github.com/samz-cs/tx-map/blob/main/DS_example.png?raw=true"
width="80%"
/>

### Democratic Support held the strongest in highly educated precincts
<img
src="https://github.com/samz-cs/tx-map/blob/main/binned_shift_edu.png?raw=true"
width="80%"
/>
