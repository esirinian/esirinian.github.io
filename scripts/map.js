async function drawMap() {
    const countryShapes = await d3.json('../world-geojson/world-geojson.json')
    const dataset = await d3.csv('../data/owid-covid-data-full.csv')

    const compButton = d3.select("#comp-all-btn")
        .text('Compare all Countries')
        .on('click', function () {
            if (compButton.text() == "Compare all Countries") {
                compButton.text('Back to Map View')
                d3.select('.map')
                    .style('display', 'none')
                compCountries()
            } else {
                compButton.text('Compare all Countries')
                d3.select('.map')
                    .style('display', 'block')
                d3.select(".comp")
                    .html('')

            }


        })


    const countryNameAccessor = d => d.properties['NAME']
    const countryIdAccessor = d => d.properties["ADM0_A3_IS"]

    const metric = "2020-07-31"
    const excludes = ['OWID_KOS', 'OWID_WRL']

    let metricDataByCountry = {}
    dataset.forEach(d => {
        if (d["date"] != metric) return
        if (excludes.includes(d["iso_code"])) return
        metricDataByCountry[d["iso_code"]] = +d["total_deaths"] || 0
    })


    let dimensions = {
        width: window.innerWidth * 0.9,
        margin: {
            top: 10,
            right: 10,
            bottom: 10,
            left: 10,
        },
    }

    dimensions.boundedWidth = dimensions.width - dimensions.margin.left - dimensions.margin.right

    const sphere = ({
        type: "Sphere"
    })
    const projection = d3.geoEqualEarth()
        .fitWidth(dimensions.boundedWidth, sphere)

    const pathGenerator = d3.geoPath(projection)
    const [
        [x0, y0],
        [x1, y1]
    ] = pathGenerator.bounds(sphere)

    dimensions.boundedHeight = y1
    dimensions.height = dimensions.boundedHeight + dimensions.margin.top + dimensions.margin.bottom

    const map = d3.select('#map')
        .append('svg')
        .attr('height', dimensions.height)
        .attr('width', dimensions.width)

    const bounds = map.append('g')
        .style('transform', `translate(${dimensions.margin.left}px, ${dimensions.margin.top}px)`)

    const metricValues = Object.values(metricDataByCountry)
    const metricValueExtent = d3.extent(metricValues)

    const maxChange = d3.max([-metricValueExtent[0], metricValueExtent[1]])
    const colorScale = d3.scaleLinear()
        .domain([-maxChange, 0, maxChange])
        .range(['white', "lightsalmon", 'firebrick'])

    const earth = bounds.append('path')
        .attr('class', 'earth')
        .attr('d', pathGenerator(sphere))

    const graticuleJson = d3.geoGraticule10()


    const graticule = bounds.append('path')
        .attr('class', 'graticule')
        .attr('d', pathGenerator(graticuleJson))

    const countries = bounds.selectAll('.country')
        .data(countryShapes.features)
        .enter().append('path')
        .attr('class', d => ['country', countryIdAccessor(d)].join(" "))
        .attr('d', pathGenerator)
        .attr('fill', d => {
            const metricValue = metricDataByCountry[countryIdAccessor(d)]
            if (typeof metricValue == "undefined") return "#e2e6e9"
            return colorScale(metricValue)
        })

    const voronoiGenerator = d3.voronoi()
        .x(d => pathGenerator.centroid(d)[0])
        .y(d => pathGenerator.centroid(d)[1])
        .extent([
            [0, 0],
            [dimensions.boundedWidth, dimensions.boundedHeight]
        ])

    const voronoiPolygons = voronoiGenerator.polygons(countryShapes.features)

    const voronoi = bounds.selectAll(".voronoi")
        .data(voronoiPolygons)
        .enter().append()
        .attr('class', 'voronoi')
        .attr('points', (d = []) => (
            d.map(point => (
                point.join(',')
            )).join(' ')
        ))

    const legendGroup = map.append('g')
        .attr('transform', `translate(${120}, ${dimensions.width < 800 
            ? dimensions.boundedHeight - 30 
            : dimensions.boundedHeight * 0.5}
        )`)

    const legendTitle = legendGroup.append('text')
        .attr('y', -23)
        .attr('class', 'legend-title')
        .text('Novel COVID-19')

    const legendByLine = legendGroup.append('text')
        .attr('y', -9)
        .attr('class', 'legend-byline')
        .text('Total Deaths')

    const defs = map.append('defs')
    const legendGradientId = 'legent-gradient'

    const gradient = defs.append('linearGradient')
        .attr('id', legendGradientId)
        .selectAll('stop')
        .data(colorScale.range())
        .enter().append('stop')
        .attr('stop-color', d => d)
        .attr('offset', (d, i) => `${i * 100 / 2}%`)

    const legendWidth = 120
    const legendHeight = 16
    const legendGradient = legendGroup.append('rect')
        .attr('x', -legendWidth / 2)
        .attr('height', legendHeight)
        .attr('width', legendWidth)
        .style('fill', `url(#${legendGradientId})`)

    const legendValueRight = legendGroup.append('text')
        .attr('class', 'legend-value')
        .attr('x', legendWidth / 2 + 10)
        .attr('y', legendHeight / 2)
        .text(`${d3.format(",.2r")(maxChange)}`)

    const legendValueLeft = legendGroup.append('text')
        .attr('class', 'legend-value')
        .attr('x', -legendWidth / 2 - 10)
        .attr('y', legendHeight / 2)
        .text(`${d3.format(',.2r')(0)}`)
        .style('text-anchor', 'end')



    // interactions
    countries.on('mouseenter', onMouseEnter)
        .on('mouseleave', onMouseLeave)
        .on('click', onMouseClick)

    const tooltip = d3.select('#map-tooltip')

    function onMouseEnter(datum) {
        tooltip.style('opacity', 1)

        const countryId = countryIdAccessor(datum)
        const metricValue = metricDataByCountry[countryId] || 0

        tooltip.select('#country')
            .text(countryNameAccessor(datum))

        tooltip.select('#value')
            .text(`${d3.format(",.5r")(metricValue) || 0}`)

        const [centerX, centerY] = pathGenerator.centroid(datum)

        const x = centerX + dimensions.margin.left
        const y = centerY + dimensions.margin.top

        tooltip.style("transform", `translate(` +
            `calc(${x}px + 15%),` +
            `calc(${y}px + 590%)` +
            `)`)

        d3.select(`.${countryId}`)
            .classed('is-hovered', true)
    }

    function onMouseLeave() {
        tooltip.style('opacity', 0)
        d3.selectAll(`.country`)
            .classed('is-hovered', false)
    }

    function onMouseClick(datum) {
        d3.select('.vis')
            .style('display', 'none')
        d3.select('.comp')
            .style('display', 'none')

        let detailMetricsByCountry = dataset.filter(d => {
            return d["iso_code"] == countryIdAccessor(datum)
        })

        drawDetail(countryIdAccessor(datum))



        d3.select('.detail')
            .style('display', 'flex')
    }


}

drawMap()