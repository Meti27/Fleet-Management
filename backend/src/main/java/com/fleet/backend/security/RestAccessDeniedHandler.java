package com.fleet.backend.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fleet.backend.error.ApiError;
import jakarta.servlet.http.*;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.time.Instant;

@Component
public class RestAccessDeniedHandler implements AccessDeniedHandler {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    public void handle(HttpServletRequest request,
                       HttpServletResponse response,
                       AccessDeniedException accessDeniedException) throws IOException {

        ApiError body = new ApiError(
                Instant.now(),
                403,
                HttpStatus.FORBIDDEN.getReasonPhrase(),
                "You don't have permission to access this resource",
                request.getRequestURI()
        );

        response.setStatus(403);
        response.setContentType("application/json");
        response.getWriter().write(objectMapper.writeValueAsString(body));
    }
}
