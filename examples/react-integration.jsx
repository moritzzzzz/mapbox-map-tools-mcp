/**
 * React Integration Example for Mapbox Map Tools Library
 *
 * This example shows how to integrate the Mapbox Map Tools library
 * with a React application, including proper lifecycle management
 * and integration with LLM function calling.
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import { MapboxMapTools } from 'mapbox-map-tools';

// Mock LLM client - replace with your actual LLM integration
class MockLLMClient {
    constructor(mapTools) {
        this.mapTools = mapTools;
    }

    async sendMessage(message) {
        // Simulate LLM processing and return tool calls
        const tools = this.mapTools.getToolsForLLM();

        // Simple pattern matching for demo purposes
        if (message.toLowerCase().includes('cities')) {
            return {
                tool_calls: [{
                    name: 'add_points_to_map',
                    input: {
                        points: [
                            { longitude: -74.0059, latitude: 40.7128, title: "New York" },
                            { longitude: -118.2437, latitude: 34.0522, title: "Los Angeles" },
                            { longitude: -87.6298, latitude: 41.8781, title: "Chicago" }
                        ]
                    }
                }]
            };
        } else if (message.toLowerCase().includes('route')) {
            return {
                tool_calls: [
                    {
                        name: 'add_points_to_map',
                        input: {
                            points: [
                                { longitude: -74.0059, latitude: 40.7128, title: "Start: NYC" },
                                { longitude: -118.2437, latitude: 34.0522, title: "End: LA" }
                            ]
                        }
                    },
                    {
                        name: 'add_route_to_map',
                        input: {
                            coordinates: [[-74.0059, 40.7128], [-118.2437, 34.0522]],
                            color: '#FF0000'
                        }
                    },
                    {
                        name: 'fit_map_to_bounds',
                        input: {
                            coordinates: [[-74.0059, 40.7128], [-118.2437, 34.0522]]
                        }
                    }
                ]
            };
        }

        return { text: "I can help you visualize locations and routes on the map. Try asking about cities or routes!" };
    }
}

const GeospatialChat = () => {
    const mapContainer = useRef(null);
    const map = useRef(null);
    const mapTools = useRef(null);
    const llmClient = useRef(null);

    const [isLoaded, setIsLoaded] = useState(false);
    const [messages, setMessages] = useState([
        { role: 'assistant', content: 'Hello! I can help you visualize geospatial data. Try asking me to show cities or create routes!' }
    ]);
    const [input, setInput] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    // Initialize map and tools
    useEffect(() => {
        if (map.current) return; // Initialize only once

        // Set your Mapbox access token
        mapboxgl.accessToken = process.env.REACT_APP_MAPBOX_TOKEN || 'your-mapbox-token-here';

        map.current = new mapboxgl.Map({
            container: mapContainer.current,
            style: 'mapbox://styles/mapbox/streets-v12',
            center: [-98.5795, 39.8283], // Center of US
            zoom: 4
        });

        // Add navigation controls
        map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

        map.current.on('load', () => {
            // Initialize map tools
            mapTools.current = new MapboxMapTools(map.current, {
                enablePopups: true,
                enableHoverEffects: true,
                defaultPointColor: '#FF6B6B',
                defaultRouteColor: '#4ECDC4'
            });

            // Initialize mock LLM client
            llmClient.current = new MockLLMClient(mapTools.current);

            setIsLoaded(true);
            console.log('Map and tools initialized');
        });

        return () => {
            map.current?.remove();
        };
    }, []);

    // Process user messages
    const handleSendMessage = useCallback(async () => {
        if (!input.trim() || !llmClient.current || isProcessing) return;

        const userMessage = input.trim();
        setInput('');
        setIsProcessing(true);

        // Add user message to chat
        setMessages(prev => [...prev, { role: 'user', content: userMessage }]);

        try {
            // Send to LLM
            const response = await llmClient.current.sendMessage(userMessage);

            // Execute any tool calls
            if (response.tool_calls) {
                let toolResults = [];

                for (const toolCall of response.tool_calls) {
                    const result = await mapTools.current.executeTool(toolCall.name, toolCall.input);
                    toolResults.push(`Executed ${toolCall.name}: ${result.content[0].text}`);
                }

                // Add assistant response with tool results
                setMessages(prev => [...prev, {
                    role: 'assistant',
                    content: `I've updated the map with your request:\\n\\n${toolResults.join('\\n')}`
                }]);
            } else {
                // Add text response
                setMessages(prev => [...prev, {
                    role: 'assistant',
                    content: response.text
                }]);
            }

        } catch (error) {
            console.error('Error processing message:', error);
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: `Sorry, I encountered an error: ${error.message}`
            }]);
        } finally {
            setIsProcessing(false);
        }
    }, [input, isProcessing]);

    // Quick action buttons
    const quickActions = [
        {
            label: 'Show Major Cities',
            action: () => setInput('Show me major US cities')
        },
        {
            label: 'NYC to LA Route',
            action: () => setInput('Show me a route from New York to Los Angeles')
        },
        {
            label: 'Clear Map',
            action: async () => {
                if (mapTools.current) {
                    await mapTools.current.executeTool('clear_map_layers', {});
                    setMessages(prev => [...prev, {
                        role: 'assistant',
                        content: 'Map cleared!'
                    }]);
                }
            }
        }
    ];

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    return (
        <div style={{ display: 'flex', height: '100vh', fontFamily: 'Arial, sans-serif' }}>
            {/* Map Panel */}
            <div style={{ flex: 2, position: 'relative' }}>
                <div
                    ref={mapContainer}
                    style={{ width: '100%', height: '100%' }}
                />
                {!isLoaded && (
                    <div style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        background: 'rgba(255, 255, 255, 0.9)',
                        padding: '20px',
                        borderRadius: '8px',
                        textAlign: 'center'
                    }}>
                        Loading map...
                    </div>
                )}
            </div>

            {/* Chat Panel */}
            <div style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                borderLeft: '1px solid #ddd',
                background: '#f8f9fa'
            }}>
                {/* Header */}
                <div style={{
                    padding: '20px',
                    borderBottom: '1px solid #ddd',
                    background: 'white'
                }}>
                    <h2 style={{ margin: 0, fontSize: '18px' }}>Geospatial AI Assistant</h2>
                    <p style={{ margin: '5px 0 0 0', fontSize: '14px', color: '#666' }}>
                        Powered by Mapbox Map Tools
                    </p>
                </div>

                {/* Quick Actions */}
                <div style={{ padding: '15px', borderBottom: '1px solid #ddd', background: 'white' }}>
                    <div style={{ fontSize: '14px', marginBottom: '10px', color: '#666' }}>
                        Quick Actions:
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {quickActions.map((action, index) => (
                            <button
                                key={index}
                                onClick={action.action}
                                style={{
                                    padding: '6px 12px',
                                    fontSize: '12px',
                                    border: '1px solid #ddd',
                                    borderRadius: '4px',
                                    background: 'white',
                                    cursor: 'pointer'
                                }}
                            >
                                {action.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Messages */}
                <div style={{
                    flex: 1,
                    padding: '15px',
                    overflowY: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '15px'
                }}>
                    {messages.map((message, index) => (
                        <div
                            key={index}
                            style={{
                                padding: '12px',
                                borderRadius: '8px',
                                background: message.role === 'user' ? '#007bff' : 'white',
                                color: message.role === 'user' ? 'white' : 'black',
                                alignSelf: message.role === 'user' ? 'flex-end' : 'flex-start',
                                maxWidth: '85%',
                                border: message.role === 'assistant' ? '1px solid #ddd' : 'none',
                                whiteSpace: 'pre-line'
                            }}
                        >
                            {message.content}
                        </div>
                    ))}

                    {isProcessing && (
                        <div style={{
                            padding: '12px',
                            borderRadius: '8px',
                            background: 'white',
                            border: '1px solid #ddd',
                            alignSelf: 'flex-start',
                            maxWidth: '85%'
                        }}>
                            Processing your request...
                        </div>
                    )}
                </div>

                {/* Input */}
                <div style={{
                    padding: '15px',
                    borderTop: '1px solid #ddd',
                    background: 'white'
                }}>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <textarea
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyPress={handleKeyPress}
                            placeholder="Ask me to visualize locations, routes, or areas..."
                            style={{
                                flex: 1,
                                padding: '10px',
                                border: '1px solid #ddd',
                                borderRadius: '4px',
                                resize: 'none',
                                fontSize: '14px',
                                minHeight: '40px'
                            }}
                            rows={2}
                        />
                        <button
                            onClick={handleSendMessage}
                            disabled={!input.trim() || isProcessing}
                            style={{
                                padding: '10px 15px',
                                background: '#007bff',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: input.trim() && !isProcessing ? 'pointer' : 'not-allowed',
                                fontSize: '14px',
                                opacity: input.trim() && !isProcessing ? 1 : 0.5
                            }}
                        >
                            Send
                        </button>
                    </div>

                    <div style={{ fontSize: '12px', color: '#666', marginTop: '8px' }}>
                        Try: "Show cities", "Create a route", "Add a polygon"
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GeospatialChat;

/**
 * Usage in your React app:
 *
 * 1. Install dependencies:
 *    npm install mapbox-gl mapbox-map-tools
 *
 * 2. Set up environment variables:
 *    REACT_APP_MAPBOX_TOKEN=your_mapbox_token_here
 *
 * 3. Import and use:
 *    import GeospatialChat from './components/GeospatialChat';
 *
 *    function App() {
 *      return <GeospatialChat />;
 *    }
 *
 * 4. For production, replace MockLLMClient with your actual LLM integration:
 *    - Anthropic Claude
 *    - OpenAI GPT-4
 *    - Or any other LLM that supports function calling
 */