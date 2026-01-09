/**
 * Mapbox Map Tools Library
 * A JavaScript library providing MCP-compatible tools for Mapbox GL JS map visualization
 *
 * This library provides a set of tools that can be used with Language Learning Models (LLMs)
 * to visualize geospatial data on Mapbox maps through function calling / tool use.
 *
 * @version 1.0.0
 * @author Moritz Forster
 * @license MIT
 */

class MapboxMapTools {
    constructor(mapInstance, options = {}) {
        if (!mapInstance) {
            throw new Error('Mapbox GL JS map instance is required');
        }

        this.map = mapInstance;
        this.options = {
            defaultPointColor: '#FF0000',
            defaultRouteColor: '#0074D9',
            defaultRouteWidth: 4,
            defaultPolygonFillColor: '#FF0000',
            defaultPolygonFillOpacity: 0.3,
            defaultPolygonStrokeColor: '#FF0000',
            defaultPolygonStrokeWidth: 2,
            enablePopups: true,
            enableHoverEffects: true,
            ...options
        };

        this.layerCounter = 0;
        this.tools = this.initializeTools();
    }

    /**
     * Define available map tools for LLM function calling
     */
    initializeTools() {
        return [
            {
                name: 'add_points_to_map',
                description: 'Add point markers to the map with optional popup information. Use this tool when users want to show specific locations, places of interest, or mark important spots on the map.',
                input_schema: {
                    type: 'object',
                    properties: {
                        points: {
                            type: 'array',
                            description: 'Array of point objects to add to the map',
                            items: {
                                type: 'object',
                                properties: {
                                    longitude: {
                                        type: 'number',
                                        minimum: -180,
                                        maximum: 180,
                                        description: 'Longitude coordinate (-180 to 180)'
                                    },
                                    latitude: {
                                        type: 'number',
                                        minimum: -90,
                                        maximum: 90,
                                        description: 'Latitude coordinate (-90 to 90)'
                                    },
                                    title: {
                                        type: 'string',
                                        description: 'Title text for the point marker popup'
                                    },
                                    description: {
                                        type: 'string',
                                        description: 'Description text for the point marker popup'
                                    },
                                    color: {
                                        type: 'string',
                                        default: '#FF0000',
                                        description: 'Color of the point marker (hex format, e.g., #FF0000)'
                                    }
                                },
                                required: ['longitude', 'latitude']
                            }
                        },
                        layerName: {
                            type: 'string',
                            default: 'points-layer',
                            description: 'Name for the points layer (useful for organizing multiple layers)'
                        }
                    },
                    required: ['points']
                }
            },
            {
                name: 'add_route_to_map',
                description: 'Draw a route, path, itinerary, or travel line connecting multiple locations on the map. Use this tool when users ask to: visualize routes between places, show travel itineraries, connect multiple destinations, display paths or journeys, create walking/driving/travel routes, show connections between locations, or draw any line that represents movement or travel between points. The coordinates should be in [longitude, latitude] format and represent the sequential points along the route.',
                input_schema: {
                    type: 'object',
                    properties: {
                        coordinates: {
                            type: 'array',
                            description: 'Array of [longitude, latitude] coordinate pairs representing the route path in sequential order',
                            items: {
                                type: 'array',
                                items: { type: 'number' },
                                minItems: 2,
                                maxItems: 2
                            },
                            minItems: 2
                        },
                        color: {
                            type: 'string',
                            default: '#0074D9',
                            description: 'Route line color (hex format, e.g. #FF0000 for red, #00FF00 for green)'
                        },
                        width: {
                            type: 'number',
                            default: 4,
                            description: 'Route line thickness in pixels'
                        },
                        layerName: {
                            type: 'string',
                            default: 'route-layer',
                            description: 'Name for the route layer (useful for organizing multiple routes)'
                        }
                    },
                    required: ['coordinates']
                }
            },
            {
                name: 'pan_map_to_location',
                description: 'Pan the map to center on a specific location. Use this when users want to focus on a particular geographic area.',
                input_schema: {
                    type: 'object',
                    properties: {
                        longitude: {
                            type: 'number',
                            minimum: -180,
                            maximum: 180,
                            description: 'Longitude coordinate to center the map on'
                        },
                        latitude: {
                            type: 'number',
                            minimum: -90,
                            maximum: 90,
                            description: 'Latitude coordinate to center the map on'
                        },
                        zoom: {
                            type: 'number',
                            minimum: 0,
                            maximum: 22,
                            default: 12,
                            description: 'Zoom level (0 = world view, 22 = maximum zoom)'
                        },
                        animate: {
                            type: 'boolean',
                            default: true,
                            description: 'Whether to animate the map movement (true) or jump instantly (false)'
                        }
                    },
                    required: ['longitude', 'latitude']
                }
            },
            {
                name: 'fit_map_to_bounds',
                description: 'Adjust map view to fit all provided coordinates within the viewport. Use this when displaying multiple locations to ensure they are all visible.',
                input_schema: {
                    type: 'object',
                    properties: {
                        coordinates: {
                            type: 'array',
                            description: 'Array of [longitude, latitude] coordinate pairs to fit within the map view',
                            items: {
                                type: 'array',
                                items: { type: 'number' },
                                minItems: 2,
                                maxItems: 2
                            }
                        },
                        padding: {
                            type: 'number',
                            default: 50,
                            description: 'Padding around the bounds in pixels'
                        }
                    },
                    required: ['coordinates']
                }
            },
            {
                name: 'add_polygon_to_map',
                description: 'Add a polygon area to the map. Use this for showing regions, boundaries, areas of interest, or any geographic zones.',
                input_schema: {
                    type: 'object',
                    properties: {
                        coordinates: {
                            type: 'array',
                            description: 'Array of coordinate rings. First ring is exterior boundary, additional rings are holes. Each ring is an array of [longitude, latitude] pairs.',
                            items: {
                                type: 'array',
                                items: {
                                    type: 'array',
                                    items: { type: 'number' },
                                    minItems: 2,
                                    maxItems: 2
                                }
                            }
                        },
                        fillColor: {
                            type: 'string',
                            default: '#FF0000',
                            description: 'Fill color of the polygon (hex format)'
                        },
                        fillOpacity: {
                            type: 'number',
                            default: 0.3,
                            description: 'Fill opacity (0.0 = transparent, 1.0 = opaque)'
                        },
                        strokeColor: {
                            type: 'string',
                            default: '#FF0000',
                            description: 'Stroke/border color of the polygon (hex format)'
                        },
                        strokeWidth: {
                            type: 'number',
                            default: 2,
                            description: 'Stroke/border width in pixels'
                        },
                        layerName: {
                            type: 'string',
                            default: 'polygon-layer',
                            description: 'Name for the polygon layer'
                        }
                    },
                    required: ['coordinates']
                }
            },
            {
                name: 'clear_map_layers',
                description: 'Remove all or specific layers from the map. Use this to clean up the map or remove outdated visualizations.',
                input_schema: {
                    type: 'object',
                    properties: {
                        layerNames: {
                            type: 'array',
                            items: { type: 'string' },
                            description: 'Specific layer names to remove. If empty or omitted, removes all custom layers added by this library'
                        }
                    }
                }
            },
            {
                name: 'set_map_style',
                description: 'Change the map style/theme. Use this when users want to switch between different visual styles of the map.',
                input_schema: {
                    type: 'object',
                    properties: {
                        style: {
                            type: 'string',
                            enum: ['streets-v12', 'outdoors-v12', 'light-v11', 'dark-v11', 'satellite-v9', 'satellite-streets-v12'],
                            default: 'streets-v12',
                            description: 'Mapbox style to apply to the map'
                        }
                    },
                    required: ['style']
                }
            },
            {
                name: 'add_vector_tileset_layer',
                description: 'Add a vector tileset layer to the map (e.g., Mapbox Traffic, custom vector tiles). Vector tilesets are pre-rendered tile sources that can display large datasets efficiently. Use this tool when users want to visualize traffic conditions, show pre-existing datasets from vector tile sources, or add any Mapbox-hosted or custom vector tileset to the map. Common examples include traffic data, terrain, boundaries, or custom vector tile sources.',
                input_schema: {
                    type: 'object',
                    properties: {
                        tilesetUrl: {
                            type: 'string',
                            description: 'Vector tileset URL (e.g., "mapbox://mapbox.mapbox-traffic-v1" for Mapbox Traffic or custom URL template for tile servers)'
                        },
                        sourceLayer: {
                            type: 'string',
                            description: 'Source layer name from the vector tileset (e.g., "traffic" for Traffic v1). Check tileset documentation for available layers.'
                        },
                        layerType: {
                            type: 'string',
                            enum: ['line', 'fill', 'circle', 'fill-extrusion', 'symbol'],
                            description: 'Type of layer to render: line (roads/paths), fill (areas/polygons), circle (points), fill-extrusion (3D buildings), symbol (icons/text)'
                        },
                        layerName: {
                            type: 'string',
                            default: 'vector-tileset-layer',
                            description: 'Name for the layer (useful for organizing multiple layers)'
                        },
                        paint: {
                            type: 'object',
                            description: 'Mapbox GL paint properties for styling the layer. Supports Mapbox expressions. Examples: {"line-color": "#FF0000", "line-width": 3} for lines, {"fill-color": "#00FF00", "fill-opacity": 0.5} for polygons. For data-driven styling use expressions like ["match", ["get", "property"], value1, color1, value2, color2, defaultColor]',
                            additionalProperties: true
                        },
                        layout: {
                            type: 'object',
                            description: 'Mapbox GL layout properties. Examples: {"line-cap": "round", "line-join": "round"} for lines, {"visibility": "visible"}',
                            additionalProperties: true
                        },
                        filter: {
                            type: 'array',
                            description: 'Mapbox GL filter expression to filter features. Examples: ["==", ["get", "congestion"], "heavy"] for heavy traffic only, [">", ["get", "population"], 100000] for cities with population > 100k',
                            items: {}
                        },
                        minzoom: {
                            type: 'number',
                            minimum: 0,
                            maximum: 24,
                            description: 'Minimum zoom level at which the layer is visible (0-24)'
                        },
                        maxzoom: {
                            type: 'number',
                            minimum: 0,
                            maximum: 24,
                            description: 'Maximum zoom level at which the layer is visible (0-24)'
                        }
                    },
                    required: ['tilesetUrl', 'sourceLayer', 'layerType']
                }
            },
            {
                name: 'query_rendered_features',
                description: 'Query features that are currently visible in the map viewport. This returns features that are rendered on screen, respecting the current zoom level, style, and filters. Use this tool when users want to: find what\'s visible on the map, identify features at a location, get information about rendered points/lines/polygons, or inspect what\'s currently shown in the viewport. Only returns features from layers that are currently rendered. Useful for identifying what the user is looking at or analyzing visible data.',
                input_schema: {
                    type: 'object',
                    properties: {
                        point: {
                            type: 'object',
                            description: 'Query features at a specific screen point (x, y in pixels from top-left corner)',
                            properties: {
                                x: { type: 'number', description: 'X coordinate in pixels from left edge' },
                                y: { type: 'number', description: 'Y coordinate in pixels from top edge' }
                            },
                            required: ['x', 'y']
                        },
                        bbox: {
                            type: 'array',
                            description: 'Query features within a bounding box [x1, y1, x2, y2] in screen pixels. Alternative to point query. Useful for selecting features in a rectangular area.',
                            items: { type: 'number' },
                            minItems: 4,
                            maxItems: 4
                        },
                        layers: {
                            type: 'array',
                            items: { type: 'string' },
                            description: 'Filter results to specific layer IDs. If omitted, queries all layers. Use layer IDs returned from add_points_to_map, add_route_to_map, etc.'
                        },
                        filter: {
                            type: 'array',
                            description: 'Mapbox GL filter expression to filter results by properties. Example: ["==", ["get", "type"], "restaurant"] to find only restaurants',
                            items: {}
                        },
                        limit: {
                            type: 'number',
                            default: 100,
                            minimum: 1,
                            maximum: 1000,
                            description: 'Maximum number of features to return (default: 100, max: 1000)'
                        },
                        includeGeometry: {
                            type: 'boolean',
                            default: true,
                            description: 'Include feature geometry in results. Set to false for smaller response with properties only.'
                        }
                    }
                }
            },
            {
                name: 'query_source_features',
                description: 'Query all features from a data source regardless of visibility or current viewport. This returns features directly from the source data, not respecting style filters or zoom levels. Use this tool when users want to: get all data from a source, query features outside the current view, access raw data regardless of rendering, or analyze complete datasets. Works with both GeoJSON sources (from add_points_to_map, add_route_to_map, etc.) and vector tile sources (from add_vector_tileset_layer). Useful for comprehensive data analysis.',
                input_schema: {
                    type: 'object',
                    properties: {
                        sourceId: {
                            type: 'string',
                            description: 'ID of the source to query. For layers created by this library, use the layer name (e.g., "points-layer-1"). For vector tilesets, use the source ID returned from add_vector_tileset_layer.'
                        },
                        sourceLayer: {
                            type: 'string',
                            description: 'For vector tile sources only, specify the source layer name (e.g., "traffic" for Traffic v1). Required for vector sources, ignored for GeoJSON sources.'
                        },
                        filter: {
                            type: 'array',
                            description: 'Mapbox GL filter expression to filter results by properties. Example: ["==", ["get", "congestion"], "severe"] for severe traffic only',
                            items: {}
                        },
                        limit: {
                            type: 'number',
                            default: 1000,
                            minimum: 1,
                            maximum: 10000,
                            description: 'Maximum number of features to return (default: 1000, max: 10000)'
                        },
                        includeGeometry: {
                            type: 'boolean',
                            default: true,
                            description: 'Include feature geometry in results. Set to false for smaller response with properties only.'
                        }
                    },
                    required: ['sourceId']
                }
            }
        ];
    }

    /**
     * Execute a map tool by name
     */
    async executeTool(toolName, args) {
        console.log(`Executing map tool: ${toolName}`, args);

        try {
            switch (toolName) {
                case 'add_points_to_map':
                    return this.addPointsToMap(args);
                case 'add_route_to_map':
                    return this.addRouteToMap(args);
                case 'pan_map_to_location':
                    return this.panMapToLocation(args);
                case 'fit_map_to_bounds':
                    return this.fitMapToBounds(args);
                case 'add_polygon_to_map':
                    return this.addPolygonToMap(args);
                case 'clear_map_layers':
                    return this.clearMapLayers(args);
                case 'set_map_style':
                    return this.setMapStyle(args);
                case 'add_vector_tileset_layer':
                    return this.addVectorTilesetLayer(args);
                case 'query_rendered_features':
                    return this.queryRenderedFeatures(args);
                case 'query_source_features':
                    return this.querySourceFeatures(args);
                default:
                    throw new Error(`Unknown tool: ${toolName}`);
            }
        } catch (error) {
            console.error(`Error executing ${toolName}:`, error);
            return {
                content: [{
                    type: 'text',
                    text: `Error: ${error.message}`
                }],
                isError: true
            };
        }
    }

    /**
     * Add points to the map
     */
    addPointsToMap(args) {
        const { points, layerName = 'points-layer' } = args;
        const uniqueLayerName = `${layerName}-${++this.layerCounter}`;

        // Create GeoJSON feature collection
        const geojson = {
            type: 'FeatureCollection',
            features: points.map((point, index) => ({
                type: 'Feature',
                geometry: {
                    type: 'Point',
                    coordinates: [point.longitude, point.latitude]
                },
                properties: {
                    title: point.title || `Point ${index + 1}`,
                    description: point.description || '',
                    color: point.color || this.options.defaultPointColor
                }
            }))
        };

        // Add source and layer
        this.map.addSource(uniqueLayerName, {
            type: 'geojson',
            data: geojson
        });

        this.map.addLayer({
            id: uniqueLayerName,
            type: 'circle',
            source: uniqueLayerName,
            paint: {
                'circle-radius': 8,
                'circle-color': ['get', 'color'],
                'circle-stroke-width': 2,
                'circle-stroke-color': '#ffffff'
            }
        });

        // Add interactive features if enabled
        if (this.options.enablePopups) {
            this.map.on('click', uniqueLayerName, (e) => {
                const coordinates = e.features[0].geometry.coordinates.slice();
                const { title, description } = e.features[0].properties;

                new mapboxgl.Popup()
                    .setLngLat(coordinates)
                    .setHTML(`<h3>${title}</h3><p>${description}</p>`)
                    .addTo(this.map);
            });
        }

        if (this.options.enableHoverEffects) {
            this.map.on('mouseenter', uniqueLayerName, () => {
                this.map.getCanvas().style.cursor = 'pointer';
            });

            this.map.on('mouseleave', uniqueLayerName, () => {
                this.map.getCanvas().style.cursor = '';
            });
        }

        return {
            content: [{
                type: 'text',
                text: `Added ${points.length} points to map layer "${uniqueLayerName}"`
            }],
            isError: false,
            layerId: uniqueLayerName
        };
    }

    /**
     * Add a route to the map
     */
    addRouteToMap(args) {
        const {
            coordinates,
            color = this.options.defaultRouteColor,
            width = this.options.defaultRouteWidth,
            layerName = 'route-layer'
        } = args;
        const uniqueLayerName = `${layerName}-${++this.layerCounter}`;

        const geojson = {
            type: 'Feature',
            geometry: {
                type: 'LineString',
                coordinates: coordinates
            }
        };

        this.map.addSource(uniqueLayerName, {
            type: 'geojson',
            data: geojson
        });

        this.map.addLayer({
            id: uniqueLayerName,
            type: 'line',
            source: uniqueLayerName,
            paint: {
                'line-color': color,
                'line-width': width,
                'line-opacity': 0.8
            }
        });

        return {
            content: [{
                type: 'text',
                text: `Added route with ${coordinates.length} points to map layer "${uniqueLayerName}"`
            }],
            isError: false,
            layerId: uniqueLayerName
        };
    }

    /**
     * Pan map to a location
     */
    panMapToLocation(args) {
        const { longitude, latitude, zoom = 12, animate = true } = args;

        if (animate) {
            this.map.flyTo({
                center: [longitude, latitude],
                zoom: zoom,
                duration: 2000
            });
        } else {
            this.map.setCenter([longitude, latitude]);
            this.map.setZoom(zoom);
        }

        return {
            content: [{
                type: 'text',
                text: `Map centered on ${latitude.toFixed(4)}, ${longitude.toFixed(4)} at zoom level ${zoom}`
            }],
            isError: false
        };
    }

    /**
     * Fit map to bounds of coordinates
     */
    fitMapToBounds(args) {
        const { coordinates, padding = 50 } = args;

        if (coordinates.length === 0) {
            throw new Error('No coordinates provided');
        }

        const bounds = coordinates.reduce((bounds, coord) => {
            return bounds.extend(coord);
        }, new mapboxgl.LngLatBounds(coordinates[0], coordinates[0]));

        this.map.fitBounds(bounds, { padding: padding });

        return {
            content: [{
                type: 'text',
                text: `Map view adjusted to fit ${coordinates.length} coordinates`
            }],
            isError: false
        };
    }

    /**
     * Add polygon to map
     */
    addPolygonToMap(args) {
        const {
            coordinates,
            fillColor = this.options.defaultPolygonFillColor,
            fillOpacity = this.options.defaultPolygonFillOpacity,
            strokeColor = this.options.defaultPolygonStrokeColor,
            strokeWidth = this.options.defaultPolygonStrokeWidth,
            layerName = 'polygon-layer'
        } = args;

        const uniqueLayerName = `${layerName}-${++this.layerCounter}`;

        const geojson = {
            type: 'Feature',
            geometry: {
                type: 'Polygon',
                coordinates: coordinates
            }
        };

        this.map.addSource(uniqueLayerName, {
            type: 'geojson',
            data: geojson
        });

        // Add fill layer
        this.map.addLayer({
            id: `${uniqueLayerName}-fill`,
            type: 'fill',
            source: uniqueLayerName,
            paint: {
                'fill-color': fillColor,
                'fill-opacity': fillOpacity
            }
        });

        // Add stroke layer
        this.map.addLayer({
            id: `${uniqueLayerName}-stroke`,
            type: 'line',
            source: uniqueLayerName,
            paint: {
                'line-color': strokeColor,
                'line-width': strokeWidth
            }
        });

        return {
            content: [{
                type: 'text',
                text: `Added polygon to map layer "${uniqueLayerName}"`
            }],
            isError: false,
            layerId: uniqueLayerName
        };
    }

    /**
     * Clear map layers
     */
    clearMapLayers(args) {
        const { layerNames = [] } = args;
        let removedCount = 0;

        if (layerNames.length === 0) {
            // Remove all custom layers
            const layers = this.map.getStyle().layers;
            const customLayers = layers.filter(layer =>
                layer.id.includes('-layer-') ||
                layer.id.endsWith('-fill') ||
                layer.id.endsWith('-stroke')
            );

            customLayers.forEach(layer => {
                if (this.map.getLayer(layer.id)) {
                    this.map.removeLayer(layer.id);
                    removedCount++;
                }
            });

            // Remove sources
            const sources = Object.keys(this.map.getStyle().sources);
            sources.forEach(sourceId => {
                if (sourceId.includes('-layer-')) {
                    this.map.removeSource(sourceId);
                }
            });

            // Clean up orphaned vector sources
            const remainingLayers = this.map.getStyle().layers;
            const usedSources = new Set(remainingLayers.map(l => l.source).filter(Boolean));

            sources.forEach(sourceId => {
                if (sourceId.endsWith('-vector-source') && !usedSources.has(sourceId)) {
                    if (this.map.getSource(sourceId)) {
                        this.map.removeSource(sourceId);
                    }
                }
            });
        } else {
            // Remove specific layers
            layerNames.forEach(layerName => {
                if (this.map.getLayer(layerName)) {
                    this.map.removeLayer(layerName);
                    removedCount++;
                }
                if (this.map.getSource(layerName)) {
                    this.map.removeSource(layerName);
                }
            });

            // Check for orphaned vector sources after removing specific layers
            const remainingLayers = this.map.getStyle().layers;
            const usedSources = new Set(remainingLayers.map(l => l.source).filter(Boolean));
            const allSources = Object.keys(this.map.getStyle().sources);

            allSources.forEach(sourceId => {
                if (sourceId.endsWith('-vector-source') && !usedSources.has(sourceId)) {
                    if (this.map.getSource(sourceId)) {
                        this.map.removeSource(sourceId);
                    }
                }
            });
        }

        return {
            content: [{
                type: 'text',
                text: `Removed ${removedCount} layers from the map`
            }],
            isError: false
        };
    }

    /**
     * Set map style
     */
    setMapStyle(args) {
        const { style } = args;
        const styleUrl = `mapbox://styles/mapbox/${style}`;

        this.map.setStyle(styleUrl);

        return {
            content: [{
                type: 'text',
                text: `Changed map style to ${style}`
            }],
            isError: false
        };
    }

    /**
     * Generate a consistent source ID from a tileset URL
     * @param {string} tilesetUrl - The tileset URL
     * @returns {string} A sanitized source ID
     */
    generateSourceId(tilesetUrl) {
        const cleanUrl = tilesetUrl
            .replace(/^(mapbox:\/\/|https?:\/\/)/, '')
            .replace(/[^a-zA-Z0-9-_.]/g, '-');
        return `${cleanUrl}-vector-source`;
    }

    /**
     * Add a vector tileset layer to the map
     * @param {Object} args - Tool arguments
     * @param {string} args.tilesetUrl - Vector tileset URL
     * @param {string} args.sourceLayer - Source layer name from the tileset
     * @param {string} args.layerType - Layer type (line, fill, circle, etc.)
     * @param {string} [args.layerName='vector-tileset-layer'] - Layer name
     * @param {Object} [args.paint={}] - Paint properties
     * @param {Object} [args.layout={}] - Layout properties
     * @param {Array} [args.filter] - Filter expression
     * @param {number} [args.minzoom] - Minimum zoom
     * @param {number} [args.maxzoom] - Maximum zoom
     * @returns {Object} Result object
     */
    addVectorTilesetLayer(args) {
        const {
            tilesetUrl,
            sourceLayer,
            layerType,
            layerName = 'vector-tileset-layer',
            paint = {},
            layout = {},
            filter,
            minzoom,
            maxzoom
        } = args;

        // Validate tileset URL format
        if (!tilesetUrl.match(/^(mapbox:\/\/|https?:\/\/)/)) {
            throw new Error('Invalid tileset URL format. Must start with "mapbox://" or "http(s)://"');
        }

        // Generate unique layer ID and source ID
        const uniqueLayerName = `${layerName}-${++this.layerCounter}`;
        const sourceId = this.generateSourceId(tilesetUrl);

        // Add source if it doesn't exist
        if (!this.map.getSource(sourceId)) {
            // Determine if this is a Mapbox tileset or custom tile URL
            const sourceConfig = {
                type: 'vector'
            };

            if (tilesetUrl.startsWith('mapbox://')) {
                sourceConfig.url = tilesetUrl;
            } else {
                // For custom tile servers, use tiles array
                sourceConfig.tiles = [tilesetUrl];
            }

            this.map.addSource(sourceId, sourceConfig);
        }

        // Default paint properties by layer type
        const defaultPaintByType = {
            'line': { 'line-color': '#0074D9', 'line-width': 2, 'line-opacity': 0.8 },
            'fill': { 'fill-color': '#FF0000', 'fill-opacity': 0.3 },
            'circle': { 'circle-radius': 6, 'circle-color': '#FF0000', 'circle-opacity': 0.8 },
            'fill-extrusion': { 'fill-extrusion-color': '#0074D9', 'fill-extrusion-height': 10, 'fill-extrusion-opacity': 0.8 },
            'symbol': { 'text-color': '#000000', 'text-halo-color': '#FFFFFF', 'text-halo-width': 2 }
        };

        // Merge default paint properties with user overrides
        const finalPaint = { ...defaultPaintByType[layerType], ...paint };

        // Build layer configuration
        const layerConfig = {
            id: uniqueLayerName,
            type: layerType,
            source: sourceId,
            'source-layer': sourceLayer,
            paint: finalPaint
        };

        // Add optional properties
        if (layout && Object.keys(layout).length > 0) {
            layerConfig.layout = layout;
        }
        if (filter) {
            layerConfig.filter = filter;
        }
        if (minzoom !== undefined) {
            layerConfig.minzoom = minzoom;
        }
        if (maxzoom !== undefined) {
            layerConfig.maxzoom = maxzoom;
        }

        // Add layer
        this.map.addLayer(layerConfig);

        return {
            content: [{
                type: 'text',
                text: `Added vector tileset layer "${uniqueLayerName}" from source "${sourceId}" (source layer: "${sourceLayer}")`
            }],
            isError: false,
            layerId: uniqueLayerName,
            sourceId: sourceId
        };
    }

    /**
     * Query rendered features in the viewport
     * @param {Object} args - Tool arguments
     * @param {Object} [args.point] - Screen point {x, y}
     * @param {Array<number>} [args.bbox] - Bounding box [x1, y1, x2, y2]
     * @param {Array<string>} [args.layers] - Layer IDs to query
     * @param {Array} [args.filter] - Filter expression
     * @param {number} [args.limit=100] - Max features to return
     * @param {boolean} [args.includeGeometry=true] - Include geometry
     * @returns {Object} Result with GeoJSON FeatureCollection
     */
    queryRenderedFeatures(args) {
        const {
            point,
            bbox,
            layers,
            filter,
            limit = 100,
            includeGeometry = true
        } = args;

        // Validation: cannot specify both point and bbox
        if (point && bbox) {
            throw new Error('Cannot specify both point and bbox parameters. Use one or the other.');
        }

        // Build query geometry
        let queryGeometry = undefined; // queries entire viewport
        if (point) {
            if (typeof point.x !== 'number' || typeof point.y !== 'number') {
                throw new Error('Invalid point coordinates. Expected {x: number, y: number}.');
            }
            queryGeometry = [point.x, point.y];
        } else if (bbox) {
            if (!Array.isArray(bbox) || bbox.length !== 4) {
                throw new Error('Invalid bbox format. Expected [x1, y1, x2, y2].');
            }
            queryGeometry = [[bbox[0], bbox[1]], [bbox[2], bbox[3]]];
        }

        // Build options
        const options = {};
        if (layers && layers.length > 0) {
            options.layers = layers;
        }
        if (filter) {
            options.filter = filter;
        }

        // Query map
        let features = this.map.queryRenderedFeatures(queryGeometry, options);

        // Apply limit
        features = features.slice(0, limit);

        // Strip geometry if requested
        if (!includeGeometry) {
            features = features.map(f => ({
                type: 'Feature',
                properties: f.properties,
                layer: f.layer,
                source: f.source,
                sourceLayer: f.sourceLayer
            }));
        }

        // Build FeatureCollection
        const featureCollection = {
            type: 'FeatureCollection',
            features: features
        };

        const queryDescription = point
            ? `at point (${point.x}, ${point.y})`
            : bbox
                ? `in bbox [${bbox.join(', ')}]`
                : 'in viewport';

        return {
            content: [{
                type: 'text',
                text: `Found ${features.length} rendered feature${features.length !== 1 ? 's' : ''} ${queryDescription}${layers ? ` in layers: ${layers.join(', ')}` : ''}`
            }],
            isError: false,
            data: featureCollection
        };
    }

    /**
     * Query features from a source
     * @param {Object} args - Tool arguments
     * @param {string} args.sourceId - Source ID to query
     * @param {string} [args.sourceLayer] - Source layer for vector tiles
     * @param {Array} [args.filter] - Filter expression
     * @param {number} [args.limit=1000] - Max features to return
     * @param {boolean} [args.includeGeometry=true] - Include geometry
     * @returns {Object} Result with GeoJSON FeatureCollection
     */
    querySourceFeatures(args) {
        const {
            sourceId,
            sourceLayer,
            filter,
            limit = 1000,
            includeGeometry = true
        } = args;

        // Validate source exists
        const source = this.map.getSource(sourceId);
        if (!source) {
            // Get available sources for helpful error message
            const availableSources = Object.keys(this.map.getStyle().sources);
            throw new Error(
                `Source "${sourceId}" not found. Available sources: ${availableSources.join(', ') || 'none'}. ` +
                `Make sure you're using the correct source ID from layer creation.`
            );
        }

        // For vector sources, require sourceLayer
        if (source.type === 'vector' && !sourceLayer) {
            throw new Error('sourceLayer parameter is required for vector tile sources');
        }

        // Build options
        const options = {};
        if (sourceLayer) {
            options.sourceLayer = sourceLayer;
        }
        if (filter) {
            options.filter = filter;
        }

        // Query source
        let features = this.map.querySourceFeatures(sourceId, options);

        // Apply limit
        features = features.slice(0, limit);

        // Strip geometry if requested
        if (!includeGeometry) {
            features = features.map(f => ({
                type: 'Feature',
                properties: f.properties,
                source: f.source,
                sourceLayer: f.sourceLayer
            }));
        }

        // Build FeatureCollection
        const featureCollection = {
            type: 'FeatureCollection',
            features: features
        };

        return {
            content: [{
                type: 'text',
                text: `Found ${features.length} feature${features.length !== 1 ? 's' : ''} from source "${sourceId}"${sourceLayer ? ` (layer: ${sourceLayer})` : ''}`
            }],
            isError: false,
            data: featureCollection
        };
    }

    /**
     * Get tool definitions for LLM function calling
     */
    getToolsForLLM() {
        return this.tools;
    }

    /**
     * Get all custom layer IDs created by this library
     */
    getCustomLayerIds() {
        const layers = this.map.getStyle().layers;
        return layers
            .filter(layer =>
                layer.id.includes('-layer-') ||
                layer.id.endsWith('-fill') ||
                layer.id.endsWith('-stroke')
            )
            .map(layer => layer.id);
    }

    /**
     * Destroy the instance and clean up event listeners
     */
    destroy() {
        this.clearMapLayers({});
        // Note: Event listeners will be automatically cleaned up when layers are removed
    }
}

// UMD export pattern for browser and Node.js compatibility
(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD
        define(['mapbox-gl'], factory);
    } else if (typeof module === 'object' && module.exports) {
        // Node.js - export both named and default
        const result = factory(require('mapbox-gl'));
        module.exports = result;
        module.exports.MapboxMapTools = result.MapboxMapTools;
        module.exports.default = result;
    } else {
        // Browser globals
        root.MapboxMapTools = factory(root.mapboxgl);
    }
}(typeof self !== 'undefined' ? self : this, function (mapboxgl) {
    // Make mapboxgl available to the class if it's passed as parameter
    if (mapboxgl && !window.mapboxgl && typeof window !== 'undefined') {
        window.mapboxgl = mapboxgl;
    }

    // Export the class directly for browser use
    return MapboxMapTools;
}));