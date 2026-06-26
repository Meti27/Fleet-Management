package com.fleet.backend.config;

import com.fleet.backend.security.StompAuthChannelInterceptor;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

/**
 * STOMP-over-WebSocket for live GPS tracking (Phase 3). Drivers push positions via
 * REST; {@code LocationService} fans them out over the in-memory simple broker to
 * the admin live map subscribed at {@code /topic/locations}. CONNECT frames are
 * JWT-authenticated by {@link StompAuthChannelInterceptor}. Raw WebSocket (no
 * SockJS) keeps the client deps minimal (@stomp/stompjs only).
 */
@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    private final StompAuthChannelInterceptor authInterceptor;

    public WebSocketConfig(StompAuthChannelInterceptor authInterceptor) {
        this.authInterceptor = authInterceptor;
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws")
                // Same origins the REST CORS config allows (Vercel + any localhost port).
                .setAllowedOriginPatterns(
                        "https://fleet-management-sable.vercel.app",
                        "https://fleet-management-*.vercel.app",
                        "http://localhost:*",
                        "http://127.0.0.1:*"
                );
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        registry.enableSimpleBroker("/topic");
        registry.setApplicationDestinationPrefixes("/app");
    }

    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        registration.interceptors(authInterceptor);
    }
}
