async function drawDetail(iso) {
    console.log("Recvied Data for detials...")
    const data = await d3.csv('../data/owid-covid-data-full.csv')

    const dataset = data.filter(d => {
        return d["iso_code"] == iso
    })

    const location = dataset[0].location
    const staticMetrics = [
        dataset[0].population,
        dataset[0].population_density,
        dataset[0].median_age,
        dataset[0].gdp_per_capita,
        dataset[0].aged_65_older,
        dataset[0].extreme_poverty,
        dataset[0].cardiovasc_death_rate,
        dataset[0].diabetes_prevalence,
        dataset[0].female_smokers,
        dataset[0].male_smokers,
        dataset[0].hospital_beds_per_thousand,
        dataset[0].life_expectancy,
    ]

    const staticMetricsNames = [
        "Total Population",
        "Population Density",
        "Median Age",
        "GDP Per Capita",
        "Aged over 65 (%)",
        "Extreme Poverty (%)",
        "Cariovascular Death Rate",
        "Diabetes Prevalance",
        "Female Smokers (%)",
        "Male Smokers (%)",
        "Hospital Beds per Thousand",
        "Life Expectancy"
    ]

    let metric = {}
    dataset.forEach(d => {
        metric[d["date"]] = +d["stringency_index"] || 0
    })

    const yAccessor = d => d.stringency_index
    const dateParser = d3.timeParse("%Y-%m-%d")
    const xAccessor = d => dateParser(d.date)


    let dimensions = {
        width: window.innerWidth * 0.75,
        height: 500,
        margin: {
            top: 15,
            right: 15,
            bottom: 40,
            left: 60,
        },
    }

    dimensions.boundedWidth = dimensions.width - dimensions.margin.left - dimensions.margin.right
    dimensions.boundedHeight = dimensions.height - dimensions.margin.top - dimensions.margin.bottom

    // 3. Draw canvas
    // Country Static Metric Detail
    const header = d3.select('#detail')
        .style('padding', '20px')

    const titleLine = header.append('div')
        .style('display', 'flex')
        .style('flex-direction', 'row')
        .style('justify-content', 'space-between')

    const title = titleLine.append('h1')
        .attr('class', 'detail-header')
        .text(`COVID-19 at a Glance: ${location}`)

    const backButton = titleLine.append('button')
        .text('Back to the map')
        .attr('id', 'back-btn')
        .attr('class', 'btn btn-dark')
        .on('click', function () {
            d3.select('#vis')
                .style('display', 'flex')
            d3.select('#comp')
                .style('display', 'flex')
            d3.select('#detail').html("")
            d3.select(this).remove()
        })
    const subtitle = header.append('p')
        .attr('class', 'detail-subtitle')
        .text('This is a detail view including static metrics as well as the stringency index over time')
    const statView = header.append('div')
        .attr('id', 'stat-view')
        .attr('class', 'stat-view')
    const details = statView.append('div')
        .attr('id', 'detail-stats')
        .attr('class', 'detail-stats')
    const ul = details.append('ul')
        .selectAll('li')
        .data(staticMetrics)
        .enter().append('li')
        .style('margin', '15px 0 0 0')
        .text(function (d, i) {
            return staticMetricsNames[i] + " : " + d
        })

    // Draw Chart
    const chart = statView.append('div')
        .attr('id', 'chart')
        .attr('class', 'chart')


    const chartHeader = chart.append('h4')
        .style('text-align', 'center')
        .text('Stringency Index Over Time')
    const chartSubtitle = chart.append('p')
        .style('text-align', 'center')
        .text('How strict the country has become overtime')

    const wrapper = chart.append("svg")
        .attr("width", dimensions.width)
        .attr("height", dimensions.height)

    const lineTooltip = statView.append('div')
        .attr('id', 'line-tooltip')
        .attr('class', 'line-tooltip')

    const tootltipDate = lineTooltip.append('div')
        .attr('class', 'tooltip-date')

    tootltipDate.append('span')
        .attr('id', 'date')

    const tooltipMetric = lineTooltip.append('div')
        .attr('class', 'tooltip-metric')

    tooltipMetric.append('span')
        .attr('id', 'metric-name')
        .text('Stringency Index: ')

    tooltipMetric.append('span')
        .attr('id', 'metric')


    const bounds = wrapper.append("g")
        .style("transform", `translate(${
        dimensions.margin.left
      }px, ${
        dimensions.margin.top
      }px)`)

    // Make clipping functionality
    bounds.append("defs").append("clipPath")
        .attr("id", "bounds-clip-path")
        .append("rect")
        .attr("width", dimensions.boundedWidth)
        .attr("height", dimensions.boundedHeight)

    const clip = bounds.append("g")
        .attr("clip-path", "url(#bounds-clip-path)")


    // 4. Create scales
    const yScale = d3.scaleLinear()
        .domain(d3.extent(Object.values(metric)))
        .range([dimensions.boundedHeight, 0])


    const xScale = d3.scaleTime()
        .domain(d3.extent(dataset, xAccessor))
        .range([0, dimensions.boundedWidth])


    // 5. Draw data

    const lineGenerator = d3.line()
        .x(d => xScale(xAccessor(d)))
        .y(d => yScale(yAccessor(d)))

    const line = clip.append("path")
        .attr("class", "line")
        .attr("d", lineGenerator(dataset))

    // 6. Draw peripherals

    const yAxisGenerator = d3.axisLeft()
        .scale(yScale)

    const yAxis = bounds.append("g")
        .call(yAxisGenerator)

    const xAxisGenerator = d3.axisBottom()
        .scale(xScale)

    const xAxis = bounds.append("g")
        .call(xAxisGenerator)
        .style("transform", `translateY(${
        dimensions.boundedHeight
      }px)`)

    const listeningRect = bounds.append("rect")
        .attr("class", "listening-rect")
        .attr("width", dimensions.boundedWidth)
        .attr("height", dimensions.boundedHeight)
        .on("mousemove", onMouseMove)
        .on("mouseleave", onMouseLeave)

    const tooltip = d3.select("#line-tooltip")
    const tooltipCircle = bounds.append("circle")
        .attr("class", "line-tooltip-circle")
        .attr("r", 4)
        .attr("stroke", "#af9358")
        .attr("fill", "white")
        .attr("stroke-width", 2)
        .style("opacity", 0)

    function onMouseMove() {
        const mousePosition = d3.mouse(this)
        const hoveredDate = xScale.invert(mousePosition[0])

        const getDistanceFromHoveredDate = d => Math.abs(xAccessor(d) - hoveredDate)
        const closestIndex = d3.scan(dataset, (a, b) => (
            getDistanceFromHoveredDate(a) - getDistanceFromHoveredDate(b)
        ))
        const closestDataPoint = dataset[closestIndex]

        const closestXValue = xAccessor(closestDataPoint)
        const closestYValue = yAccessor(closestDataPoint)

        const formatDate = d3.timeFormat("%B %A %-d, %Y")
        tooltip.select("#date")
            .text(formatDate(closestXValue))

        const formatMetric = d => `${d3.format(",.4r")(d)}`
        tooltip.select("#metric")
            .html(formatMetric(closestYValue))

        const x = xScale(closestXValue) +
            dimensions.margin.left
        const y = yScale(closestYValue) +
            dimensions.margin.top

        tooltipCircle
            .attr("cx", xScale(closestXValue))
            .attr("cy", yScale(closestYValue))
            .style("opacity", 1)

        // tooltip.style('left', tooltipCircle.attr('cx') + 'px')
        //     .style('top', tooltipCircle.attr('cy') + 'px')

        tooltip.style("transform", `translate(` +
            `calc(160% + ${x}px),` +
            `calc(500% + ${y}px)` +
            `)`)

        tooltip.style("opacity", 1)
    }

    function onMouseLeave() {
        tooltip.style("opacity", 0)

        tooltipCircle.style("opacity", 0)
    }
}