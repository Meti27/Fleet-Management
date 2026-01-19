package com.fleet.backend.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fleet.backend.error.ApiError;
import jakarta.servlet.http.*;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.time.Instant;

@Component
public class RestAuthenticationEntryPoint implements AuthenticationEntryPoint {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    public void commence(HttpServletRequest request,
                         HttpServletResponse response,
                         AuthenticationException authException) throws IOException {

        ApiError body = new ApiError(
                Instant.now(),
                401,
                HttpStatus.UNAUTHORIZED.getReasonPhrase(),
                "Missing or invalid token",
                request.getRequestURI()
        );

        response.setStatus(401);
        response.setContentType("application/json");
        response.getWriter().write(objectMapper.writeValueAsString(body));
    }
}
