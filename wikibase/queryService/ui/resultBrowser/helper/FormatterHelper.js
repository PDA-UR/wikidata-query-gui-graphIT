var wikibase = window.wikibase || {};
wikibase.queryService = wikibase.queryService || {};
wikibase.queryService.ui = wikibase.queryService.ui || {};
wikibase.queryService.ui.resultBrowser = wikibase.queryService.ui.resultBrowser || {};
wikibase.queryService.ui.resultBrowser.helper = wikibase.queryService.ui.resultBrowser.helper || {};

wikibase.queryService.ui.resultBrowser.helper.FormatterHelper = ( function ( $, moment ) {
	'use strict';

	var COMMONS_FILE_PATH = 'http://commons.wikimedia.org/wiki/special:filepath/',
		COMMONS_FILE_PATH_MEDIAVIEWER = 'https://commons.wikimedia.org/wiki/File:{FILENAME}',
		DATATYPE_DATETIME = 'http://www.w3.org/2001/XMLSchema#dateTime',
		TYPE_URI = 'uri',
		DATATYPE_STRING = 'http://www.w3.org/2001/XMLSchema#string',
		DATATYPE_MATHML = 'http://www.w3.org/1998/Math/MathML';

	var NUMBER_TYPES = [
		'http://www.w3.org/2001/XMLSchema#double', 'http://www.w3.org/2001/XMLSchema#float',
		'http://www.w3.org/2001/XMLSchema#decimal', 'http://www.w3.org/2001/XMLSchema#integer',
		'http://www.w3.org/2001/XMLSchema#long', 'http://www.w3.org/2001/XMLSchema#int',
		'http://www.w3.org/2001/XMLSchema#short',
		'http://www.w3.org/2001/XMLSchema#nonNegativeInteger',
		'http://www.w3.org/2001/XMLSchema#positiveInteger',
		'http://www.w3.org/2001/XMLSchema#unsignedLong',
		'http://www.w3.org/2001/XMLSchema#unsignedInt',
		'http://www.w3.org/2001/XMLSchema#unsignedShort',
		'http://www.w3.org/2001/XMLSchema#nonPositiveInteger',
		'http://www.w3.org/2001/XMLSchema#negativeInteger'
	];

	// create a learning path quer for the given url
	// reference: https://graphit.ur.de/wiki/Template:Learning_Path2
	function getLearningPathQuery (url){
		var qid = /(Q\d+)/.exec(url)[0]
		console.log("qid", qid, "from", url)
		return `
		PREFIX wd: <https://graphit.ur.de/entity/>
        PREFIX wdt: <https://graphit.ur.de/prop/direct/>
		#title:Learning path
		SELECT distinct ?v ?vLabel ?rgb 
		?link ?linkLabel
		WHERE {
		{
		  { SELECT * WHERE {
		  { SELECT ?goal ?goalLabel ?topic ?topicLabel WHERE {
			{
			BIND (wd:${qid} as ?goal).
			?goal wdt:P1+ ?topic.
			} UNION {
			  VALUES ?topic { wd:${qid} } # we also want to include the root node itself
			}
		  }
		  }
		  ?topic wdt:P1 ?pre.
		  BIND (?topic as ?v). # + add all ?pre that are not yet in ?topic   
		  BIND (?pre as ?link).
		  bind (if(?v = wd:${qid}, "FBBC74", "FFEDD8") as ?rgb).
		  }
		  }
		  Union
		  { SELECT * WHERE {
		  { SELECT ?topic ?topicLabel ?goal ?goalLabel WHERE {
			{
			  BIND (wd:${qid} as ?topic).
			  ?goal wdt:P1+ ?topic. 
			} UNION {
			  VALUES ?topic { wd:${qid} } # we also want to include the root node itself
			}
		  }
		  }
		  ?post wdt:P1 ?topic.
		  BIND (?post as ?v).
		  BIND (?topic as ?link).
		  bind ("F68C13" as ?rgb).
		  }
		  }
		  }
		  SERVICE wikibase:label { bd:serviceParam wikibase:language "[AUTO_LANGUAGE],en". }
	
		}`
	}

	/**
	 * Formatting helper provides methods useful for formatting results
	 *
	 * @class wikibase.queryService.ui.resultBrowser.helper.FormatterHelper
	 * @license GNU GPL v2+
	 *
	 * @author Jonas Kress
	 * @constructor
	 * @param {wikibase.queryService.ui.resultBrowser.helper.Options} options
	 */
	function SELF( options ) {
		this._options = options || new wikibase.queryService.ui.resultBrowser.helper.Options( {} );
	}

	/**
	 * @static
	 */
	SELF.initMoment = function () {
		// override default formats of en locale to match Wikibase
		moment.updateLocale( 'en', {
			longDateFormat: {
				LL: 'D MMMM YYYY',
				LLL: 'D MMMM YYYY h:mm A',
				LLLL: 'dddd, D MMMM YYYY h:mm A'
			}
		} );
	};

	/**
	 * @return {wikibase.queryService.ui.resultBrowser.helper.Options}
	 */
	SELF.prototype.getOptions = function () {
		return this._options;
	};

	/**
	 * @param {wikibase.queryService.ui.resultBrowser.helper.Options} options
	 */
	SELF.prototype.setOptions = function ( options ) {
		this._options = options;
	};

	/**
	 * Format a data row
	 *
	 * @param {Object} row
	 * @param {boolean} embed media files
	 * @return {jQuery} element
	 */
	SELF.prototype.formatRow = function ( row, embed ) {
		var self = this,
			$result = $( '<div/>' );

		$.each( row, function ( key, value ) {
			if ( self._isLabelField( key, row ) || self._isHiddenField( key ) ) {
				return;
			}

			value = $.extend( {
				label: self._getLabel( row, key )
			}, value );
			// console.log("v", value);
			$result.prepend( $( '<div>' ).append( self.formatValue( value, key, embed ) ) );
		} );

		return $result;
	};

	/**
	 * @param {string} key
	 * @param {object} row
	 * @return {boolean}
	 * @private
	 */
	SELF.prototype._isLabelField = function ( key, row ) {
		return key.endsWith( 'Label' ) && typeof row[key.slice( 0, -5 )] !== 'undefined';
	};

	/**
	 * @param {string} key
	 * @return {boolean}
	 * @private
	 */
	SELF.prototype._isHiddenField = function ( key ) {
		return this.getOptions().getColumnNames( 'hide', [] ).indexOf( key ) !== -1;
	};

	/**
	 * @param {object} row
	 * @param {string} key
	 * @return {string|null}
	 * @private
	 */
	SELF.prototype._getLabel = function ( row, key ) {
		var field = row[key + 'Label'];
		return field && field.value || null;
	};

	/**
	 * Format a data value
	 *
	 * @param {Object} data
	 * @param {string} [title]
	 * @param {boolean} [embed] media files
	 * @return {jQuery} element
	 */
	// NOTE: here
	SELF.prototype.formatValue = function ( data, title, embed ) {
		var value = data.value,
			$html = $( '<span>' );

		if ( !title ) {
			title = data.dataType || '';
		}

		if ( !data.type ) {
			return $( '<span>' ).text( value ).attr( 'title', title );
		}

		switch ( data.datatype || data.type ) {
			case TYPE_URI:
				if ( /^javascript:/.test( value ) ) {
					// don’t treat JavaScript URIs as URIs
					data = $.extend( {}, data, { datatype: DATATYPE_STRING } );
					return this.formatValue( data, title, embed );
				}

				var $link = $( '<a>' ).attr( { title: title, href: value, target: '_blank', class: 'item-link', rel: 'noopener' } );
				$html.append( $link );

				if ( this.isCommonsResource( value ) ) {
					$link.attr( 'href', this.getCommonsResourceFullUrl( value ) );
					$link.attr( 'title', title + ': commons:' + this.getCommonsResourceFileName( value ) );
					if ( embed ) {
						$link.click( this.handleCommonResourceItem );
						$link.append(
							$( '<img>' ).attr( 'src',
								this.getCommonsResourceThumbnailUrl( value, '120' ) ) )
							.width( '120' );
					} else {
						$link.attr( { href: COMMONS_FILE_PATH_MEDIAVIEWER.replace( /{FILENAME}/g,
							this.getCommonsResourceFileName( value ) ) } );
						$link.text( 'commons:' +
							decodeURIComponent( this.getCommonsResourceFileName( value ) ) );
						$html.prepend( this.createGalleryButton( value, title ), ' ' );
					}
				} else {
					$link.text( data.label || this.abbreviateUri( value ) );

					if ( this.isEntityUri( value ) ) {
						$html.prepend( this.createExploreButton( value ), ' ' );
					}
					// console.log("obj", value) // value = link to obj
				}

				break;
			case DATATYPE_DATETIME:
				if ( !title ) {
					title = wikibase.queryService.ui.i18n.getMessage( 'wdqs-app-result-formatter-title-datetime', 'Raw ISO timestamp' );
				}
				var $dateLabel = $( '<span>' ).text( this._formatDate( value ) );
				$dateLabel.attr( 'title', title + ': ' + value );
				$html.append( $dateLabel );
				break;

			case DATATYPE_MATHML:
				try {
					$html.append(
						MathJax.mathml2chtml(
							value
								.replace( /caligraphic/g, 'calligraphic' ) // work around https://github.com/mathjax/MathJax/issues/2214
						)
					);
					break;
				} catch ( e ) {
					window.console.error( 'Invalid MathML', e );
					// fall through to default case, escaping and displaying the raw value
				} // jshint ignore:line

			// eslint-ignore-line no-fallthrough
			default: // label to an object = value
				var $label = $( '<span>' ).text( value );
				console.log("label", value)
				if ( data['xml:lang'] ) {
					$label.attr( 'title', title + ': ' + value + '@' + data['xml:lang'] );
				} else {
					$label.attr( 'title', title + ': ' + value );
				}
				$html.append( $label );
		}

		return $html;
	};

	/**
	 * @param {string} dateTime
	 * @return {string}
	 * @private
	 */
	SELF.prototype._formatDate = function ( dateTime ) {
		var isBce = false,
			positiveDate = dateTime.replace( /^(?:-\d+|\+?0+\b)/, function ( year ) {
				isBce = true;
				return Math.abs( year ) + 1;
			} ),
			moment = this.parseDate( positiveDate ),
			formatted;

		if ( moment.isValid() ) {
			formatted = moment.format( 'LL' );
		} else {
			var year = positiveDate.replace( /^\+?(\d+).*/, '$1' );
			formatted = '0000'.slice( year.length ) + year;
		}

		if ( isBce ) {
			// TODO: Translate.
			formatted += ' BCE';
		}

		return formatted;
	};

	/**
	 * Parse dateTime string to Date object
	 * Allows negative years without leading zeros http://www.ecma-international.org/ecma-262/5.1/#sec-15.9.1.15.1
	 *
	 * @param {string} dateTime
	 * @return {Object}
	 */
	SELF.prototype.parseDate = function ( dateTime ) {
		// Add leading plus sign if it's missing
		dateTime = dateTime.replace( /^(?![+-])/, '+' );
		// Pad years to 6 digits
		dateTime = dateTime.replace( /^([+-]?)(\d{1,5}\b)/, function ( $0, $1, $2 ) {
			return $1 + ( '00000' + $2 ).slice( -6 );
		} );
		// Remove timezone
		dateTime = dateTime.replace( /Z$/, '' );

		return moment( dateTime, moment.ISO_8601 );
	};

	/**
	 * Checks if a given URI appears to be a canonical Wikidata entity URI.
	 *
	 * @param {string} uri
	 * @return {boolean}
	 */
	SELF.prototype.isEntityUri = function ( uri ) {
		return typeof uri === 'string'
			&& /\/entity\/(Q|P|L|M)[0-9]+$/.test( uri );
	};

	/**
	 * Creates an explore button
	 *
	 * @return {jQuery}
	 */
	SELF.prototype.createExploreButton = function ( url ) {
		var $button = $( '<a>' )
			.attr( {
				href: url,
				title: 'Show learning path',
				// title: 'Explore item', // TODO i18n
				class: 'explore glyphicon glyphicon-search',
				tabindex: '-1',
				'aria-hidden': 'true'
			} );
		$button.click( $.proxy( this.handleExploreItem, this ) );

		return $button;
	}; // NOTE: title: "...", changes tooltip for explore btn

	/**
	 * Checks whether given url is commons resource URL
	 *
	 * @param {string} url
	 * @return {boolean}
	 */
	SELF.prototype.isCommonsResource = function ( url ) {
		return url.toLowerCase().startsWith( COMMONS_FILE_PATH.toLowerCase() );
	};

	/**
	 * Returns the file name of a commons resource URL
	 *
	 * @param {string} url
	 * @return {string}
	 */
	SELF.prototype.getCommonsResourceFileName = function ( url ) {
		// FIXME: Dots in the constant must be escaped before using it as a regex!
		var regExp = new RegExp( COMMONS_FILE_PATH, 'ig' );

		return decodeURIComponent( url.replace( regExp, '' ) );
	};

	/**
	 * Returns the full URL for a commons resource URI.
	 *
	 * @param {string} uri
	 * @return {string}
	 */
	SELF.prototype.getCommonsResourceFullUrl = function ( uri ) {
		if ( !this.isCommonsResource( uri ) ) {
			return uri;
		}

		return uri.replace( /^http:/, 'https:' );
	};

	/**
	 * Returns a thumbnail URL for the given commons resource URI.
	 *
	 * @param {string} uri
	 * @param {number} [width]
	 * @return {string}
	 */
	SELF.prototype.getCommonsResourceThumbnailUrl = function ( uri, width ) {
		if ( !this.isCommonsResource( uri ) ) {
			return uri;
		}

		return uri.replace( /^http:/, 'https:' ) + '?width=' + ( width || 400 );
	};

	/**
	 * Creates a gallery button
	 *
	 * @param {string} url
	 * @param {string} galleryId
	 * @return {jQuery}
	 */
	SELF.prototype.createGalleryButton = function ( url, galleryId ) {
		var fileName = this.getCommonsResourceFileName( url ),
			thumbnail = this.getCommonsResourceThumbnailUrl( url, 900 );

		var $button = $( '<a>' ).attr( {
			title: 'Show Gallery',
			href: thumbnail,
			'aria-hidden': 'true',
			'class': 'gallery glyphicon glyphicon-picture',
			'data-gallery': 'G_' + galleryId,
			'data-title': decodeURIComponent( fileName )
		} );

		$button.click( this.handleCommonResourceItem );

		return $button;
	};

	/**
	 * Produce abbreviation of the URI.
	 *
	 * @param {string} uri
	 * @return {string}
	 */
	SELF.prototype.abbreviateUri = function ( uri ) {
		var prefixes = wikibase.queryService.RdfNamespaces.ALL_PREFIXES,
			ns,
			length = 0,
			longestNs;

		for ( ns in prefixes ) {
			if ( uri.indexOf( prefixes[ns] ) === 0 ) {
				if ( prefixes[ns].length > length ) {
					length = prefixes[ns].length;
					longestNs = ns;
				}
			}
		}
		if ( longestNs ) {
			return longestNs + ':' + uri.substr( length );
		} else {
			var forDisplay;
			try {
				var decoded = decodeURI( uri );
				forDisplay = decoded.replace(
					/* eslint-disable prefer-regex-literals, es-x/no-regexp-u-flag, es-x/no-regexp-unicode-property-escapes */
					/*
					 * use the RegExp constructor instead of a literal so that,
					 * in browsers without /u support, we only get a runtime exception,
					 * not a syntax error on the whole file;
					 * because we catch this error and have a valid fallback for it,
					 * using /u and \p{} is fine even if we still want to support IE11
					 */
					new RegExp( '\\p{Z}|\\p{C}', 'gu' ),
					/* eslint-enable */
					function ( codepoint ) {
						if (
							codepoint === '\u200B' || // U+200B ZERO WIDTH SPACE (ZWSP)
							codepoint === '\u200C' || // U+200C ZERO WIDTH NON-JOINER (ZWNJ)
							codepoint === '\u200D' // U+200D ZERO WIDTH JOINER (ZWJ)
						) {
							// don’t encode these, allow them in decoded form
							return codepoint;
						} else {
							// don’t allow Separator or Other characters in decoded form
							return encodeURIComponent( codepoint );
						}
					}
				);
			} catch ( _ ) {
				// e.g. decode error, or Unicode RegExp not supported (IE11)
				forDisplay = uri;
			}
			return '<' + forDisplay + '>';
		}
	};

	/**
	 * Uses the explore btn to open the item-link in a new tab (unofficial)
	 */
	SELF.prototype.handleExploreItem = function ( e ) {
		// NOTE: should work
		// e.preventDefault() // prevent opening in same tab
		// var url = $( e.target ).attr( 'href' );
		// window.open(url, '_blank').focus()

		// NOTE: test
		var $currentDialog = $( '#explorer-dialogs .explorer-dialog' ).clone();
		var url = $( e.target ).attr( 'href' );
		console.log("expl", url, e.target)
		var $dialog = $currentDialog.dialog( {
			uiLibrary: 'bootstrap',
			autoOpen: false,
			maxWidth: window.innerWidth,
			maxHeight: window.innerHeight,
			minHeight: 220,
			minWidth: 220,
			resizable: true,
			width: window.innerWidth / 2,
			height: Math.min( window.innerWidth, window.innerHeight ) / 2,
			drag: function ( e ) {
				$dialog.children( 'div.explorer-body' ).css( 'visibility', 'hidden' );
				$( 'body' ).addClass( 'disable-selection' );
				$dialog.mousemove( function ( event ) {
					if ( event.pageY < 30 ) {
						$dialog.css( 'top', '10px' );
					}
				} );
			},
			dragStop: function ( e ) {
				$dialog.children( 'div.explorer-body' ).css( 'visibility', 'visible' );
				$( 'body' ).removeClass( 'disable-selection' );
			},
			resize: function ( e ) {
				$dialog.children( 'div.explorer-body' ).css( 'visibility', 'hidden' );
				$( 'body' ).addClass( 'disable-selection' );
			},
			resizeStop: function ( e ) {
				$dialog.children( 'div.explorer-body' ).css( 'visibility', 'visible' );
				$( 'body' ).removeClass( 'disable-selection' );
			}
		} );
		e.preventDefault();
		var lang = $.i18n && $.i18n().locale || 'en',
			query = getLearningPathQuery(url),
			embedUrl = 'embed.html#' + encodeURIComponent( '#defaultView:Graph\n' + query );
		var top = $( window ).scrollTop() + 200;
		$dialog.children( 'div.explorer-body' ).html( $( '<iframe frameBorder="0" scrolling="no"></iframe>' ).attr( 'src', embedUrl ) );
		$dialog.css( 'left', offsetCounter );
		$dialog.css( 'top', top );
		$dialog.open();
		offsetCounter = offsetCounter + 10;
		return false;
	}

	/**
	 * Handler for explore links
	 */
	// NOTE: handles the action on the explore button -> official implementation
	var offsetCounter = 100;
	SELF.prototype.handleExploreItemOfficial = function ( e ) {
		var $currentDialog = $( '#explorer-dialogs .explorer-dialog' ).clone();
		var url = $( e.target ).attr( 'href' );
		console.log("expl", url, e.target)
		var $dialog = $currentDialog.dialog( {
			uiLibrary: 'bootstrap',
			autoOpen: false,
			maxWidth: window.innerWidth,
			maxHeight: window.innerHeight,
			minHeight: 220,
			minWidth: 220,
			resizable: true,
			width: window.innerWidth / 2,
			height: Math.min( window.innerWidth, window.innerHeight ) / 2,
			drag: function ( e ) {
				$dialog.children( 'div.explorer-body' ).css( 'visibility', 'hidden' );
				$( 'body' ).addClass( 'disable-selection' );
				$dialog.mousemove( function ( event ) {
					if ( event.pageY < 30 ) {
						$dialog.css( 'top', '10px' );
					}
				} );
			},
			dragStop: function ( e ) {
				$dialog.children( 'div.explorer-body' ).css( 'visibility', 'visible' );
				$( 'body' ).removeClass( 'disable-selection' );
			},
			resize: function ( e ) {
				$dialog.children( 'div.explorer-body' ).css( 'visibility', 'hidden' );
				$( 'body' ).addClass( 'disable-selection' );
			},
			resizeStop: function ( e ) {
				$dialog.children( 'div.explorer-body' ).css( 'visibility', 'visible' );
				$( 'body' ).removeClass( 'disable-selection' );
			}
		} );
		e.preventDefault();
		var lang = $.i18n && $.i18n().locale || 'en',
			query = 'SELECT ?item ?itemLabel WHERE { BIND( <' + url + '> as ?item ).	SERVICE wikibase:label { bd:serviceParam wikibase:language "' + lang + '" } }',
			embedUrl = 'embed.html#' + encodeURIComponent( '#defaultView:Graph\n' + query );
		var top = $( window ).scrollTop() + 200;
		$dialog.children( 'div.explorer-body' ).html( $( '<iframe frameBorder="0" scrolling="no"></iframe>' ).attr( 'src', embedUrl ) );
		$dialog.css( 'left', offsetCounter );
		$dialog.css( 'top', top );
		$dialog.open();
		offsetCounter = offsetCounter + 10;
		return false;
	};

	/**
	 * Handler for commons resource links
	 */
	SELF.prototype.handleCommonResourceItem = function ( e ) {
		e.preventDefault();

		$( this ).ekkoLightbox( {
			'scale_height': true
		} );
	};

	/**
	 * Checks whether the current cell contains a label:
	 * Has either a language property, or has the "literal" type without a datatype.
	 *
	 * @param {Object} cell
	 * @return {boolean}
	 */
	SELF.prototype.isLabel = function ( cell ) {
		if ( !cell ) {
			return false;
		}

		return 'xml:lang' in cell
			|| ( cell.type === 'literal' && ( !cell.datatype || cell.datatype === DATATYPE_STRING ) );
	};

	/**
	 * Checks whether the current cell contains a number
	 *
	 * @param {Object} cell
	 * @return {boolean}
	 */
	SELF.prototype.isNumber = function ( cell ) {
		return cell
			&& cell.datatype
			&& NUMBER_TYPES.indexOf( cell.datatype ) !== -1;
	};

	/**
	 * Checks whether the current cell is date time
	 *
	 * @param {Object} cell
	 * @return {boolean}
	 */
	SELF.prototype.isDateTime = function ( cell ) {
		return cell
			&& cell.datatype === DATATYPE_DATETIME;
	};

	/**
	 * Checks whether the current cell is a WD entity URI
	 *
	 * @param {Object} cell
	 * @return {boolean}
	 */
	SELF.prototype.isEntity = function ( cell ) {
		return cell
			&& cell.value
			&& this.isEntityUri( cell.value );
	};

	/**
	 * Checks whether the current cell is a color string according to the P465 format
	 *
	 * @param {Object} cell
	 * @return {boolean}
	 */
	SELF.prototype.isColor = function ( cell ) {
		return cell
			&& cell.type === 'literal'
			&& cell.value
			&& /^([\dA-F]{1,2}){3}$/i.test( cell.value );
	};

	/**
	 * Returns an HTML color string for the current cell
	 *
	 * @param {Object} cell
	 * @return {string}
	 */
	SELF.prototype.getColorForHtml = function ( cell ) {
		return '#' + cell.value;
	};

	/**
	 * Calculate the luminance of the given sRGB color.
	 *
	 * This uses the reverse sRGB transformation,
	 * as documented on https://en.wikipedia.org/wiki/SRGB#The_reverse_transformation,
	 * to calculate the luminance (Y coordinate in the CIE XYZ model).
	 *
	 * @param {string} color as six hex digits (no #)
	 * @return {Number} luminance of the color, or NaN if the color string is invalid
	 */
	SELF.prototype.calculateLuminance = function ( color ) {
		var r = parseInt( color.substr( 1, 2 ), 16 ) / 255,
			g = parseInt( color.substr( 3, 2 ), 16 ) / 255,
			b = parseInt( color.substr( 5, 2 ), 16 ) / 255;

		if ( isFinite( r ) && isFinite( g ) && isFinite( b ) ) {
			// linearize gamma-corrected sRGB values
			r = r <= 0.04045 ? r / 12.92 : Math.pow( ( r + 0.055 ) / 1.055, 2.4 );
			g = g <= 0.04045 ? g / 12.92 : Math.pow( ( g + 0.055 ) / 1.055, 2.4 );
			b = b <= 0.04045 ? b / 12.92 : Math.pow( ( b + 0.055 ) / 1.055, 2.4 );
			// calculate luminance using Rec. 709 coefficients
			var luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
			return luminance;
		} else {
			return NaN;
		}
	};

	/**
	 * @property {wikibase.queryService.ui.resultBrowser.helper.Options}
	 * @private
	 */
	SELF.prototype._options = null;

	return SELF;
}( jQuery, moment ) );
