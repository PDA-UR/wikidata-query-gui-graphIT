var wikibase = window.wikibase || {};
wikibase.queryService = wikibase.queryService || {};
wikibase.queryService.ui = wikibase.queryService.ui || {};
wikibase.queryService.ui.resultBrowser = wikibase.queryService.ui.resultBrowser || {};
window.mediaWiki = window.mediaWiki || {};

wikibase.queryService.ui.resultBrowser.ReScatterChartResultBrowser = ( function ( dimple ) {
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
		this._chartColors = ["#9FE586", "#F0A8AF"];
		console.log("hi", this._dataColumns, this._chartColors)
	}

	SELF.prototype = new PARENT();

	SELF.prototype._getPlotType = function () {
		return dimple.plot.scatter;
	};

	/**
	 * (custom) 
	 * To be used for the dimple color axis (see: https://github.com/PMSI-AlignAlytics/dimple/wiki/dimple.chart#addColorAxis)
	 * only works on 1 axis ( will just take the first defined one (x-axis) )
	 * @returns {string[]} an array of colors to distribute acros an axis
	 */
	SELF.prototype._getChartColors = function () {
		return ["#9FE586", "#F0A8AF"]
	}

	// Override the Parent-Method for drawing
	SELF.prototype._drawChart = function ( duration, noDataChange ) {
		var self = this;

		var chart = this._chart.draw( duration, noDataChange );

		// Rearrange the data
		var circles = self._svg.selectAll('.dimple-series-0');
		self._staggerStackedPoints(circles, chart, self);

		_.delay( function () {
			self._svg.selectAll( '.dimple-marker,.dimple-marker-back' ).attr( 'r', 2 );
		}, duration * 1.2 );
	};

	/** (Custom)
	 * Rearrange the nodes, that are staggered ((and not at "0,0") = WIP)
	 * @param {*} circles all svg circles elements of the chart
	 * @param {*} chart the dimple chart
	 */
	SELF.prototype._staggerStackedPoints = function (circles, chart, self) {
		
		// temp stores the position of the stacked nodes (x,y) and how many are in the stack
		var temp = []; // i.e.: [x, y, count]
		var stacked_nodes = []; // stores the svg for easy access

		/** Get the origin of the chart */
		const coordSystem = self._svg.select(".dimple-gridlines-group")[0][0] // = axis linges
		const originX = coordSystem.getBBox().x 
		const originY = coordSystem.getBBox().y

		const offsetY = coordSystem.getBBox().height + originY // calculate OriginY from svg height

		circles[0].forEach(c => {

			var x = d3.select(c).attr("cx");
			var y = d3.select(c).attr("cy");

			// Skip arrangement for nodes at origin and gray them out
			if (Math.round(parseInt(x)) == Math.round(parseInt(originX)) 
				&& Math.round(parseInt(y)) == Math.round(parseInt(offsetY)) ) {	
				d3.select(c).attr("style", "fill: rgb(196,196,196); stroke: rgb(255,255,255); fill-opacity:0.1; ");
				// return; 
				// BUG: rearranging the origin-node changes arrangements of other single nodes
			}

			if (temp.length == 0) {
				temp = [x, y, 0]; // init
			} else {
				// TODO: make better iteration (no repeats)

				// get idx + amount of obj with same x and y
				circles[0].forEach(c => {
					// check every circle for being in a stack
					var x2 = d3.select(c).attr("cx");
					var y2 = d3.select(c).attr("cy");
					if ( temp[0] == x2 && temp[1] == y2) {
						temp[2]++
						stacked_nodes.push(c); 
					}
				})

				// Rearrange the stacks in a circle
				let count = temp[2] 
				let i = 1
				// console.log("stacks", stacked_nodes.length)

				const nodeRadius = parseFloat(d3.select(c).attr("r"))
				const layers = (count - 3) / nodeRadius // how many layers the circle has
				console.log("layers", layers, "count", count, stacked_nodes.length)
				stacked_nodes.forEach((point) => {
					
					if(count == 2) { 
						/** Arrange the 2 nodes next to each other, like: (1)·(2) (· = original x,y) */
						let radius = parseFloat(d3.select(point).attr("r")) + 1; // 1 = offset
						let x = 0;
						if(i == 1) {
							x = Math.round(parseFloat(temp[0]) - radius);
						} else {
							x = Math.round(parseFloat(temp[0]) + radius);
						}

						d3.select(point).transition().duration(1000)
							.attr("cx", x );
						// BUG: on point gets changed to 862, but then shows up at 872 (when excluding nodes at "0,0")

					} else {
						/** Arrange the nodes in a circle around the original stack-center 
						 *  for Maths see answers to: https://stackoverflow.com/q/5300938 
						 */
						
						/** TODO: second layer
						 * If count > radius + 2 create a second layer 
						 * -> i.e split stacked nodes then double the radius
						 */

						let angle = i * ( Math.PI / (count/2) );
						// let angle = i * Math.sqrt(1)
						let radius = parseFloat(d3.select(point).attr("r"));
						
						if (count > 3) { // arrange around 1 circle in the middle
							radius = radius * 2;
							angle = i * ( Math.PI / ( (count-1) /2) ); // bc. first == center
							
							if (i == 1) { // puts the first circle in the center
								radius = 0;
							}

						} 

						let x =  parseFloat(temp[0]) + ( radius * Math.cos(angle) ); 
						let y =  parseFloat(temp[1]) + ( radius * Math.sin(angle) );  // NOTE: temp[0/1] = string 
						
						d3.select(point).transition().duration(1000)
							.attr("cx", x )
							.attr("cy", y );
					}
					i++
				})
				// console.log("idx", stacked_nodes)

				temp = [];
				stacked_nodes = [];
			}

		})

	}

	return SELF;
}( dimple ) );
