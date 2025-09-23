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

export class MapboxMapTools {
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
        // Node.js
        module.exports = factory(require('mapbox-gl'));
    } else {
        // Browser globals
        root.MapboxMapTools = factory(root.mapboxgl);
    }
}(typeof self !== 'undefined' ? self : this, function (mapboxgl) {
    // Make mapboxgl available to the class if it's passed as parameter
    if (mapboxgl && !window.mapboxgl) {
        window.mapboxgl = mapboxgl;
    }
    return { MapboxMapTools };
}));