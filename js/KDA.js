const kdaData = [];

d3.csv("data/full_game_data.csv")
  .then(function (data) {
    data.forEach(function (d, i) {
      const tempDate = new Date(parseInt(d.gameCreation));
      const date = tempDate.toLocaleDateString("en-US", {
        month: "short", // Short month name (e.g., Oct)
        day: "2-digit", // Two-digit day of the month (e.g., 02)
        year: "numeric", // Full year (e.g., 2023)
      });
      const kill = parseInt(d.kill);
      const death = parseInt(d.death);
      const assist = parseInt(d.assist);

      if (!isNaN(kill) && !isNaN(death) && !isNaN(assist)) {
        kdaData.push({
          date: date,
          kill: kill,
          death: death,
          assist: assist,
          index: i,
        });
      }
    });
    const last30Games = kdaData.slice(0, 30);
    DrawKDAChart(last30Games);
  })
  .catch(function (error) {
    console.log(error);
  });

function DrawKDAChart(data) {
  const width = 1000;
  const height = 800;
  const margin = { top: 50, right: 20, bottom: 120, left: 50 };

  const svg = d3
    .select("#match-chart")
    .attr("width", width)
    .attr("height", height);

  // Create scales
  const xScale = d3
    .scaleBand()
    .domain(data.map((d) => d.date + "_" + d.index))
    .range([margin.left, width - margin.right])
    .padding(0.1);

  const yScale = d3
    .scaleLinear()
    .domain([0, d3.max(data, (d) => d.kill + d.death + d.assist)])
    .nice()
    .range([height - margin.bottom, margin.top]);

  // Create color scale for stacked bars
  const color = d3
    .scaleOrdinal()
    .domain(["kill", "death", "assist"])
    .range(["#008000", "#d62728", "#add8e6"]);

  // Calculate KDA ratio for each game
  data.forEach((d) => {
    d.kdaRatio = (d.kill + d.assist) / d.death;
    if (isNaN(d.kdaRatio)) {
      d.kdaRatio = 0;
    }
  });

  // Create line generator for the trend line
  const line = d3
    .line()
    .x((d) => xScale(d.date + "_" + d.index) + xScale.bandwidth() / 2)
    .y((d) => yScale(d.kdaRatio));

  // Create and bind data to stacked bars
  const stackedData = d3.stack().keys(["kill", "death", "assist"])(data);

  // Add tooltip
  const tooltip = d3
    .select("body")
    .append("div")
    .attr("class", "tooltip")
    .style("opacity", 0)
    .style("font-weight", "bold")
    .style("background-color", "white")
    .style("padding", "3px")
    .style("border-radius", "5px")
    .style("border", "1px solid black");

  svg
    .selectAll(".bar-group")
    .data(stackedData)
    .enter()
    .append("g")
    .attr("class", "bar-group")
    .attr("fill", (d) => color(d.key))
    .selectAll("rect")
    .data((d) => d)
    .enter()
    .append("rect")
    .attr("x", (d) => xScale(d.data.date + "_" + d.data.index))
    .attr("y", (d) => yScale(d[1]))
    .attr("height", (d) => yScale(d[0]) - yScale(d[1]))
    .attr("width", xScale.bandwidth())
    .on("mouseover", function (event, d) {
      const key = d3.select(this.parentNode).attr("fill");
      const value = d[1] - d[0];
      let label = "";

      switch (key) {
        case "#008000":
          label = "Kills";
          break;
        case "#d62728":
          label = "Deaths";
          break;
        case "#add8e6":
          label = "Assists";
          break;
        default:
          label = key;
      }

      // Show tooltip on hover
      tooltip.transition().duration(200).style("opacity", 0.9);
      tooltip
        .html(`${label}: ${value}`)
        .style("left", event.pageX + "px")
        .style("top", event.pageY - 28 + "px");
    })
    .on("mouseout", function () {
      tooltip.transition().duration(500).style("opacity", 0);
    });

  // Add trend line
  svg
    .append("path")
    .datum(data)
    .attr("class", "trend-line")
    .attr("d", line)
    .attr("fill", "none")
    .attr("stroke", "#FFA500")
    .attr("stroke-width", 2);

  svg
    .selectAll(".dot")
    .data(data)
    .enter()
    .append("circle")
    .attr("class", "dot")
    .attr("cx", (d) => xScale(d.date + "_" + d.index) + xScale.bandwidth() / 2)
    .attr("cy", (d) => yScale(d.kdaRatio))
    .attr("r", 4)
    .attr("fill", "#FFA500");

  // Add legend
  const legend = svg
    .append("g")
    .attr("class", "legend")
    .attr("transform", `translate(${width - 120}, ${margin.top})`);

  legend
    .selectAll("rect")
    .data(color.domain())
    .enter()
    .append("rect")
    .attr("y", (d, i) => i * 20)
    .attr("width", 18)
    .attr("height", 18)
    .style("fill", color);

  legend
    .selectAll("text")
    .data(color.domain())
    .enter()
    .append("text")
    .attr("y", (d, i) => i * 20 + 9)
    .attr("x", 25)
    .attr("dy", "0.35em")
    .style("text-anchor", "start")
    .text((d) => d);

  legend
    .append("line")
    .attr("x1", 0)
    .attr("y1", 75)
    .attr("x2", 18)
    .attr("y2", 75)
    .attr("stroke", "#FFA500")
    .attr("stroke-width", 2);

  legend
    .append("text")
    .attr("y", 75)
    .attr("x", 25)
    .attr("dy", "0.35em")
    .style("text-anchor", "start")
    .text("KDA ratio");

  // Add x-axis with rotated labels
  const xAxis = d3.axisBottom(xScale).tickSizeOuter(0);
  svg
    .append("g")
    .attr("class", "x-axis")
    .attr("transform", `translate(0,${height - margin.bottom})`)
    .call(xAxis)
    .selectAll("text")
    .attr("transform", "rotate(-45)")
    .attr("text-anchor", "end");

  // Add y-axis
  const yAxis = d3.axisLeft(yScale);
  svg
    .append("g")
    .attr("class", "y-axis")
    .attr("transform", `translate(${margin.left},0)`)
    .call(yAxis);

  // Add x-axis label
  svg
    .append("text")
    .attr("transform", `translate(${width / 2},${height - margin.bottom + 90})`)
    .style("text-anchor", "middle")
    .text("Game Date & Game Number");

  // Add y-axis label
  svg
    .append("text")
    .attr("transform", "rotate(-90)")
    .attr("y", 0)
    .attr("x", 0 - height / 2)
    .attr("dy", "1em")
    .style("text-anchor", "middle")
    .text("# Kills / Deaths / Assists");

  // Add Chart Title
  svg
    .append("text")
    .attr("x", width / 2)
    .attr("y", 35)
    .attr("text-anchor", "middle")
    .style("font-size", "30px")
    .style("font-weight", "bold")
    .text("KDA Last 30 Games - FouL04");
}
