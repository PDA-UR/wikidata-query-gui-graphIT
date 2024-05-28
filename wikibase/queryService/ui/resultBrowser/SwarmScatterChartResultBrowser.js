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
		console.log("created chart", chart)

		// Rearrange the data
		var circles = self._svg.selectAll('.dimple-series-0');
		self._staggerStackedPoints(circles, self);


		_.delay( function () {
			self._svg.selectAll( '.dimple-marker,.dimple-marker-back' ).attr( 'r', 2 );
		}, duration * 1.2 );
	};

	/**
	 * (Custom)
	 * Search for stackes, i.e. nodes at the same coordinates to rearrange
	 * @param {Array} data -> Array of the svg-dimple poinst: <circle> 
	 * @param {*} self 
	 */
	SELF.prototype._staggerStackedPoints = function (data, self) {

		let circles = data[0]

		let stacks = []; // the references to the svg-elements that are stacks
		let checked_coords = []; // the coordinates that have already been checked for duplicates
		// [ [<circle>, <circle>], [...]] + [[x,y], [x,y]]
		let i = 0;
		
		circles.forEach(current => {
			var x = d3.select(current).attr("cx");
			var y = d3.select(current).attr("cy");
			// var id = d3.select(current).attr("id");

			// check if the coordinates have already been checked
			if(checked_coords.every((coords, idx) => {
				return coords.toString() != [x, y].toString()
			})) {
				// if not -> check the array for stacks at the coordinates
				checked_coords.push([x,y])
				stacks.push([]) // create new dimension
				
				// check for duplicates
				circles.forEach(next => {
					var nX = d3.select(next).attr("cx");
					var nY = d3.select(next).attr("cy");
					// var nId = d3.select(next).attr("id");
					
					if (x === nX && y === nY ) {
						// found duplicate
						stacks[i].push(next)
					}
				})
				i++;
			} 

		})

		// REARRANGE THE STACKS
		stacks.forEach(stack => {
			this._arrangeStack(stack, self)
		})

	}

	/**
	 * (Custom)
	 * Arrange stacked nodes.
	 * 	- 2  nodes are arranged next to each other.
	 * 	- 2+ nodes are arranged in a layered circle.
	 *  Every layer has a default amount of nodes (=nodesPerLayer):
	 * 		-> currently set to 6
	 *  	If a layer is full a new one will be created. BUT...
	 *  A layer needs to contain a minimum amount of notes to be created (=nodeOverflow):
	 * 		If there are less nodes left, they will be "squished" into the current layer.
	 * 		If there are more nodes left, a new layer will be created.
	 * 		-> currently set to 3, as 2 aren't really recognizable as a circle by themselfs
	 *  Nodes at the diagrams origin get styled differently.
	 * @param {*} stack 
	 * @param {*} self 
	 */
	SELF.prototype._arrangeStack = function(stack, self) {

		// init
		const count = stack.length;
		let rest = count;

		if(count == 1) {
			return; // Don't arrange single nodes, i.e. not stacks
		}

		// Get the original position of the stacks
		const radius = parseFloat(d3.select(stack[0]).attr("r")); // same for all nodes
		const origX = d3.select(stack[0]).attr("cx");
		const origY = d3.select(stack[0]).attr("cy");

		// Get the origin of the chart (0,0)
		const coordSystem = self._svg.select(".dimple-gridlines-group")[0][0] // = axis lines
		const originX = coordSystem.getBBox().x 
		const originY = coordSystem.getBBox().y
		const offsetY = coordSystem.getBBox().height + originY // calculate OriginY from svg height
		
		// Init the middle of the circle
		let layerIdx = 0;
		let currentLayer = 1;

		// console.log("REARRANGE", count, "NODES");

		const nodesPerLayer = 6; // how many nodes to usually put into a layer
		let nodeOverflow = 3; // how many nodes to at least have in a layer (i.e. have at least 3 nodes in a layer so a cirlce is recognizable)
		let threshold = (nodesPerLayer * (currentLayer)) + nodeOverflow; // how many nodes before a new layer is created

		stack.forEach((node, idx) => {

			/** Skip arrangement for nodes at origin and gray them out */
			if (Math.round(parseInt(origX)) == Math.round(parseInt(originX)) 
				&& Math.round(parseInt(origY)) == Math.round(parseInt(offsetY)) ) {	
				d3.select(node).attr("style", "fill: rgb(196,196,196); stroke: rgb(196,196,196); fill-opacity:0.5; ");
				// return; 
			}


			/** Arrange the 2 nodes next to each other, like: (1)·(2) (· = original x,y) */
			if(count == 2) { 

				let offset = radius + 1;
				let x = 0;
				if(idx == 0) {
					x = Math.round(parseFloat(origX) - offset);
				} else {
					x = Math.round(parseFloat(origX) + offset);
				}
				// place nodes next to each other
				d3.select(node).transition().duration(1000)
					.attr("cx", x );
				
			} else {
				/** Arrange the nodes in a circle around a center node 
				 *  For the math of a 1 layered circle arrangment see answers to: https://stackoverflow.com/q/5300938 
				*/

				let offset = radius*2; // diameter
				let nodeCount = nodesPerLayer * (currentLayer); // + nodeOverflow; // skip first node/layer == middle

				/** Skip the first node -> it's the center */
				if(idx == 0) {
					offset = 0 // center node in the middle
					rest--; 

					console.log(`${idx} => in layer 0, at position ${layerIdx} = [center]`)
				} else {
					/** Arrange the rest of the nodes */

					// Check if there are enough nodes to warrant a new layer
					if ( rest >= threshold ) {

						// create a new layer, if layerIdx maxed out the nodeCount
						if (layerIdx > nodeCount) {
							rest -= layerIdx;
							rest++; // so it doesn't skip the first node
							currentLayer++;
							layerIdx = 1;

							// recalculate nodeCount and threshold for the node currently processed
							nodeCount = (nodesPerLayer * (currentLayer))
							threshold = nodeCount + nodeOverflow;
							// console.log("will create the new layer of max.", nodeCount, "nodes for", rest)
						}
					} 
					
					// If there are not enough nodes to warrant creating a new layer, spread the rest out
					if (rest < threshold) {
						nodeCount = rest;
					}
					
					offset = offset * (currentLayer);
					// console.log(`${idx} => in layer ${currentLayer}, at position ${layerIdx}, with offset ${offset}`)
				}

				let angle = (2 * Math.PI / (nodeCount)) * (layerIdx);
				let x =  parseFloat(origX) + ( offset * Math.cos(angle) ); 
				let y =  parseFloat(origY) + ( offset * Math.sin(angle) );

				// place nodes (with animation)
				d3.select(node).transition().duration(1000)
					.attr("cx", x )
					.attr("cy", y );

				layerIdx++; 
				// console.log(idx, "with offset of", offset)
			}
		});
	}
	

	return SELF;
}( dimple ) );
