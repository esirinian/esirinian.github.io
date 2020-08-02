async function compCountries() {
    const dataset = await d3.csv('../data/owid-covid-data-full.csv')

    const width = 900
    let dimensions = {
        width: width,
        height: width * 0.6,
        margin: {
            top: 30,
            right: 10,
            bottom: 50,
            left: 50,
        },
    }
    dimensions.boundedWidth = dimensions.width - dimensions.margin.left - dimensions.margin.right
    dimensions.boundedHeight = dimensions.height - dimensions.margin.top - dimensions.margin.bottom

    const svg = d3.select('#comp')
        .append('svg')
        .attr("width", dimensions.width)
        .attr("height", dimensions.height)

    const bounds = svg.append("g")
        .style("transform", `translate(${dimensions.margin.left}px, ${dimensions.margin.top}px)`)

    bounds.append("g")
        .attr("class", "bins")
    bounds.append("line")
        .attr("class", "mean")
    bounds.append("g")
        .attr("class", "x-axis")
        .style("transform", `translateY(${dimensions.boundedHeight}px)`)
        .append("text")
        .attr("class", "x-axis-label")
        .attr("x", dimensions.boundedWidth / 2)
        .attr("y", dimensions.margin.bottom - 10)

    const drawHistogram = metric => {
        const metricAccessor = d => d[metric]
        const yAccessor = d => d.length

        // 4. Create scales
        const xScale = d3.scaleLinear()
            .domain(d3.extent(dataset, metricAccessor))
            .range([0, dimensions.boundedWidth])
            .nice()

        console.log(xScale.domain())
        const binsGenerator = d3.histogram()
            .domain(xScale.domain())
            .value(metricAccessor)
            .thresholds(12)

        const bins = binsGenerator(dataset)

        const yScale = d3.scaleLinear()
            .domain([0, d3.max(bins, yAccessor)])
            .range([dimensions.boundedHeight, 0])
            .nice()

        // 5. Draw data

        const exitTransition = d3.transition()
            .duration(600)

        const updateTransition = exitTransition.transition()
            .duration(600)

        const barPadding = 1

        let binGroups = bounds.select(".bins")
            .selectAll(".bin")
            .data(bins)

        const oldBinGroups = binGroups.exit()
        oldBinGroups.selectAll("rect")
            .style("fill", "orangered")
            .transition(exitTransition)
            .attr("y", dimensions.boundedHeight)
            .attr("height", 0)

        oldBinGroups.selectAll("text")
            .transition(exitTransition)
            .attr("y", dimensions.boundedHeight)

        oldBinGroups
            .transition(exitTransition)
            .remove()

        const newBinGroups = binGroups.enter().append("g")
            .attr("class", "bin")

        newBinGroups.append("rect")
            .attr("height", 0)
            .attr("x", d => xScale(d.x0) + barPadding)
            .attr("y", dimensions.boundedHeight)
            .attr("width", d => d3.max([
                0,
                xScale(d.x1) - xScale(d.x0) - barPadding
            ]))
            .style("fill", "yellowgreen")

        newBinGroups.append("text")
            .attr("x", d => xScale(d.x0) + (xScale(d.x1) - xScale(d.x0)) / 2)
            .attr("y", dimensions.boundedHeight)

        // update binGroups to include new points
        binGroups = newBinGroups.merge(binGroups)

        const barRects = binGroups.select("rect")
            .transition(updateTransition)
            .attr("x", d => xScale(d.x0) + barPadding)
            .attr("y", d => yScale(yAccessor(d)))
            .attr("height", d => dimensions.boundedHeight - yScale(yAccessor(d)))
            .attr("width", d => d3.max([
                0,
                xScale(d.x1) - xScale(d.x0) - barPadding
            ]))
            .transition()
            .style("fill", "cornflowerblue")

        const barText = binGroups.select("text")
            .transition(updateTransition)
            .attr("x", d => xScale(d.x0) + (xScale(d.x1) - xScale(d.x0)) / 2)
            .attr("y", d => yScale(yAccessor(d)) - 5)
            .text(d => yAccessor(d) || "")

        const mean = d3.mean(dataset, metricAccessor)

        console.log(mean)

        const meanLine = bounds.selectAll(".mean")
            .transition(updateTransition)
            .attr("x1", xScale(mean))
            .attr("x2", xScale(mean))
            .attr("y1", -20)
            .attr("y2", dimensions.boundedHeight)

        const meanLabel = bounds.append("text")
            .transition(updateTransition)
            .attr('id', 'mean-text')
            .attr("x", xScale(mean))
            .attr("y", -20)
            .text("mean")
            .attr("fill", "maroon")
            .style("font-size", "12px")
            .style("text-anchor", "middle")

        // 6. Draw peripherals

        const xAxisGenerator = d3.axisBottom()
            .scale(xScale)

        const xAxis = bounds.select(".x-axis")
            .transition(updateTransition)
            .call(xAxisGenerator)

        const xAxisLabel = xAxis.select(".x-axis-label")
            .text(metric)
    }

    const metrics = [
        "new_cases",
        "new_deaths",
        "population_density",
        "median_age",
        "male_smokers",
        "female_smokers",
        "cardiovasc_death_rate",
        "hospital_beds_per_thousand",
        "life_expectancy",
        "diabetes_prevalence",
        "extreme_poverty"
    ]
    let selectedMetricIndex = 0
    drawHistogram(metrics[selectedMetricIndex])

    const button = d3.select("#comp")
        .append("button")
        .attr('id', 'back-btn')
        .attr('class', 'btn btn-dark')
        .text("Change metric")

    button.node().addEventListener("click", onClick)

    function onClick() {
        d3.select('#mean-text').remove()
        selectedMetricIndex = (selectedMetricIndex + 1) % metrics.length
        drawHistogram(metrics[selectedMetricIndex])
    }

}