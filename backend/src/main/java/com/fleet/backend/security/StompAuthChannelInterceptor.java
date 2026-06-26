package com.fleet.backend.security;

import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Authenticates the STOMP CONNECT frame with the same JWT the REST API uses
 * (the HTTP handshake at {@code /ws} is left open in {@link SecurityConfig};
 * auth happens here). The browser sends {@code Authorization: Bearer <token>}
 * as a STOMP connect header. An invalid/absent token aborts the connection, so
 * only authenticated staff can subscribe to the live-location topic.
 */
@Component
public class StompAuthChannelInterceptor implements ChannelInterceptor {

    private final JwtService jwtService;

    public StompAuthChannelInterceptor(JwtService jwtService) {
        this.jwtService = jwtService;
    }

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor =
                MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);

        if (accessor != null && StompCommand.CONNECT.equals(accessor.getCommand())) {
            String token = bearerToken(accessor.getNativeHeader("Authorization"));
            if (token == null) {
                throw new IllegalArgumentException("Missing Authorization header on STOMP CONNECT");
            }
            // Throws if the token is invalid/expired → CONNECT is rejected.
            String username = jwtService.extractUsername(token);
            String role = jwtService.extractRole(token);

            var auth = new UsernamePasswordAuthenticationToken(
                    username, null,
                    role == null ? List.of() : List.of(new SimpleGrantedAuthority("ROLE_" + role)));
            accessor.setUser(auth);
        }
        return message;
    }

    private String bearerToken(List<String> values) {
        if (values == null || values.isEmpty()) {
            return null;
        }
        String header = values.get(0);
        return (header != null && header.startsWith("Bearer ")) ? header.substring(7) : null;
    }
}
