class TwentyPanel {
	constructor(data, {elements = new Map(), x = {min: 2000, max: 2017}, y = {min: 0, max: 100},
		chartWidth = 800, chartHeight = 400, chartID = "#chart", tooltipTitlePrefix = '', tooltipPrefix = '', tooltipVars = []} = {}) {
		this.fullData = data;
		this.currentSeries = data.keys().next().value;
		this.data = data.get(this.currentSeries);
		
		if (tooltipVars.length == 0) {
			tooltipVars = Array.from(this.data.keys());
		}
		this.tooltipVars = tooltipVars;
		
		this.x = x; 
		this.y = y;
		this.chartWidth = chartWidth;
		this.chartHeight = chartHeight;
		this.chartID = chartID;
		this.tooltipTitlePrefix = tooltipTitlePrefix;
		this.tooltipPrefix = tooltipPrefix;
						
		this.setupChart();
	}
	
	setupChart() {
		document.querySelector('.chart-subtitle').innerHTML = this.currentSeries + ' by age/year and income ventile<sup>†</sup> (' + 
		this.data.get(this.data.keys().next().value)['units'] + ')';
		
		//const margin = { top: 20, right: 30, bottom: 50, left: 60 };
		const width = this.chartWidth;
		const height = this.chartHeight;
		
		const svg = d3.select(this.chartID)
			.append("svg")
			.attr("width", this.chartWidth)
			.attr("height", this.chartHeight);
		
		svg.append("clipPath")
			.attr("id", "chartBounds") 
			.append("rect") // Everything outside the axis will be clipped and therefore invisible.
			.attr("width", width)
			.attr("height", height);

		const g = svg.append("g")
			.attr("clip-path", "url(#chartBounds)");
		this.charts = [];
		
		const panelWidth = width / 4;
		const panelHeight = height / 5;


		// Create scales
		this.scales = new Map();
		this.line = new Map();
		this.panels = new Map();
		this.config = new Map();
		
		const margins = {left: 30, right: 10, bottom: 20, top: 10};
		//Add x close button
		this.close = g.append("text")
			.text('✕')
			.attr('class','panel')
			.attr('x', width-margins.right)
			.attr('y', margins.top*4)
			.attr("text-anchor", "end")
			.attr("dominant-baseline", "top")
			.style('font-size', '40px')
			.style('font-weight','700')
			.style('fill', '#ccc')
			.style('opacity', '0');
			
		this.elements = new Map();
		for (let i=0; i < 20; i++) {
			const xPos = panelWidth * (i % 4);
			const yPos = panelHeight * Math.floor(i / 4);
			//console.log(i, xPos, yPos, xPos+panelWidth, yPos+panelHeight);
			
			const xMin = d3.min(this.data.get('p25')['data'][i].values, d => d.x);
			const yMin = Math.min(0,d3.min(this.data.get('p25')['data'][i].values, d => d.y));
			const xMax = d3.max(this.data.get('p75')['data'][i].values, d => d.x);
			let yMax = d3.max(this.data.get('p75')['data'][i].values, d => d.y);
			if (yMax < 100) { yMax = Math.ceil(yMax/10)*10; }
			else if (yMax < 200) { yMax = Math.ceil(yMax/25)*25; }
			else { yMax = Math.ceil(yMax/50)*50; }

			let xAxis;
			let yAxis;
			let xAxisGroup;
			let yAxisGroup;
			let gridGroup;
			
			this.scales.set(i, {x: d3.scaleLinear().range([panelWidth*0.025 + margins.left, panelWidth*0.975-margins.right]).domain([this.x.min,this.x.max]),
								y:d3.scaleLinear().range([panelHeight-margins.bottom, margins.top]).domain([yMin,yMax])});

			this.panels.set(i, g.append("g")
				.attr("class", "panel")
				.attr("transform", `translate(${xPos},${yPos})`)
				.attr("opacity", 1));
				
			xAxis = d3.axisBottom(this.scales.get(i)['x']).tickValues([2000,2017]).tickFormat(d => 55 + (d - this.x.min));
			yAxis = d3.axisLeft(this.scales.get(i)['y']).ticks(3);
			
			yAxisGroup = this.panels.get(i).append("g")
				.attr("class", "axis y-axis")
				.attr("transform", `translate(${margins.left},0)`)
				.call(yAxis);
			xAxisGroup = this.panels.get(i).append("g")
				.attr("class", "axis x-axis")
				.attr("transform", `translate(0,${panelHeight-margins.bottom})`)
				.call(xAxis);
				
			gridGroup = this.panels.get(i).append("g").attr("class", "grid");
			gridGroup.selectAll(".y-grid")
				.data(this.scales.get(i).y.ticks(3))
				.enter()
				.append("line")
				.attr("class", "grid-line y-grid")
				.attr("x1", margins.left)
				.attr("x2", panelWidth - margins.right)
				.attr("y1", d => this.scales.get(i).y(d))
				.attr("y2", d => this.scales.get(i).y(d));
				
			this.panels.get(i).append("text")
				.attr('class', 'ventile')
				.attr("x", margins.left + (panelWidth-margins.left-margins.right) / 2)
				.attr("y", panelHeight / 1.4)
				.attr("text-anchor", "middle")
				.style("font-size", "4em")
				.style("font-weight", "bold")
				.style('fill', 'gray')
				.text(`${i + 1}`)
				.style('opacity', 0.3);
			
			const hoverBorder = this.panels.get(i).append('rect')
				.attr('width', panelWidth)
				.attr('height', panelHeight)
				.attr('fill', '#ccc')
				.attr('stroke', '#777')
				.attr('stroke-width', 2)
				.style('opacity', '0')
				.on('mousemove', function (d, i) {
					d3.select(this).style('opacity', '0.2')})
				.on('mouseleave', function (d, i) {
					d3.select(this).style('opacity', '0')})
				.on('click', () => this.handleClick(i));
					
			// Create line generator
			this.line.set(i, d3.line()
				.x(d => this.scales.get(i).x(d.x))
				.y(d => this.scales.get(i).y(d.y)));
			
			yAxisGroup.selectAll("path").remove();
			xAxisGroup.selectAll("path").remove();

				
			this.config.set(i, {'xMin': xMin, 'xMax': xMax, 'yMin': yMin, 'yMax': yMax, 'xPos': xPos, 'yPos': yPos});
			
			this.elements.set(i, {});
			// Initialize dots for mouseover
			this.data.forEach((name, path) => {
				const line = this.panels.get(i).append("path")
					.datum(this.data.get(path)['data'][i].values)
					.attr("class", `data-line`)
					.attr("d", this.line.get(i))
					.attr("plot-type", "line")
					.style("stroke", this.data.get(path).color)
					.style("stroke-width", this.data.get(path).linewidth)
					.style("opacity", 1);
				const dot = this.panels.get(i).append('circle')
					.attr('class', `line-dot dot-${path}`)
					.attr('r', 5)
					.style('fill', this.data.get(path).color)
					.style('opacity', 0)
					.attr("clip-path", "url(#chartBounds)");
				this.elements.get(i)[path] = {'dot': dot};
				this.elements.get(i)[path]['line'] = line;
				});
			
			this.panels.get(i).selectAll("*")
				.filter(function() { return this !== hoverBorder.node(); })
				.style("pointer-events", "none");
			
		};
			
		// Initialize tooltip
		this.tooltip = g.append('g')
			.attr('class', 'tooltip')
			.style('opacity', 0)
			.style('pointer-events', 'none');

		// Tooltip background
		this.tooltipBg = this.tooltip.append('rect')
			.attr('class', 'tooltip-bg')
			.attr('rx', 4)
			.attr('ry', 4)
			.style('fill', 'white')
			.style('stroke', '#e2e8f0')
			.style('stroke-width', 1)
			.style('opacity', 0.9);

		// Tooltip content container
		this.tooltipContent = this.tooltip.append('g')
			.attr('class', 'tooltip-content');
		
		this.mouseOverlay = g.append('rect')
			.attr('width', width)
			.attr('height', height)
			.style('fill', 'none')
			.style('pointer-events', 'none')
			.on('mousemove', (event) => this.updateTooltip(event))
			.on('mouseleave', () => this.hideTooltip());
		
		this.svg = svg;
		this.chartArea = g;
		this.width = width;
		this.height = height;
		this.bigPanel = null;
		this.margins = margins;
		this.panelWidth = panelWidth;
		this.panelHeight = panelHeight;

	}
	
	updateData() {
		for (let i=0; i < 20; i++) {
			const xPos = this.panelWidth * (i % 4);
			const yPos = this.panelHeight * Math.floor(i / 4);
			//console.log(i, xPos, yPos, xPos+panelWidth, yPos+panelHeight);
			
			const xMin = d3.min(this.data.get('p25')['data'][i].values, d => d.x);
			const yMin = Math.min(0,d3.min(this.data.get('p25')['data'][i].values, d => d.y));
			const xMax = d3.max(this.data.get('p75')['data'][i].values, d => d.x);
			let yMax = d3.max(this.data.get('p75')['data'][i].values, d => d.y);
			if (yMax < 100) { yMax = Math.ceil(yMax/10)*10; }
			else if (yMax < 200) { yMax = Math.ceil(yMax/25)*25; }
			else { yMax = Math.ceil(yMax/50)*50; }

			let xAxis;
			let yAxis;
			let xAxisGroup;
			let yAxisGroup;
			let gridGroup;
			
			if (i === this.bigPanel) {
				this.scales.set(i, {x: d3.scaleLinear().range([this.width*0.025 + this.margins.left, this.width*0.975-this.margins.right]).domain([this.x.min,this.x.max]),
									y:d3.scaleLinear().range([this.height-this.margins.bottom, this.margins.top]).domain([yMin,yMax])});
				xAxis = d3.axisBottom(this.scales.get(i)['x']).ticks(18).tickFormat(d => 55 + (d - this.x.min));
			} else {
				this.scales.set(i, {x: d3.scaleLinear().range([this.panelWidth*0.025 + this.margins.left, this.panelWidth*0.975-this.margins.right]).domain([this.x.min,this.x.max]),
									y:d3.scaleLinear().range([this.panelHeight-this.margins.bottom, this.margins.top]).domain([yMin,yMax])});
				xAxis = d3.axisBottom(this.scales.get(i)['x']).tickValues([2000,2017]).tickFormat(d => 55 + (d - this.x.min));
			}

			
			yAxis = d3.axisLeft(this.scales.get(i)['y']).ticks(3);
			
			yAxisGroup = this.panels.get(i).select(".y-axis").call(yAxis);
			xAxisGroup = this.panels.get(i).select(".x-axis").call(xAxis);
			
			this.panels.get(i).select('.grid').remove()
			gridGroup = this.panels.get(i).append("g").attr("class", "grid");
			gridGroup.selectAll(".y-grid")
				.data(this.scales.get(i).y.ticks(3))
				.enter()
				.append("line")
				.attr("class", "grid-line y-grid")
				.attr("x1", this.margins.left)
				.attr("x2", this.panelWidth - this.margins.right)
				.attr("y1", d => this.scales.get(i).y(d))
				.attr("y2", d => this.scales.get(i).y(d));
			gridGroup.lower(); // Move back behind other elements
					
			// Create line generator
			this.line.set(i, d3.line()
				.x(d => this.scales.get(i).x(d.x))
				.y(d => this.scales.get(i).y(d.y)));
			
			yAxisGroup.selectAll("path").remove();
			xAxisGroup.selectAll("path").remove();

				
			this.config.set(i, {'xMin': xMin, 'xMax': xMax, 'yMin': yMin, 'yMax': yMax, 'xPos': xPos, 'yPos': yPos});
			
			// Initialize dots for mouseover
			this.data.forEach((name, path) => {
				const line = this.elements.get(i)[path]['line']
					.datum(this.data.get(path)['data'][i].values)
					.attr("d", this.line.get(i));
				});
			
			/*this.panels.get(i).selectAll("*")
				.filter(function() { return this !== hoverBorder.node(); })
				.style("pointer-events", "none");*/
			
		};
	}
	
	switchData(dataSeries) {
		const transitionDuration = 2000;
		setTimeout(() => { 
			document.querySelector('.chart-subtitle').innerHTML = this.currentSeries + ' by age/year and income ventile<sup>†</sup> (' + 
			this.data.get(this.data.keys().next().value)['units'] + ')';
		}, transitionDuration);
		if (dataSeries !== this.currentSeries) { 
			this.currentSeries = dataSeries;
			this.data = this.fullData.get(this.currentSeries);
			if (this.bigPanel !== null) {
				const i = this.bigPanel;
				
				this.mouseOverlay.style('pointer-events', 'none');
				this.hideTooltip();
				this.close.attr('class', 'panel disabled').style('opacity','0').on('click', () => null).on('mousemove', () => null).on('mouseleave', () => null);
				
				//Fade out
				this.panels.get(i).transition().duration(transitionDuration).attr('opacity', '0');
				
				setTimeout(() => { 
					this.updateData();
					this.panels.get(this.bigPanel).transition().duration(transitionDuration).attr('opacity', '1');
				}, transitionDuration);
				
				setTimeout(() => { 
					this.mouseOverlay.style('pointer-events', 'all');
					this.close.transition().duration(0).style('opacity','0.65');
					this.close.attr('class', 'panel').on('click', () => this.restore20()).on('mousemove', (event) => this.updateTooltip(event)).on('mouseleave', () => this.hideTooltip());
				}, transitionDuration*2);
				
			}
			else {
				this.panels.forEach((entry, i) => {
					entry.attr('class', 'panel disabled');
				});
				for (let i=0; i < 20; i++) {
					this.panels.get(i).select('rect').style('opacity', '0');
					this.panels.get(i).select('rect').on('click', null);
					this.panels.get(i).select('rect').on('mousemove', null);
			
					//Move out to the sides
					const xPos = this.config.get(i).xPos;
					const yPos = this.config.get(i).yPos;
					const xDelta = xPos - this.config.get(10).xPos + this.panelWidth / 2;
					const yDelta = yPos - this.config.get(10).yPos + this.panelHeight / 2;
					
					//If left of expanded panel, shift left by xDelta
					//If same column, no shift; 
					//If right of expanded panel, shift to edge plus delta (adjust for panel width)
					const finalX = (xDelta < 0 ? xDelta - this.panelWidth / 2: (xDelta===0 ? xPos : this.width + xDelta - this.panelWidth / 2));
					const finalY = (yDelta < 0 ? yDelta - this.panelHeight / 2 : (yDelta===0 ? yPos : this.height + yDelta - this.panelHeight / 2));
					//console.log(i, xDelta, yDelta, finalX, finalY);
					
					this.panels.get(i).transition().duration(transitionDuration).attr("transform", `translate(${finalX},${finalY})`);
					
					setTimeout(() => { 
						this.updateData();
						this.restore20(); 
					}, transitionDuration);


				}
			/*for (let i=0; i < 20; i++) {
				this.elements.get(i)['p25']['line'].datum(this.data.get('p25')['data'][i].values).transition().duration(0).attr("d", this.line.get(i));
				this.elements.get(i)['median']['line'].datum(this.data.get('median')['data'][i].values).transition().duration(0).attr("d", this.line.get(i));
				this.elements.get(i)['p75']['line'].datum(this.data.get('p75')['data'][i].values).transition().duration(0).attr("d", this.line.get(i));
			}*/
			}
		}
	}
	
	handleClick(clickedPanel) {
		this.panels.forEach((entry, i) => {
			entry.attr('class', 'panel disabled');
		});
		const transitionDuration = 2000;
		for (let i = 0; i < 20; i++) {
			this.panels.get(i).select('rect').style('opacity', '0');
			this.panels.get(i).select('rect').on('click', null);
			this.panels.get(i).select('rect').on('mousemove', null);
			if (i===clickedPanel) { 
				this.panels.get(i).select('.ventile').transition().duration(transitionDuration)
					.attr("x", this.margins.left + (this.width / 2))
					.attr("y", this.height / 1.6)
					.style('font-size', '16em');
				this.scales.set(i, {x: d3.scaleLinear().range([this.width*0.025 + this.margins.left, this.width*0.975-this.margins.right]).domain([this.x.min,this.x.max]),
										y:d3.scaleLinear().range([this.height-this.margins.bottom, this.margins.top]).domain([this.config.get(i)['yMin'],this.config.get(i)['yMax']])});
				this.panels.get(i).transition().duration(transitionDuration).attr("transform", `translate(0,0)`)
				const xAxis = d3.axisBottom(this.scales.get(i)['x']).ticks(18).tickFormat(d => 55 + (d - this.x.min));
				const yAxis = d3.axisLeft(this.scales.get(i)['y']).ticks(3);
				const xAxisGroup = this.panels.get(i).select(".x-axis");
				const yAxisGroup = this.panels.get(i).select(".y-axis");
				yAxisGroup.transition().duration(transitionDuration).call(yAxis).on("start", function(){ yAxisGroup.select("path").remove();});
				xAxisGroup.transition().duration(transitionDuration).call(xAxis).attr("transform", `translate(0,${this.height-this.margins.bottom})`).on("start", function(){ xAxisGroup.select("path").remove();});
				
				this.line.set(i, d3.line()
					.x(d => this.scales.get(i).x(d.x))
					.y(d => this.scales.get(i).y(d.y)));
				
				this.panels.get(i).selectAll('.data-line').transition().duration(transitionDuration).attr("d", this.line.get(i));
				
				this.panels.get(i).select(".grid").selectAll('.y-grid').transition().duration(transitionDuration)
					.attr("x1", this.margins.left)
					.attr("x2", this.width - this.margins.right)
					.attr("y1", d => this.scales.get(i).y(d))
					.attr("y2", d => this.scales.get(i).y(d));
			}
			else {
				const xPos = this.config.get(i).xPos;
				const yPos = this.config.get(i).yPos;
				const xDelta = xPos - this.config.get(clickedPanel).xPos;
				const yDelta = yPos - this.config.get(clickedPanel).yPos;
				
				//If left of expanded panel, shift left by xDelta
				//If same column, no shift; 
				//If right of expanded panel, shift to edge plus delta (adjust for panel width)
				const finalX = (xDelta < 0 ? xDelta : (xDelta===0 ? xPos : this.width + xDelta - this.panelWidth));
				const finalY = (yDelta < 0 ? yDelta : (yDelta===0 ? yPos : this.height + yDelta - this.panelHeight));
				
				this.panels.get(i).transition().duration(transitionDuration).attr("transform", `translate(${finalX},${finalY})`);

			}

			this.bigPanel = clickedPanel;
			setTimeout(() => {
				this.mouseOverlay.style('pointer-events', 'all');
				}, transitionDuration);
		}
		this.close.transition().delay(transitionDuration).duration(0).style('opacity','0.65');
		setTimeout(() => {
			this.close.on('click', () => this.restore20()).on('mousemove', (event) => this.updateTooltip(event)).on('mouseleave', () => this.hideTooltip());
		}, transitionDuration);
		
		this.close.raise();
		this.chartArea.raise();
	}
	restore20() {
		const transitionDuration = 2000;
		this.mouseOverlay.style('pointer-events', 'none');
		this.hideTooltip();
		for (let i = 0; i < 20; i++) {
		
			setTimeout(() => {
				this.panels.get(i).select('rect')
					.on('click', () => this.handleClick(i))
					.on('mousemove', function (d, i) {d3.select(this).style('opacity', '0.2')});
				this.panels.get(i).attr('class', 'panel');
				}, transitionDuration);
			if (i === this.bigPanel) {
				//Reverse transitions
				this.panels.get(i).select('.ventile').transition().duration(transitionDuration)
					.attr("x", this.margins.left + (this.panelWidth-this.margins.left-this.margins.right) / 2)
					.attr("y", this.panelHeight / 1.4)
					.style('font-size', '4em');
				this.scales.set(i, {x: d3.scaleLinear().range([this.panelWidth*0.025 + this.margins.left, this.panelWidth*0.975-this.margins.right]).domain([this.x.min,this.x.max]),
								y:d3.scaleLinear().range([this.panelHeight-this.margins.bottom, this.margins.top]).domain([this.config.get(i)['yMin'],this.config.get(i)['yMax']])});
				this.panels.get(i).transition().duration(transitionDuration).attr("transform", `translate(${this.config.get(i)['xPos']},${this.config.get(i)['yPos']})`)
				const xAxis = d3.axisBottom(this.scales.get(i)['x']).tickValues([2000,2017]).tickFormat(d => 55 + (d - this.x.min));
				const yAxis = d3.axisLeft(this.scales.get(i)['y']).ticks(3);
				const xAxisGroup = this.panels.get(i).select(".x-axis");
				const yAxisGroup = this.panels.get(i).select(".y-axis");
				yAxisGroup.transition().duration(transitionDuration).call(yAxis).on("start", function(){ yAxisGroup.select("path").remove();});
				xAxisGroup.transition().duration(transitionDuration).call(xAxis).attr("transform", `translate(0,${this.panelHeight-this.margins.bottom})`).on("start", function(){ xAxisGroup.select("path").remove();});
				
				this.line.set(i, d3.line()
					.x(d => this.scales.get(i).x(d.x))
					.y(d => this.scales.get(i).y(d.y)));
				
				this.panels.get(i).selectAll('.data-line').transition().duration(transitionDuration).attr("d", this.line.get(i));
				
				this.panels.get(i).select(".grid").selectAll('.y-grid').transition().duration(transitionDuration)
					.attr("x1", this.margins.left)
					.attr("x2", this.panelWidth - this.margins.right)
					.attr("y1", d => this.scales.get(i).y(d))
					.attr("y2", d => this.scales.get(i).y(d));
			}
			else { this.panels.get(i).transition().duration(transitionDuration).attr("transform", `translate(${this.config.get(i).xPos}, ${this.config.get(i).yPos})`); }
		}
		this.close.style('opacity','0').on('click', () => null);
		this.bigPanel = null;
	}
	
	updateTooltip(event) {
		if (this.bigPanel !== null) {
			const i = this.bigPanel;
			const tooltip = this.tooltip;
			const tooltipContent = this.tooltipContent;
			
			const [mouseX, mouseY] = d3.pointer(event);
	
			// Convert mouse X to data X value
			const xValue = this.scales.get(i).x.invert(mouseX);
			
			// Find nearest x (round to nearest integer)
			const nearestX = Math.round(xValue);
			
			// Clamp to data range
			const clampedX = Math.max(this.config.get(i).xMin, Math.min(this.config.get(i).xMax, nearestX));
			
			// Clear existing content
			tooltipContent.selectAll('*').remove();
			
			let yPos = 12;
			
			let xHeader;
			if (this.tooltipTitlePrefix.length > 0 ) { xHeader = this.tooltipTitlePrefix + ' ' + (clampedX - 1945) }
			else { xHeader = (clampedX - 1945) };
			//Add x value header
			tooltipContent.append('text')
				.attr('x', 0)
				.attr('y', yPos)
				.style('font-size', '13px')
				.style('font-weight', '600')
				.text(`${xHeader}`);
			
			// Add entries for each entry
			this.tooltipVars.forEach((path) => {
				const series = this.data.get(path)['data'][i];
				const dataPoint = series.values.find(d => d.x === clampedX);
				const value = dataPoint ? dataPoint.y : 0;
				
				yPos += 18; // Spacing between entries
				
				// Color line indicator
				tooltipContent.append('line')
					.attr('x1', 0)
					.attr('x2', 12)
					.attr('y1', yPos)
					.attr('y2', yPos)
					.style('stroke', this.data.get(path).color)
					.style('stroke-width', this.data.get(path).linewidth);
				
				// Label and value text
				tooltipContent.append('text')
					.attr('x', 17)
					.attr('y', yPos)
					.attr("dominant-baseline", "middle")
					.style('font-size', '12px')
					.text(`${this.data.get(path).name}: ${this.tooltipPrefix + value.toFixed(1)}`);

				// Update corresponding dot position
				const dotElement = this.elements.get(i)[path]['dot'];
				if (dotElement && dataPoint) {
					dotElement
						.attr('cx', this.scales.get(i).x(clampedX))
						.attr('cy', this.scales.get(i).y(dataPoint.y))
						.style('opacity', 1);
				}
				
				tooltip.style('opacity', 1);
			});
			
			// Position tooltip
			const tooltipBg = tooltip.select('.tooltip-bg');
			
			// Calculate tooltip dimensions
			const bbox = tooltipContent.node().getBBox();
			const padding = 8;
			const tooltipWidth = bbox.width + padding * 2;
			const tooltipHeight = bbox.height + padding * 2;
			
			// Position to avoid going off screen
			let tooltipX = mouseX + 25;
			let tooltipY = mouseY - tooltipHeight / 2;
			
			// Adjust if tooltip would go off right edge
			if (tooltipX + tooltipWidth > this.width) {
				tooltipX = mouseX - tooltipWidth;
			}
			
			// Adjust if tooltip would go off top/bottom
			if (tooltipY < 0) tooltipY = 5;
			if (tooltipY + tooltipHeight > this.height) {
				tooltipY = this.height - tooltipHeight - 5;
			}
			
			// Update tooltip position and background
			tooltip.attr('transform', `translate(${tooltipX}, ${tooltipY})`);
			tooltipBg
				.attr('width', tooltipWidth)
				.attr('height', tooltipHeight)
				.attr('x', -padding)
				.attr('y', -padding);
		}

	}

	hideTooltip() {
		this.tooltip.style('opacity', 0);
		
		// Hide all dots
		this.data.forEach((name, path) => {
			if (this.bigPanel !== null) { 
				const dotElement = this.elements.get(this.bigPanel)[path]['dot']; 
				if (dotElement) { dotElement.style('opacity', 0); }
			}
			
		});
	}
}