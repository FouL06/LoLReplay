function getDaysDifference(date1, date2) {
  const timeDifference = Math.abs(date2.getTime() - date1.getTime());
  const millisecondsInADay = 24 * 60 * 60 * 1000;
  const daysDifference = Math.floor(timeDifference / millisecondsInADay);

  return daysDifference;
}

d3.csv("data/full_game_data.csv")
  .then(function (data) {
    data.forEach(function (d) {
      d.gameCreation = new Date(parseInt(d.gameCreation));
      d.win = d.win === "True" ? 1 : 0;
    });

    // Filter the data for the last 28 days
    const currentDate = new Date(2023, 10, 3);
    const lastMonth = new Date(currentDate);
    lastMonth.setDate(currentDate.getDate() - 28);

    data = data.filter(function (d) {
      return d.gameCreation >= lastMonth;
    });

    // Group data by date and calculate the win rate for each date
    const dateToInteger = new Map();

    const dataByDate = d3.group(data, (d) => {
      const dateString = d.gameCreation.toDateString();

      // Check if the dateString is already in the map
      if (!dateToInteger.has(dateString)) {
        const dateDiff = getDaysDifference(new Date(dateString), lastMonth);
        dateToInteger.set(dateString, dateDiff);
      }

      return dateToInteger.get(dateString);
    });

    // Calculate total wins and total games for each date
    dataByDate.forEach(function (dateData) {
      dateData.totalWins = d3.sum(dateData, (d) => d.win);
      dateData.totalGames = dateData.length;
      dateData.winRate = dateData.totalWins / dateData.totalGames;
    });

    // Create the heatmap
    const margin = { top: 0, right: 10, bottom: 10, left: 0 };
    const width = 1000;
    const height = 800;

    // Define the dimensions of the heatmap cells
    const numWeeks = 4; // Number of weeks
    const daysPerWeek = 7; // Number of days per week

    const cellWidth = 100;
    const cellHeight = 100;

    const colorScalePos = d3
      .scaleSequential(d3.interpolateGreens)
      .domain([0.5, 1.25]);
    const colorScaleNeg = d3
      .scaleSequential(d3.interpolateReds)
      .domain([0, 0.75]);

    const colorScale = (data) => {
      if (data <= 0.5) {
        return colorScaleNeg(data);
      }
      return colorScalePos(data);
    };

    const svg = d3
      .select("#calendar-chart")
      .attr("width", width)
      .attr("height", height);

    // Calculate the horizontal and vertical translation to center the heatmap
    const horizontalTranslation = (width - daysPerWeek * cellWidth) / 2;
    const verticalTranslation = (height - numWeeks * cellHeight) / 2;

    const title = svg
      .append("text")
      .attr("x", width / 2)
      .attr("y", margin.top + 70) // Adjust the vertical position as needed
      .attr("text-anchor", "middle")
      .style("font-size", "30px")
      .style("font-weight", "bold")
      .text("Daily Winrate - FouL04");

    const heatmap = svg
      .append("g")
      .attr(
        "transform",
        `translate(${horizontalTranslation}, ${verticalTranslation})`
      );

    heatmap
      .append("text")
      .attr("x", -200) // Adjust the horizontal position as needed
      .attr("y", -50)
      .attr("text-anchor", "middle")
      .style("font-size", "16px")
      .attr("transform", "rotate(-90)")
      .text("Week");

    // Add the x-axis label within the heatmap
    heatmap
      .append("text")
      .attr("x", (cellWidth * daysPerWeek) / 2)
      .attr("y", cellHeight * numWeeks + 40) // Adjust the vertical position as needed
      .attr("text-anchor", "middle")
      .style("font-size", "16px")
      .text("Day");

    function getMonthName(monthNumber) {
      const date = new Date();
      date.setMonth(monthNumber - 1);

      return date.toLocaleString("en-US", {
        month: "long",
      });
    }

    // Create individual cells for each day
    const cellGrid = heatmap
      .selectAll(".cell")
      .data([...Array.from({ length: 28 }, (_, i) => i + 1)]) // Generate an array from 1 to 28
      .enter()
      .append("rect")
      .attr("class", "cell")
      .attr("width", cellWidth)
      .attr("height", cellHeight)
      .style("fill", function (integerDate) {
        const dateData = dataByDate.get(integerDate);
        return dateData ? colorScale(dateData.winRate) : "white";
      })
      .style("stroke", "black") // Add a black border
      .style("stroke-width", 1) // Set the border width
      .attr("transform", (integerDate, i) => {
        const row = Math.floor(i / daysPerWeek);
        const col = i % daysPerWeek;
        return `translate(${col * cellWidth}, ${row * cellHeight})`;
      })
      .each(function (d) {
        d3.select(this).on("click", function (e) {
          const temp = dataByDate.get(d);
          let rate = 0;
          if (temp && temp.winRate) {
            rate = temp.winRate;
            const formatedPerc = rate * 100;
            const gameDate = new Date(dataByDate.get(d)[0].gameCreation);
            //need to fix on days not played
            //need to fix so that win rate strings dont stack
            svg.selectAll(".KEVXUESUPERSWAG").remove();
            svg
              .append("text")
              .attr("class", "KEVXUESUPERSWAG")
              .attr("x", width / 2)
              .attr("y", margin.top + 145) // Adjust the vertical position as needed
              .attr("text-anchor", "middle")
              .style("font-size", "25px")
              .style("font-weight", "bold")
              .text(
                getMonthName(gameDate.getMonth()) +
                  "-" +
                  gameDate.getDate() +
                  " Winrate: " +
                  formatedPerc.toFixed(2) +
                  "%"
              );
          } else {
            svg.selectAll(".KEVXUESUPERSWAG").remove();
            svg
              .append("text")
              .attr("class", "KEVXUESUPERSWAG")
              .attr("x", width / 2)
              .attr("y", margin.top + 145) // Adjust the vertical position as needed
              .attr("text-anchor", "middle")
              .style("font-size", "25px")
              .style("font-weight", "bold")
              .text("No games played on selected date");
          }
        });
      });

    // Create a legend for the color mapping
    const legendWidth = 150;
    const legendHeight = 60;
    const legend = svg.append("g").attr("transform", `translate(20, 20)`);

    // Define the color stops and corresponding labels
    const colorStops = [0, 0.5, 1];
    const colorLabels = [
      "0% - Bad Day / Didn't Play",
      "50% - Average Day",
      "100% - Good Day",
    ];

    // Create color rectangles in the legend
    legend
      .selectAll("rect")
      .data(colorStops)
      .enter()
      .append("rect")
      .attr("x", 0)
      .attr("y", (d, i) => i * 20)
      .attr("width", 20)
      .attr("height", 20)
      .style("fill", (d) => colorScale(d));

    // Create text labels for the legend
    legend
      .selectAll("text")
      .data(colorLabels)
      .enter()
      .append("text")
      .attr("x", 30)
      .attr("y", (d, i) => i * 20 + 15) // Adjust the vertical position as needed
      .style("font-size", "12px")
      .text((d) => d);
  })
  .catch(function (error) {
    console.log(error);
  });
