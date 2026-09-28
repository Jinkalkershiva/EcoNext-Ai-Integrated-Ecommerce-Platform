package com.econext.order.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Value("${app.cors.allowed-origins:http://localhost:3000,http://localhost:5073,http://localhost:5074,http://localhost:5173,http://localhost:5174,http://127.0.0.1:3000,http://127.0.0.1:5073,http://127.0.0.1:5074,http://127.0.0.1:5173,http://127.0.0.1:5174}")
    private String allowedOrigins;

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        // In-memory simple broker for real-time tracking topic destinations
        config.enableSimpleBroker("/topic");
        config.setApplicationDestinationPrefixes("/app");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        String[] origins = allowedOrigins.split(",");

        // Native WebSocket STOMP endpoint for browser & mobile clients
        registry.addEndpoint("/ws-tracking")
                .setAllowedOriginPatterns(origins);

        // SockJS fallback STOMP endpoint for restricted environments
        registry.addEndpoint("/ws-tracking")
                .setAllowedOriginPatterns(origins)
                .withSockJS();
    }
}
