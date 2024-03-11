var wikibase = window.wikibase || {};
wikibase.queryService = wikibase.queryService || {};
wikibase.queryService.ui = wikibase.queryService.ui || {};
wikibase.queryService.ui.resultBrowser = wikibase.queryService.ui.resultBrowser || {};

wikibase.queryService.ui.resultBrowser.GraphResultBrowser = ( function ( $, vis, window, _ ) {
	'use strict';

	var GRAPH_OPTIONS = {
		autoResize: true,
		physics: {
			stabilization: {
				enabled: true,
				iterations: 10,
				fit: true
			},
			barnesHut: {
				springLength: 150,
				centralGravity: 0.5,
				damping: 0.2,
				avoidOverlap: 0.1
			}
		},
		nodes: {
			shadow: true,
			color: '#fff'
		},
		edges: {
			arrows: {
				to: true
			}
		}
	};

	var EXPAND_TYPE_INCOMING = 'incoming';

	var EXPAND_TYPE_OUTGOING = 'outgoing';

	/**
	 * A graph result browser
	 *
	 * @class wikibase.queryService.ui.resultBrowser.GraphResultBrowser
	 * @licence GNU GPL v2+
	 *
	 * @author Jonas Kress
	 * @constructor
	 *
	 */
	function SELF() {
	}

	SELF.prototype = new wikibase.queryService.ui.resultBrowser.AbstractResultBrowser();

	/**
	 * Draw to the given element
	 *
	 * @param {jQuery} $element target element
	 */
	SELF.prototype.draw = function ( $element ) {
		var $container = $( '<div>' ).height( '100vh' ); // for result
		// only for embed.html
		if ( $( '#expand-type-switch' ).length !== 0 ) {
			$container = $( '<div>' ).height( '100vh' );
			$( '.expand-type' ).show();
			$( '#expand-type-switch' ).bootstrapToggle( {
				on: 'Incoming',
				off: 'Outgoing'
			} );
		}

		// INFO: used to set attributes using comments such as:
		// #set:item;rgb=F68C13;shape=star
		var settings = {}; 
		var $codeLines = document.getElementsByClassName('CodeMirror-line'); // class="CodeMirror-line"
		for(const line of $codeLines) {
			if( /(#set:)/g.test(line.outerText) ) {
				const arr = line.outerText.split( /[:;]/ );
				var group = {};
				for ( let i = 2; i < arr.length; i++ ) { // skipt [set,<name>] of array
					const pair = arr[i].split("=");
					group[pair[0]] = pair[1];
				}
				settings[arr[1]] = group; // set <name> as key
			}
		} // settings used in this._getData() to customize the nodes

		var data = this._getData(settings);
		var network = new vis.Network( $container[0], data, GRAPH_OPTIONS );

		network.on( 'doubleClick', function ( properties ) {
			if ( properties.nodes.length === 1 ) {
				window.open( properties.nodes[0], '_blank' );
			}
		} );

		var nodeBrowser = new wikibase.queryService.ui.resultBrowser.GraphResultBrowserNodeBrowser( data.nodes, data.edges, this.getSparqlApi() );
		network.on( 'click', function ( properties ) {
			var nodeId = properties.nodes[0] || null;
			if ( $( '#expand-type-switch' ).is( ':checked' ) ) {
				nodeBrowser.browse( nodeId, EXPAND_TYPE_INCOMING );
			} else {
				nodeBrowser.browse( nodeId, EXPAND_TYPE_OUTGOING );
			}
		} );

		$container.prepend( this._createToolbar( network ) );
		$element.append( $container );
	};

	/**
	 * @private
	 */
	SELF.prototype._createToolbar = function ( network ) {
		var $toolbar = $( '<div id="layout-options">' );

		function setLayout( type ) {
			if ( type === 'none' ) {
				network.setOptions( {
					layout: {
						hierarchical: {
							enabled: false
						}
					}
				} );
			} else {
				network.setOptions( {
					layout: {
						hierarchical: {
							direction: type,
							sortMethod: 'directed'
						}
					}
				} );
			}
		}

		$( '<a class="btn btn-default layout-button">' ).click( function () {
			network.stabilize( 100 );
		} ).append(
			'<span class="glyphicon glyphicon-fullscreen" aria-hidden="true" title="' +
			wikibase.queryService.ui.i18n.getMessage( 'wdqs-app-resultbrowser-stabilize' ) +
			'"></span>'
		).appendTo( $toolbar );

		$( '<a class="btn btn-default layout-button">' ).click( function () {
			setLayout( 'LR' );
		} ).append( '<span class="glyphicon glyphicon-indent-left" aria-hidden="true" title="' +
			wikibase.queryService.ui.i18n.getMessage( 'wdqs-app-resultbrowser-hierarchical-lr' ) +
			'"></span>'
		).appendTo( $toolbar );

		$( '<a class="btn btn-default layout-button">' ).click( function () {
			setLayout( 'UD' );
		} ).append( '<span class="glyphicon glyphicon-align-center" aria-hidden="true" title="' +
			wikibase.queryService.ui.i18n.getMessage( 'wdqs-app-resultbrowser-hierarchical-ud' ) +
			'"></span>'
		).appendTo( $toolbar );

		$( '<a class="btn btn-default layout-button">' ).click( function () {
			setLayout( 'RL' );
		} ).append( '<span class="glyphicon glyphicon-indent-right" aria-hidden="true" title="' +
			wikibase.queryService.ui.i18n.getMessage( 'wdqs-app-resultbrowser-hierarchical-rl' ) +
			'"></span>'
		).appendTo( $toolbar );

		$( '<a class="btn btn-default layout-button">' ).click( function () {
			setLayout( 'none' );
		} ).append( '<span class="glyphicon glyphicon-align-justify" aria-hidden="true" title="' +
			wikibase.queryService.ui.i18n.getMessage( 'wdqs-app-resultbrowser-non-hierarchical' ) +
			'"></span>'
		).appendTo( $toolbar );

		return $toolbar;
	};

	/**
	 * @private
	 */
	SELF.prototype._getData = function (settings) {
		var nodes = {},
			edges = {},
			rows = [],
			format = this._getFormatter(),
			node = {},
			edge = {};

		// function setColorAndShape() { }

		this._iterateResult( function ( field, key, row, rowIndex ) {
			if ( !field || !field.value ) {
				return;
			}

			// TRY: set ?rgb & ?shape as #params -> CodeMirror-code

			if ( format.isEntity( field ) ) {
				// create node
				var label = row[key + 'Label'] && row[key + 'Label'].value || field.value,
					nodeId = field.value;

				node = {
					id: nodeId,
					label: label,
					title: label,
				};
				if ( rows[rowIndex] ) { // create new edge
					edge = {
						from: rows[rowIndex],
						to: nodeId
					};
					edges[ edge.from + edge.to ] = edge;
					if ( !nodes[nodeId] ) { // create new node if not exist
						nodes[nodeId] = node;
					}
				} else {
					nodes[nodeId] = node;
					rows[rowIndex] = node.id;
				}
			}
			if ( format.isCommonsResource( field.value ) ) {
				node.image = format.getCommonsResourceThumbnailUrl( field.value, 150 );
				node.shape = 'image';
				node.font = { color: 'black' };
			}

			if ( format.isNumber( field ) ) {
				node.value = field.value;
				node.title += ' value:' + field.value;
				node.shape = 'dot';
				node.font = { color: 'black' };
			}

			// check if settings info has been provided using a comment
			if ( key in settings ) {
				node.shape = settings[key].shape;
				const colorObj = { type:"literal", value:settings[key].rgb };
				node.color = format.getColorForHtml( colorObj ); // works
				handleColorForShape(node, node.shape, field, format);
			}

			/** NOTE: for 'rgb' & 'shape': 
			 * bounded color/shape(visjs) will be applied to node before keyword
			 * i.e: ?var_w_shape ?shape ?var_w_shape2 ?shape2
			 * then do, e.g. BIND("star" as ?shape) in Query-Body
			 */

			if ( /(shape\d)/g.test(key) ) {
				node.shape = field.value;
			} else if ( key === 'shape' ) { 
				node.shape = field.value;
			}

			// Matches to ?rgb and ?rbg<any digit> (e.g ?rgb1)
			if ( key === 'rgb' || /(rgb\d)/g.test(key) && format.isColor( field ) ) {
				node.color = format.getColorForHtml( field );

				// get the shape assigned to the group of nodes being processed, e.g. ?item1 ?rgb1 ?shape1
				const groupNum = key.match(/\d/)[0];
				const shapeKey = row["shape"+ groupNum].value;

				handleColorForShape(node, shapeKey, field, format);
			}


			if ( key === 'edgeLabel' ) {
				edge.label = field.value;
			}
		} );

		return {
			nodes: new vis.DataSet( _.compact( nodes ) ),
			edges: new vis.DataSet( _.compact( edges ) )
		};
	};

	/**
	 * Receiving data from the visit
	 *
	 * @param {Object} data
	 * @return {boolean} false if there is no revisit needed
	 */
	SELF.prototype.visit = function ( data ) {
		if ( this._getFormatter().isEntity( data ) ) {
			this._drawable = true;
			return false;
		}
		return true;
	};

	// Labels inside the shape
	const inShapes = ['ellipse', 'circle', 'database', 'box', 'text']; // => label inside shape
	/**
	 * Sets the font-color according to the nodes shape + styles text-shapes differently
	 * @param {*} node the created node
	 * @param {*} shapeKey the shape that the node will have
	 * @param {*} field the field being processed at the moment
	 * @param {*} format 
	 */
	function handleColorForShape(node, shapeKey, field, format) {

		if (inShapes.includes(shapeKey)) {
			var foreground = format.calculateLuminance( field.value ) <= 0.5 ? '#FFF' : '#000';
			if(shapeKey === 'text') {
				node.font = { color: foreground, 
							strokeWidth: 10,
							strokeColor: node.color,
							bold: true,
							};
			} else {
				node.font = { color: foreground};
			}
		} 
		// TODO: test for image
	}
	// INFO:
	// outShapes = ['image', 'circularImage', 'diamond', 'dot', 'star', 'hexagon', 'square', 'icon'];
	// inShapes = ['ellipse', 'circle', 'database', 'box', 'text']; 


	return SELF;
}( jQuery, vis, window, _ ) );
