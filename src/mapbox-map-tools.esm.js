/**
 * Mapbox Map Tools Library - ES Module Version
 * A JavaScript library providing MCP-compatible tools for Mapbox GL JS map visualization
 *
 * This library provides a set of tools that can be used with Language Learning Models (LLMs)
 * to visualize geospatial data on Mapbox maps through function calling / tool use.
 *
 * @version 1.1.0
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
        // Registry of everything this instance has put on the map (plus
        // anything the host app registers via registerExternalLayers), so
        // clearing/removal never has to guess from layer-id patterns.
        this.createdLayers = new Set();
        this.createdSources = new Set();
        // Most recent route coordinates, so draw_trip_on_map({useLastRoute})
        // can redraw a route without the LLM echoing the geometry.
        this.lastRouteCoordinates = null;
        this.tools = this.initializeTools();
    }

    /**
     * Remember route coordinates fetched/drawn outside these tools (e.g. by
     * the host app from a directions API) for draw_trip_on_map({useLastRoute}).
     * @param {Array<Array<number>>} coordinates - [lng, lat] pairs
     */
    setLastRoute(coordinates) {
        if (Array.isArray(coordinates) && coordinates.length >= 2) {
            this.lastRouteCoordinates = coordinates;
        }
    }

    /**
     * Track a layer (and optionally its source) created by this library.
     * @private
     */
    _registerLayer(layerId, sourceId) {
        this.createdLayers.add(layerId);
        if (sourceId) this.createdSources.add(sourceId);
    }

    /**
     * Register layers/sources the host application created itself, so
     * clear_map_layers and remove_layer can manage them too.
     * @param {Array<string>} layerIds
     * @param {Array<string>} [sourceIds]
     */
    registerExternalLayers(layerIds = [], sourceIds = []) {
        layerIds.forEach(id => this.createdLayers.add(id));
        sourceIds.forEach(id => this.createdSources.add(id));
    }

    /**
     * Resolve when the camera settles after an animated movement (or after
     * a timeout, so a missing moveend can never hang a tool call).
     * @private
     */
    _awaitMoveEnd(timeoutMs = 4000) {
        return new Promise(resolve => {
            let settled = false;
            const finish = () => {
                if (settled) return;
                settled = true;
                clearTimeout(timer);
                resolve();
            };
            const timer = setTimeout(() => {
                this.map.off('moveend', finish);
                finish();
            }, timeoutMs);
            this.map.once('moveend', finish);
        });
    }

    /**
     * Define available map tools for LLM function calling
     */
    initializeTools() {
        const pointItemSchema = {
            type: 'object',
            properties: {
                longitude: { type: 'number', minimum: -180, maximum: 180 },
                latitude: { type: 'number', minimum: -90, maximum: 90 },
                title: { type: 'string', description: 'Popup title' },
                description: { type: 'string', description: 'Popup body text' },
                color: { type: 'string', default: '#FF0000', description: 'Marker color (hex)' }
            },
            required: ['longitude', 'latitude']
        };
        const lngLatPairSchema = {
            type: 'array',
            items: { type: 'number' },
            minItems: 2,
            maxItems: 2
        };

        return [
            {
                name: 'draw_trip_on_map',
                description: 'Draw a complete trip in one call: clears previous visualizations, adds point markers, draws the optional route line, and frames the camera over everything. Call this whenever you present an itinerary, trip plan, or set of recommended places — one call replaces the clear/points/route/fit-bounds chain.',
                input_schema: {
                    type: 'object',
                    properties: {
                        points: {
                            type: 'array',
                            description: 'Markers for the stops/places (hotels, attractions, …)',
                            items: pointItemSchema
                        },
                        route: {
                            type: 'array',
                            description: 'Optional route line as sequential [longitude, latitude] pairs',
                            items: lngLatPairSchema,
                            minItems: 2
                        },
                        useLastRoute: {
                            type: 'boolean',
                            default: false,
                            description: 'Draw the most recently fetched/drawn route without re-passing its coordinates — prefer this over echoing a long route array'
                        },
                        routeColor: { type: 'string', default: '#0074D9', description: 'Route line color (hex)' },
                        routeWidth: { type: 'number', default: 4, description: 'Route line width in pixels' },
                        clearFirst: { type: 'boolean', default: true, description: 'Clear previous visualizations first' },
                        fit: { type: 'boolean', default: true, description: 'Frame the camera over all drawn features' }
                    },
                    required: ['points']
                }
            },
            {
                name: 'add_points_to_map',
                description: 'Add colored circle markers with optional popups. Call this to mark specific locations (hotels, POIs, stops) on the map.',
                input_schema: {
                    type: 'object',
                    properties: {
                        points: {
                            type: 'array',
                            description: 'Points to add',
                            items: pointItemSchema
                        },
                        layerName: { type: 'string', default: 'points-layer', description: 'Base name for the created layer' }
                    },
                    required: ['points']
                }
            },
            {
                name: 'add_route_to_map',
                description: 'Draw a line connecting coordinates in order. Call this to show a route, path, or journey between locations. Coordinates are sequential [longitude, latitude] pairs.',
                input_schema: {
                    type: 'object',
                    properties: {
                        coordinates: {
                            type: 'array',
                            description: 'Sequential [longitude, latitude] pairs along the route',
                            items: lngLatPairSchema,
                            minItems: 2
                        },
                        color: { type: 'string', default: '#0074D9', description: 'Line color (hex)' },
                        width: { type: 'number', default: 4, description: 'Line width in pixels' },
                        layerName: { type: 'string', default: 'route-layer', description: 'Base name for the created layer' }
                    },
                    required: ['coordinates']
                }
            },
            {
                name: 'pan_map_to_location',
                description: 'Center the map on one location. Call this to focus the view on a single place.',
                input_schema: {
                    type: 'object',
                    properties: {
                        longitude: { type: 'number', minimum: -180, maximum: 180 },
                        latitude: { type: 'number', minimum: -90, maximum: 90 },
                        zoom: { type: 'number', minimum: 0, maximum: 22, default: 12 },
                        animate: { type: 'boolean', default: true, description: 'Animate the movement instead of jumping' }
                    },
                    required: ['longitude', 'latitude']
                }
            },
            {
                name: 'fit_map_to_bounds',
                description: 'Zoom and pan so all given coordinates are visible. Call this after drawing multiple features so the user sees them all.',
                input_schema: {
                    type: 'object',
                    properties: {
                        coordinates: {
                            type: 'array',
                            description: '[longitude, latitude] pairs to fit in view',
                            items: lngLatPairSchema
                        },
                        padding: { type: 'number', default: 50, description: 'Viewport padding in pixels' }
                    },
                    required: ['coordinates']
                }
            },
            {
                name: 'add_polygon_to_map',
                description: 'Draw a filled polygon. Call this to show an area, region, boundary, or zone. Coordinates are rings of [longitude, latitude] pairs; the first ring is the exterior, additional rings are holes.',
                input_schema: {
                    type: 'object',
                    properties: {
                        coordinates: {
                            type: 'array',
                            description: 'Coordinate rings ([longitude, latitude] pairs); first ring is the exterior',
                            items: { type: 'array', items: lngLatPairSchema }
                        },
                        fillColor: { type: 'string', default: '#FF0000', description: 'Fill color (hex)' },
                        fillOpacity: { type: 'number', default: 0.3, description: '0.0 transparent – 1.0 opaque' },
                        strokeColor: { type: 'string', default: '#FF0000', description: 'Border color (hex)' },
                        strokeWidth: { type: 'number', default: 2, description: 'Border width in pixels' },
                        layerName: { type: 'string', default: 'polygon-layer', description: 'Base name for the created layer' }
                    },
                    required: ['coordinates']
                }
            },
            {
                name: 'clear_map_layers',
                description: 'Remove visualizations added by these tools — all of them, or only the named layers. Call this before drawing a new visualization so stale layers do not pile up.',
                input_schema: {
                    type: 'object',
                    properties: {
                        layerNames: {
                            type: 'array',
                            items: { type: 'string' },
                            description: 'Layer names to remove; omit to remove all custom layers'
                        }
                    }
                }
            },
            {
                name: 'remove_layer',
                description: 'Remove a single layer (and its source once unused). Call this to delete one visualization without clearing everything else.',
                input_schema: {
                    type: 'object',
                    properties: {
                        layerName: { type: 'string', description: 'Layer ID as returned when the layer was created' }
                    },
                    required: ['layerName']
                }
            },
            {
                name: 'set_layer_visibility',
                description: 'Show or hide an existing layer without removing it. Call this to toggle a visualization on or off.',
                input_schema: {
                    type: 'object',
                    properties: {
                        layerName: { type: 'string', description: 'Layer ID as returned when the layer was created' },
                        visible: { type: 'boolean', description: 'true to show, false to hide' }
                    },
                    required: ['layerName', 'visible']
                }
            },
            {
                name: 'get_map_state',
                description: 'Get the current map center, zoom, bounds, style, and the custom layers on the map. Call this when you need to know what the map is currently showing.',
                input_schema: { type: 'object', properties: {} }
            },
            {
                name: 'set_map_style',
                description: 'Switch the base map style/theme.',
                input_schema: {
                    type: 'object',
                    properties: {
                        style: {
                            type: 'string',
                            enum: ['streets-v12', 'outdoors-v12', 'light-v11', 'dark-v11', 'satellite-v9', 'satellite-streets-v12'],
                            default: 'streets-v12'
                        }
                    },
                    required: ['style']
                }
            },
            {
                name: 'add_vector_tileset_layer',
                description: 'Add a vector tileset (e.g. "mapbox://mapbox.mapbox-traffic-v1") as a styled layer. Call this to show large pre-tiled datasets such as traffic, terrain, or boundaries.',
                input_schema: {
                    type: 'object',
                    properties: {
                        tilesetUrl: {
                            type: 'string',
                            description: 'Tileset URL: "mapbox://…" or an http(s) tile URL template'
                        },
                        sourceLayer: {
                            type: 'string',
                            description: 'Source layer inside the tileset (e.g. "traffic")'
                        },
                        layerType: {
                            type: 'string',
                            enum: ['line', 'fill', 'circle', 'fill-extrusion', 'symbol'],
                            description: 'How to render the features'
                        },
                        layerName: { type: 'string', default: 'vector-tileset-layer', description: 'Base name for the created layer' },
                        paint: {
                            type: 'object',
                            description: 'Mapbox GL paint properties, expressions supported (e.g. {"line-color": "#FF0000", "line-width": 3})',
                            additionalProperties: true
                        },
                        layout: {
                            type: 'object',
                            description: 'Mapbox GL layout properties (e.g. {"line-cap": "round"})',
                            additionalProperties: true
                        },
                        filter: {
                            type: 'array',
                            description: 'Mapbox GL filter expression (e.g. ["==", ["get", "congestion"], "heavy"])',
                            items: {}
                        },
                        minzoom: { type: 'number', minimum: 0, maximum: 24 },
                        maxzoom: { type: 'number', minimum: 0, maximum: 24 }
                    },
                    required: ['tilesetUrl', 'sourceLayer', 'layerType']
                }
            },
            {
                name: 'query_rendered_features',
                description: 'List features currently rendered in the viewport, optionally at a screen point or within a screen-pixel bbox. Call this to inspect what is visible on the map right now.',
                input_schema: {
                    type: 'object',
                    properties: {
                        point: {
                            type: 'object',
                            description: 'Screen point in pixels from the top-left corner (mutually exclusive with bbox)',
                            properties: {
                                x: { type: 'number' },
                                y: { type: 'number' }
                            },
                            required: ['x', 'y']
                        },
                        bbox: {
                            type: 'array',
                            description: 'Screen-pixel bounding box [x1, y1, x2, y2] (mutually exclusive with point)',
                            items: { type: 'number' },
                            minItems: 4,
                            maxItems: 4
                        },
                        layers: {
                            type: 'array',
                            items: { type: 'string' },
                            description: 'Restrict to these layer IDs'
                        },
                        filter: {
                            type: 'array',
                            description: 'Mapbox GL filter expression',
                            items: {}
                        },
                        limit: { type: 'number', default: 100, minimum: 1, maximum: 1000 },
                        includeGeometry: { type: 'boolean', default: true, description: 'Set false for a smaller, properties-only response' }
                    }
                }
            },
            {
                name: 'query_source_features',
                description: 'Read features straight from a data source, regardless of viewport, zoom, or style filters. Call this to analyze a complete dataset already added to the map.',
                input_schema: {
                    type: 'object',
                    properties: {
                        sourceId: {
                            type: 'string',
                            description: 'Source to query — the layer ID for layers created by these tools, or the sourceId returned by add_vector_tileset_layer'
                        },
                        sourceLayer: {
                            type: 'string',
                            description: 'Required for vector tile sources; ignored for GeoJSON sources'
                        },
                        filter: {
                            type: 'array',
                            description: 'Mapbox GL filter expression',
                            items: {}
                        },
                        limit: { type: 'number', default: 1000, minimum: 1, maximum: 10000 },
                        includeGeometry: { type: 'boolean', default: true, description: 'Set false for a smaller, properties-only response' }
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
                case 'draw_trip_on_map':
                    return await this.drawTripOnMap(args);
                case 'add_points_to_map':
                    return this.addPointsToMap(args);
                case 'add_route_to_map':
                    return this.addRouteToMap(args);
                case 'pan_map_to_location':
                    return await this.panMapToLocation(args);
                case 'fit_map_to_bounds':
                    return await this.fitMapToBounds(args);
                case 'add_polygon_to_map':
                    return this.addPolygonToMap(args);
                case 'clear_map_layers':
                    return this.clearMapLayers(args);
                case 'remove_layer':
                    return this.removeLayer(args);
                case 'set_layer_visibility':
                    return this.setLayerVisibility(args);
                case 'get_map_state':
                    return this.getMapState(args);
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
                isError: true,
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Draw a complete trip — points, optional route line, camera framing —
     * in a single tool call.
     */
    async drawTripOnMap(args) {
        const {
            points = [],
            useLastRoute = false,
            routeColor = this.options.defaultRouteColor,
            routeWidth = this.options.defaultRouteWidth,
            clearFirst = true,
            fit = true
        } = args;
        let { route } = args;

        if (useLastRoute && !(Array.isArray(route) && route.length >= 2)) {
            route = this.lastRouteCoordinates;
        }
        const hasRoute = Array.isArray(route) && route.length >= 2;
        if (points.length === 0 && !hasRoute) {
            throw new Error('draw_trip_on_map needs at least one point or a route with 2+ coordinates (or useLastRoute after a route was drawn)');
        }

        if (clearFirst) {
            this.clearMapLayers({});
        }

        const layerIds = [];
        if (hasRoute) {
            const r = this.addRouteToMap({
                coordinates: route,
                color: routeColor,
                width: routeWidth,
                layerName: 'trip-route'
            });
            layerIds.push(r.layerId);
        }
        if (points.length > 0) {
            const r = this.addPointsToMap({ points, layerName: 'trip-points' });
            layerIds.push(r.layerId);
        }

        let bounds = null;
        if (fit) {
            const coordinates = [
                ...points.map(p => [p.longitude, p.latitude]),
                ...(hasRoute ? route : [])
            ];
            const r = await this.fitMapToBounds({ coordinates, padding: 60 });
            bounds = r.bounds || null;
        }

        return {
            content: [{
                type: 'text',
                text: `Trip drawn: ${points.length} marker${points.length !== 1 ? 's' : ''}${hasRoute ? ' + route line' : ''}${fit ? ', camera framed over the trip' : ''}.`
            }],
            isError: false,
            success: true,
            pointsAdded: points.length,
            routeDrawn: hasRoute,
            layerIds,
            bounds
        };
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

        this._registerLayer(uniqueLayerName, uniqueLayerName);

        return {
            content: [{
                type: 'text',
                text: `Added ${points.length} points to map layer "${uniqueLayerName}"`
            }],
            isError: false,
            success: true,
            pointsAdded: points.length,
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

        this._registerLayer(uniqueLayerName, uniqueLayerName);
        this.lastRouteCoordinates = coordinates;

        return {
            content: [{
                type: 'text',
                text: `Added route with ${coordinates.length} points to map layer "${uniqueLayerName}"`
            }],
            isError: false,
            success: true,
            layerId: uniqueLayerName
        };
    }

    /**
     * Pan map to a location. Resolves once the camera has settled.
     */
    async panMapToLocation(args) {
        const { longitude, latitude, zoom = 12, animate = true } = args;

        if (animate) {
            this.map.flyTo({
                center: [longitude, latitude],
                zoom: zoom,
                duration: 2000
            });
            await this._awaitMoveEnd();
        } else {
            this.map.setCenter([longitude, latitude]);
            this.map.setZoom(zoom);
        }

        return {
            content: [{
                type: 'text',
                text: `Map centered on ${latitude.toFixed(4)}, ${longitude.toFixed(4)} at zoom level ${zoom}`
            }],
            isError: false,
            success: true
        };
    }

    /**
     * Fit map to bounds of coordinates. Resolves once the camera has settled.
     */
    async fitMapToBounds(args) {
        const { coordinates, padding = 50 } = args;

        if (coordinates.length === 0) {
            throw new Error('No coordinates provided');
        }

        const bounds = coordinates.reduce((bounds, coord) => {
            return bounds.extend(coord);
        }, new mapboxgl.LngLatBounds(coordinates[0], coordinates[0]));

        this.map.fitBounds(bounds, { padding: padding });
        await this._awaitMoveEnd();

        return {
            content: [{
                type: 'text',
                text: `Map view adjusted to fit ${coordinates.length} coordinates`
            }],
            isError: false,
            success: true,
            bounds: {
                west: bounds.getWest(),
                south: bounds.getSouth(),
                east: bounds.getEast(),
                north: bounds.getNorth()
            }
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

        this._registerLayer(`${uniqueLayerName}-fill`, uniqueLayerName);
        this._registerLayer(`${uniqueLayerName}-stroke`);

        return {
            content: [{
                type: 'text',
                text: `Added polygon to map layer "${uniqueLayerName}"`
            }],
            isError: false,
            success: true,
            layerId: uniqueLayerName
        };
    }

    /**
     * Remove a layer from the map and forget it. Companion -fill/-stroke
     * layers (polygons) are removed alongside the base name.
     * @private
     */
    _removeLayerByName(name) {
        let removed = 0;
        [name, `${name}-fill`, `${name}-stroke`].forEach(id => {
            if (this.map.getLayer(id)) {
                this.map.removeLayer(id);
                removed++;
            }
            this.createdLayers.delete(id);
        });
        return removed;
    }

    /**
     * Remove a source if no remaining layer uses it.
     * @private
     */
    _removeSourceIfOrphaned(sourceId) {
        if (!this.map.getSource(sourceId)) {
            this.createdSources.delete(sourceId);
            return;
        }
        const used = this.map.getStyle().layers.some(l => l.source === sourceId);
        if (!used) {
            this.map.removeSource(sourceId);
            this.createdSources.delete(sourceId);
        }
    }

    /**
     * Clear map layers. Uses the layer registry; the legacy id-pattern sweep
     * is kept as a fallback for layers created before the registry existed.
     */
    clearMapLayers(args) {
        const { layerNames = [] } = args || {};
        let removedCount = 0;

        if (layerNames.length === 0) {
            // Registry first — everything this instance (or the host app,
            // via registerExternalLayers) put on the map.
            [...this.createdLayers].forEach(id => {
                removedCount += this._removeLayerByName(id);
            });

            // Legacy fallback: pattern-matched layers from code paths that
            // bypassed the registry.
            this.map.getStyle().layers
                .filter(layer =>
                    layer.id.includes('-layer-') ||
                    layer.id.endsWith('-fill') ||
                    layer.id.endsWith('-stroke')
                )
                .forEach(layer => {
                    removedCount += this._removeLayerByName(layer.id);
                });

            // Drop sources that no longer back any layer.
            [...this.createdSources].forEach(id => this._removeSourceIfOrphaned(id));
            Object.keys(this.map.getStyle().sources)
                .filter(id => id.includes('-layer-') || id.endsWith('-vector-source'))
                .forEach(id => this._removeSourceIfOrphaned(id));
        } else {
            layerNames.forEach(layerName => {
                removedCount += this._removeLayerByName(layerName);
                this._removeSourceIfOrphaned(layerName);
            });

            // Drop vector sources orphaned by the removals above.
            Object.keys(this.map.getStyle().sources)
                .filter(id => id.endsWith('-vector-source'))
                .forEach(id => this._removeSourceIfOrphaned(id));
        }

        return {
            content: [{
                type: 'text',
                text: `Removed ${removedCount} layers from the map`
            }],
            isError: false,
            success: true,
            removedCount
        };
    }

    /**
     * Remove a single layer (and its source once unused)
     */
    removeLayer(args) {
        const { layerName } = args;
        const removed = this._removeLayerByName(layerName);
        if (removed === 0) {
            const known = [...this.createdLayers].filter(id => this.map.getLayer(id));
            throw new Error(`Layer "${layerName}" not found. Current custom layers: ${known.join(', ') || 'none'}`);
        }
        this._removeSourceIfOrphaned(layerName);

        return {
            content: [{
                type: 'text',
                text: `Removed layer "${layerName}"`
            }],
            isError: false,
            success: true,
            removedCount: removed
        };
    }

    /**
     * Show or hide an existing layer
     */
    setLayerVisibility(args) {
        const { layerName, visible } = args;
        const ids = [layerName, `${layerName}-fill`, `${layerName}-stroke`]
            .filter(id => this.map.getLayer(id));
        if (ids.length === 0) {
            const known = [...this.createdLayers].filter(id => this.map.getLayer(id));
            throw new Error(`Layer "${layerName}" not found. Current custom layers: ${known.join(', ') || 'none'}`);
        }
        ids.forEach(id => this.map.setLayoutProperty(id, 'visibility', visible ? 'visible' : 'none'));

        return {
            content: [{
                type: 'text',
                text: `${visible ? 'Showing' : 'Hid'} layer "${layerName}"`
            }],
            isError: false,
            success: true,
            layerIds: ids,
            visible
        };
    }

    /**
     * Report the current camera and custom-layer state
     */
    getMapState() {
        const center = this.map.getCenter();
        const bounds = this.map.getBounds();
        const zoom = this.map.getZoom();
        const style = this.map.getStyle();
        const customLayers = [...this.createdLayers].filter(id => this.map.getLayer(id));

        return {
            content: [{
                type: 'text',
                text: `Map centered at [${center.lng.toFixed(4)}, ${center.lat.toFixed(4)}], zoom ${zoom.toFixed(1)}, ${customLayers.length} custom layer${customLayers.length !== 1 ? 's' : ''}`
            }],
            isError: false,
            success: true,
            center: [center.lng, center.lat],
            zoom,
            bounds: {
                west: bounds.getWest(),
                south: bounds.getSouth(),
                east: bounds.getEast(),
                north: bounds.getNorth()
            },
            styleName: style?.name || null,
            customLayers
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
            isError: false,
            success: true
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
        this._registerLayer(uniqueLayerName, sourceId);

        return {
            content: [{
                type: 'text',
                text: `Added vector tileset layer "${uniqueLayerName}" from source "${sourceId}" (source layer: "${sourceLayer}")`
            }],
            isError: false,
            success: true,
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
            success: true,
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
            success: true,
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
     * Get all custom layer IDs created by this library (registry-backed,
     * with the legacy id-pattern sweep as a fallback)
     */
    getCustomLayerIds() {
        const ids = new Set([...this.createdLayers].filter(id => this.map.getLayer(id)));
        this.map.getStyle().layers
            .filter(layer =>
                layer.id.includes('-layer-') ||
                layer.id.endsWith('-fill') ||
                layer.id.endsWith('-stroke')
            )
            .forEach(layer => ids.add(layer.id));
        return [...ids];
    }

    /**
     * Destroy the instance and clean up event listeners
     */
    destroy() {
        this.clearMapLayers({});
        // Note: Event listeners will be automatically cleaned up when layers are removed
    }
}

export default MapboxMapTools;
