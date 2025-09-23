/**
 * MCP Integration Example
 *
 * This example demonstrates how to integrate the Mapbox Map Tools library
 * with multiple MCP servers and LLM function calling for comprehensive
 * geospatial AI applications.
 */

import { MapboxMapTools } from 'mapbox-map-tools';
import mapboxgl from 'mapbox-gl';

/**
 * Mapbox MCP Client
 * Handles communication with the Mapbox hosted MCP server
 */
class MapboxMCPClient {
    constructor(accessToken, endpoint = 'https://mcp.mapbox.com/mcp') {
        this.accessToken = accessToken;
        this.endpoint = endpoint;
        this.requestId = 0;
    }

    async callTool(method, params) {
        const response = await fetch(this.endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.accessToken}`
            },
            body: JSON.stringify({
                jsonrpc: '2.0',
                id: ++this.requestId,
                method: `tools/${method}`,
                params
            })
        });

        const result = await response.json();
        if (result.error) {
            throw new Error(result.error.message);
        }

        return result.result;
    }

    getTools() {
        return [
            {
                name: 'mapbox_search_places',
                description: 'Search for places using Mapbox Search API',
                input_schema: {
                    type: 'object',
                    properties: {
                        q: { type: 'string', description: 'Search query' },
                        proximity: { type: 'string', description: 'Proximity bias as "lon,lat"' },
                        limit: { type: 'number', default: 10 }
                    },
                    required: ['q']
                }
            },
            {
                name: 'mapbox_get_directions',
                description: 'Get driving directions between points',
                input_schema: {
                    type: 'object',
                    properties: {
                        coordinates: {
                            type: 'array',
                            items: {
                                type: 'array',
                                items: { type: 'number' },
                                minItems: 2,
                                maxItems: 2
                            }
                        },
                        profile: { type: 'string', enum: ['driving', 'walking', 'cycling'], default: 'driving' }
                    },
                    required: ['coordinates']
                }
            }
        ];
    }
}

/**
 * Weather MCP Client
 * Example of another MCP server for weather data
 */
class WeatherMCPClient {
    constructor(endpoint) {
        this.endpoint = endpoint;
        this.requestId = 0;
    }

    async callTool(method, params) {
        // Implement weather MCP communication
        // This is a mock implementation
        return {
            temperature: 72,
            condition: 'sunny',
            humidity: 45
        };
    }

    getTools() {
        return [
            {
                name: 'get_weather',
                description: 'Get current weather for a location',
                input_schema: {
                    type: 'object',
                    properties: {
                        location: { type: 'string', description: 'Location name or coordinates' }
                    },
                    required: ['location']
                }
            }
        ];
    }
}

/**
 * Comprehensive Geospatial AI Application
 * Integrates multiple MCP servers with map visualization
 */
class GeospatialAI {
    constructor(mapContainer, config) {
        this.config = {
            mapboxToken: '',
            claudeApiKey: '',
            weatherEndpoint: '',
            ...config
        };

        this.initializeMap(mapContainer);
        this.initializeMCPClients();
        this.conversationHistory = [];
    }

    initializeMap(mapContainer) {
        mapboxgl.accessToken = this.config.mapboxToken;

        this.map = new mapboxgl.Map({
            container: mapContainer,
            style: 'mapbox://styles/mapbox/streets-v12',
            center: [-98.5795, 39.8283],
            zoom: 4
        });

        this.map.on('load', () => {
            this.mapTools = new MapboxMapTools(this.map, {
                enablePopups: true,
                enableHoverEffects: true
            });

            console.log('Map and visualization tools initialized');
        });
    }

    initializeMCPClients() {
        // Initialize MCP clients
        this.mapboxMCP = new MapboxMCPClient(this.config.mapboxToken);
        this.weatherMCP = new WeatherMCPClient(this.config.weatherEndpoint);

        console.log('MCP clients initialized');
    }

    /**
     * Get all available tools from all MCP servers and map tools
     */
    getAllTools() {
        return [
            ...this.mapboxMCP.getTools(),
            ...this.weatherMCP.getTools(),
            ...this.mapTools.getToolsForLLM()
        ];
    }

    /**
     * Process a user query with comprehensive tool integration
     */
    async processQuery(userMessage, onProgress = null) {
        if (onProgress) onProgress('Processing your request...');

        try {
            // Add user message to conversation history
            this.conversationHistory.push({
                role: 'user',
                content: userMessage
            });

            // Get all available tools
            const allTools = this.getAllTools();

            // Send to Claude (or your preferred LLM)
            const response = await this.callLLM(userMessage, allTools, onProgress);

            // Process the response and execute tools
            return await this.processLLMResponse(response, onProgress);

        } catch (error) {
            console.error('Error processing query:', error);
            return {
                text: `Sorry, I encountered an error: ${error.message}`,
                isError: true
            };
        }
    }

    /**
     * Call the LLM with available tools
     */
    async callLLM(message, tools, onProgress) {
        if (onProgress) onProgress('Calling AI assistant...');

        // This is a mock implementation - replace with your actual LLM client
        // Example for Claude:
        /*
        const anthropic = new Anthropic({ apiKey: this.config.claudeApiKey });

        return await anthropic.messages.create({
            model: "claude-3-sonnet-20240229",
            max_tokens: 4000,
            tools: tools,
            system: this.getSystemPrompt(),
            messages: this.conversationHistory
        });
        */

        // Mock response for demonstration
        if (message.toLowerCase().includes('restaurants in paris')) {
            return {
                content: [
                    {
                        type: 'tool_use',
                        id: 'search_1',
                        name: 'mapbox_search_places',
                        input: {
                            q: 'restaurants',
                            proximity: '2.3522,48.8566',
                            limit: 5
                        }
                    }
                ]
            };
        } else if (message.toLowerCase().includes('route')) {
            return {
                content: [
                    {
                        type: 'text',
                        text: "I'll create a route for you and show it on the map."
                    },
                    {
                        type: 'tool_use',
                        id: 'route_1',
                        name: 'add_route_to_map',
                        input: {
                            coordinates: [[-74.0059, 40.7128], [-118.2437, 34.0522]],
                            color: '#FF0000',
                            width: 5
                        }
                    },
                    {
                        type: 'tool_use',
                        id: 'fit_1',
                        name: 'fit_map_to_bounds',
                        input: {
                            coordinates: [[-74.0059, 40.7128], [-118.2437, 34.0522]]
                        }
                    }
                ]
            };
        }

        return {
            content: [
                {
                    type: 'text',
                    text: "I can help you with geospatial queries. Try asking about places, routes, or weather information!"
                }
            ]
        };
    }

    /**
     * Process LLM response and execute tools
     */
    async processLLMResponse(response, onProgress) {
        let assistantResponse = '';
        const toolResults = [];

        for (const content of response.content) {
            if (content.type === 'text') {
                assistantResponse += content.text;
            } else if (content.type === 'tool_use') {
                if (onProgress) onProgress(`Executing: ${content.name}`);

                const result = await this.executeTool(content.name, content.input);
                toolResults.push(result);
            }
        }

        // Add assistant message to conversation history
        this.conversationHistory.push({
            role: 'assistant',
            content: assistantResponse || 'I've updated the map with your requested information.'
        });

        return {
            text: assistantResponse || 'I've processed your request and updated the map.',
            toolResults,
            isError: false
        };
    }

    /**
     * Execute a tool call by routing to the appropriate service
     */
    async executeTool(toolName, input) {
        console.log(`Executing tool: ${toolName}`, input);

        try {
            // Route to Mapbox MCP
            if (this.mapboxMCP.getTools().find(t => t.name === toolName)) {
                return await this.executeMapboxTool(toolName, input);
            }

            // Route to Weather MCP
            if (this.weatherMCP.getTools().find(t => t.name === toolName)) {
                return await this.executeWeatherTool(toolName, input);
            }

            // Route to Map Visualization Tools
            if (this.mapTools.getToolsForLLM().find(t => t.name === toolName)) {
                return await this.mapTools.executeTool(toolName, input);
            }

            throw new Error(`Unknown tool: ${toolName}`);

        } catch (error) {
            console.error(`Error executing ${toolName}:`, error);
            return {
                content: [{ type: 'text', text: `Error: ${error.message}` }],
                isError: true
            };
        }
    }

    async executeMapboxTool(toolName, input) {
        switch (toolName) {
            case 'mapbox_search_places':
                const places = await this.mapboxMCP.callTool('search_places', input);

                // Automatically visualize the search results
                if (places.features && places.features.length > 0) {
                    await this.mapTools.executeTool('add_points_to_map', {
                        points: places.features.map(feature => ({
                            longitude: feature.geometry.coordinates[0],
                            latitude: feature.geometry.coordinates[1],
                            title: feature.properties.name || feature.properties.text,
                            description: feature.properties.address || ''
                        }))
                    });

                    // Fit map to show all results
                    await this.mapTools.executeTool('fit_map_to_bounds', {
                        coordinates: places.features.map(f => f.geometry.coordinates)
                    });
                }

                return {
                    content: [{
                        type: 'text',
                        text: `Found ${places.features.length} places and added them to the map.`
                    }]
                };

            case 'mapbox_get_directions':
                const directions = await this.mapboxMCP.callTool('get_directions', input);

                // Automatically visualize the route
                if (directions.routes && directions.routes[0]) {
                    const route = directions.routes[0];
                    await this.mapTools.executeTool('add_route_to_map', {
                        coordinates: route.geometry.coordinates,
                        color: '#0074D9',
                        width: 5
                    });

                    // Fit map to route
                    await this.mapTools.executeTool('fit_map_to_bounds', {
                        coordinates: route.geometry.coordinates
                    });
                }

                return {
                    content: [{
                        type: 'text',
                        text: `Route calculated and displayed on map. Distance: ${Math.round(directions.routes[0].distance / 1000)}km, Duration: ${Math.round(directions.routes[0].duration / 60)}min`
                    }]
                };

            default:
                throw new Error(`Unknown Mapbox tool: ${toolName}`);
        }
    }

    async executeWeatherTool(toolName, input) {
        switch (toolName) {
            case 'get_weather':
                const weather = await this.weatherMCP.callTool('get_weather', input);
                return {
                    content: [{
                        type: 'text',
                        text: `Weather in ${input.location}: ${weather.temperature}°F, ${weather.condition}, humidity ${weather.humidity}%`
                    }]
                };

            default:
                throw new Error(`Unknown weather tool: ${toolName}`);
        }
    }

    getSystemPrompt() {
        return `You are a geospatial AI assistant with access to multiple data sources and visualization tools.

Available capabilities:
1. Mapbox tools: Search for places, get directions, geocoding
2. Weather tools: Get current weather conditions
3. Map visualization tools: Add points, routes, polygons, control map view

Guidelines:
- Always visualize geographic data on the map when possible
- Combine data retrieval with visualization for the best user experience
- Use specific, descriptive layer names for organization
- Provide helpful context about the data you're showing

When users ask about:
- Places or locations: Use mapbox_search_places then add_points_to_map
- Routes or directions: Use mapbox_get_directions then add_route_to_map
- Weather: Use get_weather for current conditions
- Areas or regions: Use add_polygon_to_map for boundaries

Always aim to provide both textual information and visual representation.`;
    }

    /**
     * Clear conversation history
     */
    clearHistory() {
        this.conversationHistory = [];
    }

    /**
     * Clear all map layers
     */
    async clearMap() {
        if (this.mapTools) {
            return await this.mapTools.executeTool('clear_map_layers', {});
        }
    }
}

// Example usage
export default class App {
    constructor() {
        this.ai = new GeospatialAI('map-container', {
            mapboxToken: 'your-mapbox-token',
            claudeApiKey: 'your-claude-api-key',
            weatherEndpoint: 'https://api.weather.com/mcp'
        });
    }

    async handleUserInput(message) {
        const response = await this.ai.processQuery(message, (status) => {
            console.log('Progress:', status);
            // Update UI with progress
        });

        console.log('AI Response:', response.text);
        return response;
    }
}

/**
 * Usage examples:
 *
 * const app = new App();
 *
 * // Search and visualize places
 * await app.handleUserInput("Show me coffee shops in San Francisco");
 *
 * // Create routes with directions
 * await app.handleUserInput("Show me the route from New York to Boston");
 *
 * // Combine multiple data sources
 * await app.handleUserInput("Find restaurants in Paris and show me the weather there");
 *
 * // Complex multi-step queries
 * await app.handleUserInput("Plan a road trip from Los Angeles to San Francisco, show gas stations along the route and the weather at both cities");
 */