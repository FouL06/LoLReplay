let simulation = null;
const MasteryData = { data: null };

LoadData().then((data) => {
  MasteryData.data = data;
  d3.select("#lower-bound-slider").on("input", updateChart);
  d3.select("#upper-bound-slider").on("input", updateChart);

  const maxChampionPoints = d3.max(
    MasteryData.data,
    (d) => d.championPoints + 100
  );
  d3.select("#lower-bound-slider")
    .attr("min", 0)
    .attr("max", maxChampionPoints)
    .property("value", 0);
  d3.select("#upper-bound-slider")
    .attr("min", 0)
    .attr("max", maxChampionPoints)
    .property("value", maxChampionPoints);

  updateChart();
});

async function LoadData() {
  const data = await d3.csv("data/mastery_data.csv");

  data.forEach((d) => {
    d.championPoints = +d.championPoints; // Convert to integer
  });

  return data;
}

// Formats legend labels based on current max value from data
function formatLegendLabel(value) {
  if (value >= 10000) {
    return (value / 1000).toFixed(0) + "k";
  } else {
    return (value / 1000).toFixed(1) + "k";
  }
}

function DrawChart(data) {
  const width = 1000;
  const height = 800;
  const maxChampionPoints = d3.max(data, (d) => d.championPoints);
  const maxRadius = 100;
  const minTextRadius = 20;
  const titleText = "Champion Mastery - FouL04";
  const titleX = width / 2;
  const titleY = 35;
  const titleFontSize = "30px";

  const svgMastery = d3
    .select("#mastery-chart")
    .attr("width", width)
    .attr("height", height);

  svgMastery.selectAll("*").remove();

  // Add chart title
  svgMastery
    .append("text")
    .text(titleText)
    .attr("x", titleX)
    .attr("y", titleY)
    .attr("text-anchor", "middle")
    .style("font-size", titleFontSize)
    .style("font-weight", "bold");

  // Create a force simulation with gravity and collision detection
  simulation = d3
    .forceSimulation(data)
    .force("center", d3.forceCenter(width / 2, height / 2))
    .force(
      "collision",
      d3.forceCollide().radius((d) => {
        const scaledRadius = (d.championPoints / maxChampionPoints) * maxRadius;
        return Math.max(minTextRadius, Math.min(scaledRadius, maxRadius));
      })
    )
    .force("gravity", d3.forceManyBody().strength(20));

  // Create groups for each data point
  const groups = svgMastery
    .selectAll("g")
    .data(data)
    .enter()
    .append("g")
    .attr("transform", (d) => `translate(${d.x}, ${d.y})`)
    .each(function (d) {
      const championData = d;
      d3.select(this).on("click", function () {
        document.getElementById("current-champion-mastery").textContent =
          "Champion Name: " +
          championData.championName +
          " , " +
          "Mastery Points: " +
          championData.championPoints;
      });
    })
    .call(
      d3
        .drag()
        .on("start", (event, d) => {
          // When a drag starts, save the initial position
          d.fx = d.x;
          d.fy = d.y;
        })
        .on("drag", (event, d) => {
          // During the drag, update the position
          d.fx = event.x;
          d.fy = event.y;
        })
        .on("end", (event, d) => {
          // When a drag ends, clear the fixed position and reset the simulation
          d.fx = null;
          d.fy = null;
          simulation.alpha(0.5).restart(); // Restart the simulation to make bubbles snap back
        })
    );

  // Create the legend
  const legendX = width - 180;
  const legendY = 110;

  const legendData = [
    { label: formatLegendLabel(maxChampionPoints), radius: 100 },
    { label: formatLegendLabel(maxChampionPoints / 2), radius: 50 },
    {
      label: formatLegendLabel(maxChampionPoints / 100),
      radius: 20,
    },
  ];

  const legendGroup = svgMastery
    .append("g")
    .attr("transform", `translate(${legendX},${legendY})`);

  legendGroup
    .selectAll("circle")
    .data(legendData)
    .enter()
    .append("circle")
    .attr("cx", 10)
    .attr("cy", (d, i) => i * 20)
    .attr("r", (d) => d.radius)
    .attr("fill", "none")
    .attr("stroke", "black");

  legendGroup
    .selectAll("text")
    .data(legendData)
    .enter()
    .append("text")
    .attr("x", 120)
    .attr("y", (d, i) => i * 30)
    .text((d) => d.label)
    .attr("alignment-baseline", "middle");

  let bubbleColors = d3
    .scaleSequential(d3.interpolateBlues)
    .domain([0, maxChampionPoints]);

  // Create circles within each group
  groups
    .append("circle")
    .attr("r", (d) => {
      const scaledRadius = (d.championPoints / maxChampionPoints) * maxRadius;
      return Math.max(minTextRadius, Math.min(scaledRadius, maxRadius));
    })
    .attr("fill", (d) => {
      return bubbleColors(d.championPoints);
    });

  // Create text within each group to display champion name
  groups
    .append("text")
    .text((d) => d.championName)
    .attr("text-anchor", "middle")
    .attr("dy", 4)
    .style("fill", "black");

  // Start the simulation
  simulation.on("tick", () => {
    groups.attr("transform", (d) => `translate(${d.x}, ${d.y})`);
  });
}

function updateChart() {
  const lowerBoundSliderValue = parseInt(
    d3.select("#lower-bound-slider").property("value")
  );
  const upperBoundSliderValue = parseInt(
    d3.select("#upper-bound-slider").property("value")
  );

  document.getElementById("lower-slider-label").textContent =
    "Lower Bound Value: " + lowerBoundSliderValue;
  document.getElementById("upper-slider-label").textContent =
    "Upper Bound Value: " + upperBoundSliderValue;

  // Filter the data based on the selected range and redraw chart
  const filteredData = MasteryData.data.filter((d) => {
    return (
      d.championPoints >= lowerBoundSliderValue &&
      d.championPoints <= upperBoundSliderValue
    );
  });
  DrawChart(filteredData);
}
