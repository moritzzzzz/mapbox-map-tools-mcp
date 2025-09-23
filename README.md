# Mapbox Map MCP Tools Library

A JavaScript library providing MCP (Model Context Protocol) compatible tools for Mapbox GL JS map visualization with LLM function calling support.

This library enables Large Language Models (LLMs) like Claude, GPT-4, and others to interact with and control Mapbox GL JS maps through structured function calls. It's designed to work seamlessly with the Mapbox hosted MCP server and other HTTP MCP servers for comprehensive geospatial AI applications.

## Features

- 🗺️ **Full Mapbox GL JS Integration** - Works with any Mapbox GL JS map instance
- 🤖 **LLM Function Calling** - MCP-compatible tool definitions for AI assistants
- 🎯 **Point Visualization** - Add markers with popups and custom styling
- 🛤️ **Route Drawing** - Visualize paths, routes, and travel itineraries
- 🏔️ **Polygon Support** - Display areas, regions, and boundaries
- 📍 **Map Navigation** - Pan, zoom, and fit bounds programmatically
- 🎨 **Style Control** - Switch between different Mapbox map styles
- 🧹 **Layer Management** - Clear and organize map layers
- 📱 **Framework Agnostic** - Works with React, Vue, Angular, or vanilla JS
- 🌐 **Universal Module** - UMD, ESM, and CommonJS builds included

## Installation

### NPM (recommended)
```bash
npm install mapbox-map-tools
```

### CDN
```html
<!-- Include Mapbox GL JS first -->
<script src='https://api.mapbox.com/mapbox-gl-js/v3.0.1/mapbox-gl.js'></script>
<link href='https://api.mapbox.com/mapbox-gl-js/v3.0.1/mapbox-gl.css' rel='stylesheet' />

<!-- Include Mapbox Map Tools -->
<script src='https://unpkg.com/mapbox-map-tools@latest/dist/mapbox-map-tools.min.js'></script>
```

### ES Modules
```javascript
import { MapboxMapTools } from 'mapbox-map-tools';
```

## Quick Start

### Basic Setup

```javascript
import { MapboxMapTools } from 'mapbox-map-tools';
import mapboxgl from 'mapbox-gl';

// Initialize your Mapbox map
mapboxgl.accessToken = 'your-mapbox-access-token';
const map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/streets-v12',
    center: [-74.5, 40],
    zoom: 9
});

// Create map tools instance
const mapTools = new MapboxMapTools(map);

// Get tools for LLM function calling
const tools = mapTools.getToolsForLLM();

// Execute a tool directly
const result = await mapTools.executeTool('add_points_to_map', {
    points: [
        {
            longitude: -74.006,
            latitude: 40.7128,
            title: "New York City",
            description: "The Big Apple",
            color: "#FF0000"
        }
    ]
});
```

### Integration with Claude AI

```javascript
// Using with Claude's function calling
const claudeTools = mapTools.getToolsForLLM();

const message = await claude.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1000,
    tools: claudeTools,
    messages: [
        {
            role: "user",
            content: "Show me a route from New York to Boston on the map"
        }
    ]
});

// Handle tool use in Claude's response
for (const content of message.content) {
    if (content.type === 'tool_use') {
        const result = await mapTools.executeTool(content.name, content.input);
        console.log('Tool executed:', result);
    }
}
```

## Integration with MCP Servers

This library is designed to work alongside MCP servers, particularly the Mapbox hosted MCP server, to create powerful geospatial AI applications.

### Architecture Overview

<img width="1024" height="1024" alt="architecture_1_mcp_mapbox" src="https://github.com/user-attachments/assets/1e6a83c3-7d6a-4343-9826-aff8cf741965" />


### Example Integration with Multiple MCP Servers

```javascript
class GeospatialAI {
    constructor(map, claudeApiKey) {
        // Initialize map tools
        this.mapTools = new MapboxMapTools(map);

        // Initialize MCP clients
        this.mapboxMCP = new MapboxMCPClient('your-token', 'https://mcp.mapbox.com/mcp');
        this.weatherMCP = new WeatherMCPClient('https://api.weather.com/mcp');

        // Initialize Claude client
        this.claude = new ClaudeClient(claudeApiKey);
    }

    async processQuery(userMessage) {
        // Combine tools from all sources
        const allTools = [
            ...this.mapboxMCP.getTools(),      // Place search, geocoding, directions
            ...this.weatherMCP.getTools(),     // Weather data
            ...this.mapTools.getToolsForLLM()  // Map visualization
        ];

        // Send to Claude with all available tools
        const response = await this.claude.messages.create({
            model: "claude-sonnet-4-20250514",
            max_tokens: 4000,
            tools: allTools,
            messages: [{ role: "user", content: userMessage }]
        });

        // Execute tools based on Claude's response
        for (const content of response.content) {
            if (content.type === 'tool_use') {
                const result = await this.executeTool(content.name, content.input);
                // Handle result...
            }
        }

        return response;
    }

    async executeTool(toolName, input) {
        // Route tool execution to appropriate service
        if (this.mapTools.getToolsForLLM().find(t => t.name === toolName)) {
            return await this.mapTools.executeTool(toolName, input);
        } else if (this.mapboxMCP.hasTools(toolName)) {
            return await this.mapboxMCP.executeTool(toolName, input);
        } else if (this.weatherMCP.hasTools(toolName)) {
            return await this.weatherMCP.executeTool(toolName, input);
        }
        throw new Error(`Unknown tool: ${toolName}`);
    }
}

// Usage
const app = new GeospatialAI(map, 'your-claude-api-key');
const result = await app.processQuery("Show me coffee shops in Paris and display the weather there");
```

## Available Tools

### add_points_to_map
Add point markers to the map with optional popup information.

```javascript
await mapTools.executeTool('add_points_to_map', {
    points: [
        {
            longitude: -74.006,
            latitude: 40.7128,
            title: "New York City",
            description: "The most populous city in the United States",
            color: "#FF0000"
        },
        {
            longitude: -118.2437,
            latitude: 34.0522,
            title: "Los Angeles",
            description: "City of Angels",
            color: "#00FF00"
        }
    ],
    layerName: "cities"
});
```

### add_route_to_map
Draw routes, paths, or travel lines between locations.

```javascript
await mapTools.executeTool('add_route_to_map', {
    coordinates: [
        [-74.006, 40.7128],    // New York
        [-75.1652, 39.9526],   // Philadelphia
        [-77.0369, 38.9072],   // Washington DC
        [-80.1918, 25.7617]    // Miami
    ],
    color: "#0074D9",
    width: 6,
    layerName: "east-coast-route"
});
```

### add_polygon_to_map
Add polygonal areas to represent regions or boundaries.

```javascript
await mapTools.executeTool('add_polygon_to_map', {
    coordinates: [[
        [-74.0, 40.7],
        [-74.0, 40.8],
        [-73.9, 40.8],
        [-73.9, 40.7],
        [-74.0, 40.7]  // Close the polygon
    ]],
    fillColor: "#FF0000",
    fillOpacity: 0.3,
    strokeColor: "#FF0000",
    strokeWidth: 2
});
```

### pan_map_to_location
Center the map on a specific location.

```javascript
await mapTools.executeTool('pan_map_to_location', {
    longitude: -74.006,
    latitude: 40.7128,
    zoom: 12,
    animate: true
});
```

### fit_map_to_bounds
Adjust the map view to show all specified coordinates.

```javascript
await mapTools.executeTool('fit_map_to_bounds', {
    coordinates: [
        [-74.006, 40.7128],
        [-118.2437, 34.0522],
        [-87.6298, 41.8781]
    ],
    padding: 50
});
```

### clear_map_layers
Remove map layers to clean up visualizations.

```javascript
// Clear all custom layers
await mapTools.executeTool('clear_map_layers', {});

// Clear specific layers
await mapTools.executeTool('clear_map_layers', {
    layerNames: ["cities", "routes"]
});
```

### set_map_style
Change the map's visual style.

```javascript
await mapTools.executeTool('set_map_style', {
    style: 'satellite-v9'  // streets-v12, outdoors-v12, light-v11, dark-v11, satellite-v9, satellite-streets-v12
});
```

## Framework Integration Examples

### React Integration

```jsx
import React, { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import { MapboxMapTools } from 'mapbox-map-tools';

function MapComponent() {
    const mapContainer = useRef(null);
    const map = useRef(null);
    const mapTools = useRef(null);

    useEffect(() => {
        if (map.current) return;

        map.current = new mapboxgl.Map({
            container: mapContainer.current,
            style: 'mapbox://styles/mapbox/streets-v12',
            center: [-74.5, 40],
            zoom: 9
        });

        map.current.on('load', () => {
            mapTools.current = new MapboxMapTools(map.current);
        });

        return () => map.current?.remove();
    }, []);

    const addPoints = async () => {
        if (!mapTools.current) return;

        await mapTools.current.executeTool('add_points_to_map', {
            points: [
                { longitude: -74.006, latitude: 40.7128, title: "NYC" }
            ]
        });
    };

    return (
        <div>
            <div ref={mapContainer} style={{ height: '400px' }} />
            <button onClick={addPoints}>Add Points</button>
        </div>
    );
}
```

### Vue.js Integration

```vue
<template>
  <div>
    <div ref="mapContainer" style="height: 400px;"></div>
    <button @click="addRoute">Add Route</button>
  </div>
</template>

<script>
import mapboxgl from 'mapbox-gl';
import { MapboxMapTools } from 'mapbox-map-tools';

export default {
  name: 'MapComponent',
  data() {
    return {
      map: null,
      mapTools: null
    };
  },
  mounted() {
    this.map = new mapboxgl.Map({
      container: this.$refs.mapContainer,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [-74.5, 40],
      zoom: 9
    });

    this.map.on('load', () => {
      this.mapTools = new MapboxMapTools(this.map);
    });
  },
  beforeUnmount() {
    this.map?.remove();
  },
  methods: {
    async addRoute() {
      if (!this.mapTools) return;

      await this.mapTools.executeTool('add_route_to_map', {
        coordinates: [[-74, 40], [-73, 41]]
      });
    }
  }
};
</script>
```

### Angular Integration

```typescript
import { Component, OnInit, OnDestroy, ElementRef, ViewChild } from '@angular/core';
import mapboxgl from 'mapbox-gl';
import { MapboxMapTools } from 'mapbox-map-tools';

@Component({
  selector: 'app-map',
  template: `
    <div #mapContainer style="height: 400px;"></div>
    <button (click)="addPolygon()">Add Polygon</button>
  `
})
export class MapComponent implements OnInit, OnDestroy {
  @ViewChild('mapContainer', { static: true }) mapContainer!: ElementRef;

  private map!: mapboxgl.Map;
  private mapTools!: MapboxMapTools;

  ngOnInit() {
    this.map = new mapboxgl.Map({
      container: this.mapContainer.nativeElement,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [-74.5, 40],
      zoom: 9
    });

    this.map.on('load', () => {
      this.mapTools = new MapboxMapTools(this.map);
    });
  }

  ngOnDestroy() {
    this.map?.remove();
  }

  async addPolygon() {
    if (!this.mapTools) return;

    await this.mapTools.executeTool('add_polygon_to_map', {
      coordinates: [[[-74, 40], [-74, 41], [-73, 41], [-73, 40], [-74, 40]]]
    });
  }
}
```

## Configuration Options

```javascript
const mapTools = new MapboxMapTools(map, {
    // Default styling options
    defaultPointColor: '#FF0000',
    defaultRouteColor: '#0074D9',
    defaultRouteWidth: 4,
    defaultPolygonFillColor: '#FF0000',
    defaultPolygonFillOpacity: 0.3,
    defaultPolygonStrokeColor: '#FF0000',
    defaultPolygonStrokeWidth: 2,

    // Interactive features
    enablePopups: true,        // Enable click popups on points
    enableHoverEffects: true   // Enable hover cursor changes
});
```

## Working with Different LLM Providers

### OpenAI GPT-4 Integration

```javascript
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: 'your-openai-api-key' });

const response = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [
        {
            role: "user",
            content: "Show me a route from San Francisco to Los Angeles"
        }
    ],
    tools: mapTools.getToolsForLLM().map(tool => ({
        type: "function",
        function: {
            name: tool.name,
            description: tool.description,
            parameters: tool.input_schema
        }
    }))
});

// Handle function calls
for (const choice of response.choices) {
    if (choice.message.tool_calls) {
        for (const toolCall of choice.message.tool_calls) {
            const args = JSON.parse(toolCall.function.arguments);
            await mapTools.executeTool(toolCall.function.name, args);
        }
    }
}
```

### Anthropic Claude Integration

```javascript
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({ apiKey: 'your-anthropic-api-key' });

const message = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1000,
    tools: mapTools.getToolsForLLM(),
    messages: [
        {
            role: "user",
            content: "Visualize the major cities on the US East Coast"
        }
    ]
});

// Handle tool use
for (const content of message.content) {
    if (content.type === 'tool_use') {
        await mapTools.executeTool(content.name, content.input);
    }
}
```

## Best Practices

### 1. Tool Combination Strategies
```javascript
// Effective pattern: Combine data retrieval with visualization
async function visualizeRestaurants(city) {
    // 1. Use Mapbox MCP to find restaurants
    const places = await mapboxMCP.executeTool('search_places', {
        query: 'restaurants',
        location: city,
        limit: 10
    });

    // 2. Add points to map
    await mapTools.executeTool('add_points_to_map', {
        points: places.features.map(place => ({
            longitude: place.geometry.coordinates[0],
            latitude: place.geometry.coordinates[1],
            title: place.properties.name,
            description: place.properties.description
        }))
    });

    // 3. Fit map to show all results
    await mapTools.executeTool('fit_map_to_bounds', {
        coordinates: places.features.map(f => f.geometry.coordinates)
    });
}
```

### 2. Layer Management
```javascript
// Use descriptive layer names for better organization
await mapTools.executeTool('add_points_to_map', {
    points: hotelData,
    layerName: 'hotels-downtown'
});

await mapTools.executeTool('add_points_to_map', {
    points: restaurantData,
    layerName: 'restaurants-downtown'
});

// Clear specific layers when updating
await mapTools.executeTool('clear_map_layers', {
    layerNames: ['hotels-downtown']
});
```

### 3. Error Handling
```javascript
try {
    const result = await mapTools.executeTool('add_route_to_map', {
        coordinates: routeCoordinates
    });

    if (result.isError) {
        console.error('Tool execution failed:', result.content[0].text);
        // Handle error appropriately
    } else {
        console.log('Route added successfully:', result.layerId);
    }
} catch (error) {
    console.error('Tool execution error:', error);
}
```

## Troubleshooting

### Common Issues

**1. "mapboxgl is not defined"**
Make sure Mapbox GL JS is loaded before the library:
```html
<script src='https://api.mapbox.com/mapbox-gl-js/v3.0.1/mapbox-gl.js'></script>
<script src='mapbox-map-tools.min.js'></script>
```

**2. Tools not appearing in LLM responses**
Ensure tool descriptions are clear and match user intent:
- Use specific keywords in descriptions
- Provide comprehensive examples
- Check tool schema validation

**3. Layers not clearing properly**
Use unique layer names and proper cleanup:
```javascript
const layerId = result.layerId; // Store the returned layer ID
await mapTools.executeTool('clear_map_layers', {
    layerNames: [layerId]
});
```

**4. Performance issues with many layers**
- Clear unused layers regularly
- Use layer name prefixes for batch operations
- Consider data clustering for large point datasets

## API Reference

### Constructor Options
- `defaultPointColor: string` - Default color for point markers
- `defaultRouteColor: string` - Default color for route lines
- `defaultRouteWidth: number` - Default width for route lines
- `defaultPolygonFillColor: string` - Default fill color for polygons
- `defaultPolygonFillOpacity: number` - Default fill opacity for polygons
- `defaultPolygonStrokeColor: string` - Default stroke color for polygons
- `defaultPolygonStrokeWidth: number` - Default stroke width for polygons
- `enablePopups: boolean` - Enable click popups on point markers
- `enableHoverEffects: boolean` - Enable hover cursor effects

### Methods
- `executeTool(toolName, args)` - Execute a tool by name
- `getToolsForLLM()` - Get all tool definitions for LLM function calling
- `getCustomLayerIds()` - Get all layer IDs created by this library
- `destroy()` - Clean up and remove all layers

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - see the [LICENSE](LICENSE) file for details.

## Support

- 📚 [Documentation](https://github.com/your-username/mapbox-map-tools#readme)
- 🐛 [Issue Tracker](https://github.com/your-username/mapbox-map-tools/issues)
- 💬 [Discussions](https://github.com/your-username/mapbox-map-tools/discussions)

## Related Projects

- [Mapbox GL JS](https://docs.mapbox.com/mapbox-gl-js/) - The underlying mapping library
- [Model Context Protocol](https://modelcontextprotocol.io/) - The protocol specification
- [Anthropic Claude](https://www.anthropic.com/claude) - AI assistant with function calling
- [OpenAI GPT-4](https://openai.com/gpt-4) - AI model with function calling capabilities
