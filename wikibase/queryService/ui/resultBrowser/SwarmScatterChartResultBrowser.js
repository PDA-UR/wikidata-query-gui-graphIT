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

		// Rearrange the data
		var circles = self._svg.selectAll('.dimple-series-0');
		self._staggerStackedPointsNEW(circles, chart, self);


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
		var layer = 2;

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
						// console.log("idx", idx)
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
							radius = radius * layer;
							angle = i * ( Math.PI / ( (count-1) /2) ); // bc. first == center
							
							if (i == 1) { // puts the first circle in the center
								radius = 0;
							}

							// Layer stacked nodes (doesn't work ?? D:)
							else if (i > radius * 3) {
								console.log("next layer", nodeRadius)
								layer++
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
				i = 0
				temp = [];
				stacked_nodes = [];
			}

		})

	}

	// TRY WITH BETTER duplicate/stacks detection (not really working)
	// NOTE: when iterating over node once (like you should), it doesn't rotate right
		// BUT: if iterating over the nodes multiple times they rotate right???
	SELF.prototype._staggerStackedPointsNEW = function (data, chart, self) {
		
		// temp stores the position of the stacked nodes (x,y) and how many are in the stack
		var temp = []; // i.e.: [x, y, count]
		var stacked_nodes = []; // stores the svg for easy access
		var nodesAtOrigin = []

		/** Get the origin of the chart */
		const coordSystem = self._svg.select(".dimple-gridlines-group")[0][0] // = axis linges
		const originX = coordSystem.getBBox().x 
		const originY = coordSystem.getBBox().y

		const offsetY = coordSystem.getBBox().height + originY // calculate OriginY from svg height

		let circles = data[0]
		let has_stacks = false

		let stacks = []
		let checked_coords = []
		// [ [<circle>, <circle>], [...] + [[x,y], [x,y]]
		let i = 0;
		
		circles.forEach(current => {
			var x = d3.select(current).attr("cx");
			var y = d3.select(current).attr("cy");
			var id = d3.select(current).attr("id");

			// check if the coordinates have already been checked
			// if not -> check the array for stacks at the coordinates
			if(checked_coords.every((coords, idx) => {
				return coords.toString() != [x, y].toString()
			})) {
				checked_coords.push([x,y])
				stacks.push([]) // create new dimension
				// do the checking

				circles.forEach(next => {
					var nX = d3.select(next).attr("cx");
					var nY = d3.select(next).attr("cy");
					var nId = d3.select(next).attr("id");
					
					if (x === nX && y === nY ) {
						// found duplicate
						stacks[i].push(next)
						
					}
				})

				i++
			} 

		})
		// console.log("checked", checked_coords) // works
		// console.log("stacks", stacks)

		stacks.forEach(stack => {
			
			// rearrange every stack
			this._arrangeStack(stack, self)

		})

		// circles.forEach(c => {

		// 	var x = parseFloat(d3.select(c).attr("cx"));
		// 	var y = parseFloat(d3.select(c).attr("cy"));

		// 	// Skip arrangement for nodes at origin and gray them out
		// 	// DOESTN'T WORK HERE ??
		// 	// console.log(Math.round(parseInt(x)) - Math.round(originX))
		// 	if ( Math.round(parseInt(x)) - Math.round(originX) < 2 
		// 		&& Math.round(parseInt(y) - Math.round(offsetY < 2))) { // to account for drift

		// 	// if (Math.round(parseInt(x)) == Math.round(parseInt(originX)) 
		// 	// 	&& Math.round(parseInt(y)) == Math.round(parseInt(offsetY)) ) {	
		// 			//console.log("at origin")
		// 			d3.select(c).attr("style", "fill: rgb(196,196,196); stroke: rgb(255,255,255); fill-opacity:0.1; ");
		// 		// return; 
		// 		// BUG: rearranging the origin-node changes arrangements of other single nodes
		// 	}

			
		// 	circles.forEach((c2, idx2) => {
		// 		// console.log(idx)
		// 		// check every circle for being in a stack
		// 		var x2 = parseFloat(d3.select(c2).attr("cx"));
		// 		var y2 = parseFloat(d3.select(c2).attr("cy"));
		// 		if ( x == x2 && y == y2 && c !== c2) {
		// 			stacked_nodes.push(c2); 
		// 			circles.splice(idx2, 1)
		// 			has_stacks = true
		// 		}
		// 	})

		// 	if (has_stacks) { // add first as well
		// 		stacked_nodes.push(c)
		// 		// console.log("add 1st")
		// 	}
		// 	// console.log(stacked_nodes.length , circles.length)
		// 	console.log("stacks", stacked_nodes)
		// 	// there are two arrays for 0,0

		// 	// this._arrangeCircle(stacked_nodes)

		// 	stacked_nodes = []
		// })
		

	}

	// TODO
	SELF.prototype._arrangeStack = function(stack, self) {

		// TODO: handle 0,0

		const count = stack.length
		let rest = count // init
		// console.log("has", count, "nodes")

		if(count == 1) {
			return; // Don't arrange single nodes, i.e. not stacks
		}

		const radius = parseFloat(d3.select(stack[0]).attr("r")); // same for all nodes
		const origX = d3.select(stack[0]).attr("cx");
		const origY = d3.select(stack[0]).attr("cy");

		/** Get the origin of the chart (0,0) */
		const coordSystem = self._svg.select(".dimple-gridlines-group")[0][0] // = axis lines
		const originX = coordSystem.getBBox().x 
		const originY = coordSystem.getBBox().y
		const offsetY = coordSystem.getBBox().height + originY // calculate OriginY from svg height


		
		let layerIdx = 1;
		let currentLayer = 2; // 1 = middle

		// const threshold = 3; // needs at least 3 extra nodes to make a new layer
		let layerTreshold = radius; // init

		console.log("REARRANGE", count, "NODES");

		const nodesPerLayer = radius + 1;
		let nodeOverflow = 3; // how many nodes to push into layer before opening a new one
		let isLastLayer = false;
		let threshold = (nodesPerLayer * (currentLayer - 1)) + nodeOverflow;

		stack.forEach((node, idx) => {

			/** Skip arrangement for nodes at origin and gray them out */
			if (Math.round(parseInt(origX)) == Math.round(parseInt(originX)) 
				&& Math.round(parseInt(origY)) == Math.round(parseInt(offsetY)) ) {	
				// d3.select(node).attr("style", "fill: rgb(196,196,196); stroke: rgb(255,255,255); fill-opacity:0.1; ");
				// return; 
				// BUG: rearranging the origin-node changes arrangements of other single nodes
			}


			/** Arrange the 2 nodes next to each other, like: (1)·(2) (· = original x,y) */
			if(count == 2) { 
				// let radius = parseFloat(d3.select(point).attr("r")) + 1; // 1 = offset
				let offset = radius + 1
				let x = 0;
				if(idx == 0) {
					x = Math.round(parseFloat(origX) - offset);
				} else {
					x = Math.round(parseFloat(origX) + offset);
				}
				// place node
				d3.select(node).transition().duration(1000)
					.attr("cx", x );
				
			} else {
				/** Arrange the nodes in a circle around a center node */
				let offset = radius*2

				// default node count == 5 (nodesPerLayer) per layer
				let nodeCount = nodesPerLayer * (currentLayer-1) // + nodeOverflow; // skip first node/layer == middle

				/** Skip the first node -> it's the center */
				if(idx == 0) {
					offset = 0 // center node
					layerIdx = 0; // reset to zero bc. of iterative ++ at bottom
					rest--; 

					// check if there's only enough nodes for 1 more layer after middle
					if(rest < nodesPerLayer) {
						isLastLayer = true
					}
					console.log(`[center]: ${idx} => in layer 0, at position ${layerIdx}`)
				} else {

						// Check if there is enough nodes to fill a layer & has more than threshold nodes
							// YES: enough nodes + more than threshold
								// Fill the layer + create new one after layerIdx = nodeCount
							// NO: enough nodes BUT not MORE than threshold
								// Fill the layer + spread the nodes
							// NO: not enough nodes = last layer 

	 
					// Check if there are enough nodes to warrant a new layer
					if ( rest > threshold ) {

						// After the last node in a layer has been created, init the next layer
						if (layerIdx > nodeCount) {
							// create a new layer
							currentLayer++;
							rest -= layerIdx;
							rest++; // HACK: otherwise eats a node
							layerIdx = 1;
							nodeCount = (nodesPerLayer * (currentLayer - 1))
							threshold = nodeCount + nodeOverflow;
							console.log("next layer needs at least", nodeOverflow, "nodes to be filled: HAS", rest)
							if (rest < threshold) {
								console.log("not enough nodes to create another new layer")
								console.log("will create the last layer for the remaining",rest, "nodes")
							} else {
								console.log("will create the new layer for max. of", nodeCount, "nodes")
							}
						}
					} 
					
					// If there are not enough nodes to warrant creating a new layer, spread the rest out
					if (rest < threshold) {
						nodeCount = rest;
					}
					
					


					// if ( rest < nodeOverflow || isLastLayer ) { 
					// 	nodeCount = rest;
					// // Check if the layer has been filled with nodes
					// } else if( layerIdx > nodeCount ) { // i.e. no more space in the layer
					// 	// make a new layer and arrange the nodes accordingly
					// 	currentLayer++;
					// 	rest -= layerIdx; // - 1;
					// 	layerIdx = 1;
						
					// 	nodeCount = (nodesPerLayer * (currentLayer - 1))
					// 	// recalculate the threschold for the next layer after this one
					// 	threshold = nodeCount + nodeOverflow;
					// 	console.log("next layer needs", threshold, "nodes to be filled: HAS", rest)

					// 	// Check if the next layer can be filled, otherwise this is the last layer
					// 	if (rest < threshold) {
					// 		console.log("can't do that -> last layer is", currentLayer, "with", rest, "and count", nodeCount)
					// 		isLastLayer = true;
					// 		nodeCount = rest;
					// 		//currentLayer--; // go back
					// 	}

					// }

					// WORKING
					// // check for layers
					// // if current layer is the LAST layer -> spread out the rest of nodes evenly
					// if(isLastLayer) {
					// 	nodeCount = rest; 
					// }

					// // if current layer not LAST layer
					// else if (layerIdx > threshold) {
					// 	rest -= threshold; //?? - layerIdx

					// 	// check if there is actually enough for another layer
					// 	// NOTE: check should happen in the upper else if, but doesnt -> FIX
					// 	if (rest >= nodeOverflow) {
					// 		currentLayer++;
					// 		layerIdx = 1; // reset for every layer
					// 		// layerTreshold += radius;

					// 		// recalculate the threshold for the new layer
					// 		threshold = (nodesPerLayer * (currentLayer - 1))// + nodeOverflow; // recalc next threshold for new layer

					// 		console.log("next layer needs", threshold, "nodes to be filled: HAS", rest)

							
					// 		// if rest of the nodes, can't fill up the next layer -> this is the last one
					// 		if (rest < threshold) {
					// 			console.log("can't do that -> last layer is", currentLayer, "with", rest)
					// 			isLastLayer = true
					// 			//currentLayer--; // go back
					// 		}

					// 	} else {
					// 		isLastLayer = true
					// 		console.log("no new layer, it'll look stupid")
					// 	}
					// }
				
					offset = offset * (currentLayer-1); // seems to work (mostly)

					// arrange circles of 1 layer in a circle
					console.log(`${idx} => in layer ${currentLayer}, at position ${layerIdx}, with offset ${offset}`)
				}

				// spacing isn't quite right on layers after 2
				let angle = (2 * Math.PI / (nodeCount)) * (layerIdx)
				let x =  parseFloat(origX) + ( offset * Math.cos(angle) ); 
				let y =  parseFloat(origY) + ( offset * Math.sin(angle) );
				
				// console.log(`original (${origX}|${origY}) --> (${x}|${y})`)

				// place nodes
				d3.select(node).transition().duration(1000)
					.attr("cx", x )
					.attr("cy", y );

				layerIdx++
				// console.log(idx, "with offset of", offset)
			}
		});
	}




	// OLD
	SELF.prototype._arrangeCircle = function (nodes) {
		let count = nodes.length
		let i = 1

		let radius = 5 // default radius
		let layer = 2

		// if i > radius + 3 layer++ radius * layer
		// const layers = (count - 3) / 5 // how many layers the circle has
		// console.log("layers", Math.floor(layer), "count", count, nodes.length)

		console.log("c", count)
		nodes.forEach((point, idx) => {

			var origX = d3.select(point).attr("cx");
			var origY = d3.select(point).attr("cy");
			
			if(count == 2) { 
				/** Arrange the 2 nodes next to each other, like: (1)·(2) (· = original x,y) */
				let radius = parseFloat(d3.select(point).attr("r")) + 1; // 1 = offset
				let x = 0;
				if(idx == 0) {
					x = Math.round(parseFloat(origX) - radius);
				} else {
					x = Math.round(parseFloat(origX) + radius);
				}

				d3.select(point).transition().duration(1000)
					.attr("cx", x );
				// BUG: on point gets changed to 862, but then shows up at 872 (when excluding nodes at "0,0")

			} else {
				// let angle = (idx+1) * ( Math.PI / count );
				// let angle = (2 * Math.PI / count) * (idx+1)
				let slice = 2 * Math.PI / (count-1);
				let angle = slice * (idx+1)
				// let angle = (idx+1) * Math.sqrt(1)
				// let radius = parseFloat(d3.select(point).attr("r"));
				
				if (count > 3) { // arrange around 1 circle in the middle
					if (idx == 0) { // puts the first circle in the center
						radius = 0;
					} else {
						radius = radius * layer;
					}

					// radius = radius * layer; // * layer ; // radius * 2
					// angle = i * ( Math.PI / ( (count-1) /2) ); // bc. first == center
					angle = (2 * Math.PI / (count-1)) * (idx+1)
					// console.log("angle", angle)

					if (idx > radius + 3) {
						console.log("next layer")
						layer++
					}

					// check layers
					// console.log("L", layer, radius)

				} 
				let x =  parseFloat(origX) + ( radius * Math.cos(angle) ); 
				let y =  parseFloat(origY) + ( radius * Math.sin(angle) );  // NOTE: temp[0/1] = string 
				
				d3.select(point).transition().duration(1000)
					.attr("cx", x )
					.attr("cy", y );
			}
			// console.log("i", i)
			i++
		})
	}

	return SELF;
}( dimple ) );
