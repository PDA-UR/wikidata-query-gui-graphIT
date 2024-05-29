var wikibase = window.wikibase || {};
wikibase.queryService = wikibase.queryService || {};
wikibase.queryService.ui = wikibase.queryService.ui || {};
wikibase.queryService.ui.resultBrowser = wikibase.queryService.ui.resultBrowser || {};
window.mediaWiki = window.mediaWiki || {};

wikibase.queryService.ui.resultBrowser.SwarmScatterChartResultBrowser = ( function ( dimple ) {
	'use strict';

	var PARENT = wikibase.queryService.ui.resultBrowser.AbstractDimpleChartResultBrowser;

	/**
	 * A scatter chart, that rearranges stacked patterns in a circular manner
     * Based on: (see below)
	 *
	 * @class wikibase.queryService.ui.resultBrowser.ScatterChartResultBrowser
	 * @license GNU GPL v2+
	 *
	 * @author Jonas Kress
	 *
	 * @constructor
	 */
	function SELF() {
		this._dataColumns = {};
	}

	SELF.prototype = new PARENT();

	SELF.prototype._getPlotType = function () {
		return dimple.plot.scatter;
	};

	// Override the Parent-Method for drawing
	SELF.prototype._drawChart = function ( duration, noDataChange ) {
		var self = this;

		self._mapCoordinatesToColor(this._chart)

		this._chart.draw( duration, noDataChange );

		var circles = self._svg.selectAll('.dimple-series-0');
		self._staggerStackedPoints(circles, self);

		_.delay( function () {
			self._svg.selectAll( '.dimple-marker,.dimple-marker-back' ).attr( 'r', 2 );
		}, duration * 1.2 );
	};

	/**
	 * (custom)
	 * Assign custom (RGB)colors to the chart data.
	 * Handeled separately,
	 * 		as the dimple color axis doesn't work with the legend (see: https://stackoverflow.com/a/33097394)
	 * 		and assigning the colors when rearranging the nodes, doesn't change the color of the corresponding legend elements.
	 * 
	 * @param {*} chart the dimple chart element
	 */
	SELF.prototype._mapCoordinatesToColor = function (chart) {
		
		// Get the boundaries of the chart coordinate system (actual order doesn't really matter)
		const xKey = chart.axes[0].measure;
		const yKey = chart.axes[1].measure;

		let xArr = chart.data.map((point) => { return point[xKey] })
		let yArr = chart.data.map((point) => { return point[yKey] })
		let xMax = Math.max(...xArr);
		let yMax = Math.max(...yArr);

		const labelKey = Object.keys(chart.data[0]).filter(key => /Label/.test(key));

	
		chart.data.forEach(point => {
			const x = parseInt(Object.values(point)[0]);
			const y = parseInt(Object.values(point)[1]);
			
			// MAP r,g values between 0 and 255 (see: https://stackoverflow.com/a/10756409)
			// & subtract from 255 to get lighter colors for smaller values
			const r = 255 - (x * 255 / xMax);
			const g = 255 - (y * 255 / yMax);

			// clamp the values to be between 0 and 255 (see: https://www.geeksforgeeks.org/how-to-limit-a-number-between-a-min-max-value-in-javascript/)
			const clampR = Math.min(255, Math.max(0, r) );
			const clampG = Math.min(255, Math.max(0, g) );

			chart.assignColor(point[labelKey], `rgb(${clampR}, ${clampG}, 100)`)
		});

	}

	/**
	 * (custom)
	 * Search for stackes, i.e. nodes at the same coordinates to rearrange.
	 * 
	 * @param {Array} data -> Array of the svg-dimple points: <circle> 
	 * @param {*} self 
	 */
	SELF.prototype._staggerStackedPoints = function (data, self) {

		let circles = data[0];

		let stacks = [];
		let checked_coords = []; 
		let i = 0;
		
		circles.forEach(current => {
			var x = d3.select(current).attr("cx");
			var y = d3.select(current).attr("cy");

			if(checked_coords.every(coords => {
				return coords.toString() != [x, y].toString();
			})) {
		
				checked_coords.push([x,y]);
				stacks.push([]);
				
				// check for duplicates
				circles.forEach(next => {
					var nX = d3.select(next).attr("cx");
					var nY = d3.select(next).attr("cy");
					
					if (x === nX && y === nY ) {
						stacks[i].push(next);
					}
				})
				i++;
			} 

		});

		stacks.forEach(stack => {
			this._arrangeStack(stack, self)
		})

	}

	/**
	 * (custom)
	 * Arrange stacked nodes (in a layered circle).
	 * Every layer has a default amount of nodes (=nodesPerLayer).
	 * A layer needs to contain a minimum amount of notes to be created (=nodeOverflow):
	 * 		If there are less nodes left, they will be "squished" into the current layer.
	 * 		(Currently set to 3, as 2 aren't really recognizable as a circle by themselves.)
	 * 
	 * @param {Array} stack Array of <circle> elements
	 * @param {*} self 
	 */
	SELF.prototype._arrangeStack = function(stack, self) {

		const count = stack.length;
		let rest = count;

		if(count == 1) {
			return;
		}

		const radius = parseFloat(d3.select(stack[0]).attr("r")); // same for all nodes
		const stackX = d3.select(stack[0]).attr("cx");
		const stackY = d3.select(stack[0]).attr("cy");

		// Get the origin of the chart (0,0)
		const coordSystem = self._svg.select(".dimple-gridlines-group")[0][0]; // = axis lines
		const originX = coordSystem.getBBox().x; 
		const originY = coordSystem.getBBox().y;
		const offsetY = coordSystem.getBBox().height + originY; // calculate OriginY from svg height
		
		// Init the middle of the circle
		let layerIdx = 0;
		let currentLayer = 1;

		const nodesPerLayer = 6;
		let nodeOverflow = 3;
		let threshold = (nodesPerLayer * (currentLayer)) + nodeOverflow; 

		stack.forEach((node, idx) => {

			/** Skip arrangement for nodes at origin and gray them out */
			if (Math.round(parseInt(stackX)) == Math.round(parseInt(originX)) 
				&& Math.round(parseInt(stackY)) == Math.round(parseInt(offsetY)) ) {	
				// d3.select(node).attr("style", "fill: rgb(196,196,196); stroke: rgb(196,196,196); fill-opacity:0.5; ");
				d3.select(node).attr("style", "fill: rgb(196,196,196); fill-opacity:0.5; ");
				// return; 
			}


			if(count == 2) {
				const x = this._arrangeTwoNodes(radius, idx, stackX);
				d3.select(node).transition().duration(1000)
					.attr("cx", x );
				
			} else {
				/** Arrange the nodes in a circle around a center node 
				 *  For the math of a 1 layered circle arrangment see answers to: https://stackoverflow.com/q/5300938 
				*/

				let offset = radius * 2;
				let nodeCount = nodesPerLayer * (currentLayer);

				if(idx == 0) { // Handle the center node
					offset = 0;
					rest--; 
				} else {
					// Check if there are enough nodes to warrant a new layer
					if ( rest >= threshold ) {

						if (layerIdx > nodeCount) {
							rest -= layerIdx;
							rest++; // so it doesn't skip a node
							currentLayer++;
							layerIdx = 1;

							nodeCount = (nodesPerLayer * (currentLayer));
							threshold = nodeCount + nodeOverflow;
						}
					} 
					
					// If there are not enough nodes to warrant creating a new layer, spread the rest out
					if (rest < threshold) {
						nodeCount = rest;
					}
					
					offset = offset * (currentLayer);
				}

				let angle = (2 * Math.PI / (nodeCount)) * (layerIdx);
				let x =  parseFloat(stackX) + ( offset * Math.cos(angle) ); 
				let y =  parseFloat(stackY) + ( offset * Math.sin(angle) );

				d3.select(node).transition().duration(1000)
					.attr("cx", x )
					.attr("cy", y );

				layerIdx++; 
			}
		});
	}

	/**
	 * Arrange 2 nodes next to each other, like: (1)·(2) (· = original x,y)
	 * 
	 * @param {number} radius of the nodes
	 * @param {number} idx of the currently processed node
	 * @param {string} stackX the x coordinate of the stack
	 * @returns new x coordinate of the node
	 */
	SELF.prototype._arrangeTwoNodes = function (radius, idx, stackX) {
		let offset = radius + 1;
		let x = 0;
		if(idx == 0) {
			x = Math.round(parseFloat(stackX) - offset);
		} else {
			x = Math.round(parseFloat(stackX) + offset);
		}
		return x;
	}	

	return SELF;
}( dimple ) );
