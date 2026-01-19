package com.fleet.backend.error;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<ApiError> handleResponseStatus(ResponseStatusException ex,
                                                         HttpServletRequest request) {

        HttpStatus status = HttpStatus.valueOf(ex.getStatusCode().value());

        ApiError body = new ApiError(
                Instant.now(),
                status.value(),
                status.getReasonPhrase(),
                ex.getReason(),
                request.getRequestURI()
        );

        return ResponseEntity.status(status).body(body);
    }

    @ExceptionHandler(org.springframework.http.converter.HttpMessageNotReadableException.class)
    public ResponseEntity<ApiError> handleInvalidJson(Exception ex, HttpServletRequest request) {
        HttpStatus status = HttpStatus.BAD_REQUEST;

        ApiError body = new ApiError(
                Instant.now(),
                status.value(),
                "Bad Request",
                "Invalid JSON request body (check types like LocalDateTime and number fields).",
                request.getRequestURI()
        );

        return ResponseEntity.status(status).body(body);
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<ApiError> handleTypeMismatch(MethodArgumentTypeMismatchException ex,
                                                       HttpServletRequest request) {
        HttpStatus status = HttpStatus.BAD_REQUEST;

        ApiError body = new ApiError(
                Instant.now(),
                status.value(),
                "Bad Request",
                "Invalid parameter '" + ex.getName() + "': " + ex.getValue(),
                request.getRequestURI()
        );

        return ResponseEntity.status(status).body(body);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiError> handleGeneric(Exception ex, HttpServletRequest request) {
        HttpStatus status = HttpStatus.INTERNAL_SERVER_ERROR;

        ApiError body = new ApiError(
                Instant.now(),
                status.value(),
                "Internal Server Error",
                "Unexpected error occurred.",
                request.getRequestURI()
        );

        return ResponseEntity.status(status).body(body);
    }
}
