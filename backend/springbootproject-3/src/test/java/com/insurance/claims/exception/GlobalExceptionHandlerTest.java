
package com.insurance.claims.exception;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.validation.BindingResult;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.server.ResponseStatusException;

class GlobalExceptionHandlerTest {

    private GlobalExceptionHandler exceptionHandler;

    @BeforeEach
    void setUp() {
        exceptionHandler = new GlobalExceptionHandler();
    }

    // =====================================
    // 1. VALIDATION ERRORS
    // =====================================

    @Test
    void shouldHandleValidationException() {

        MethodArgumentNotValidException exception =
            mock(MethodArgumentNotValidException.class);

        BindingResult bindingResult =
            mock(BindingResult.class);

        when(exception.getBindingResult())
            .thenReturn(bindingResult);

        when(bindingResult.getFieldErrors())
            .thenReturn(List.of(
                new FieldError(
                    "claimRequest",
                    "claimNumber",
                    "Claim number is required"
                ),
                new FieldError(
                    "claimRequest",
                    "claimAmount",
                    "Claim amount must be positive"
                )
            ));

        ResponseEntity<Map<String, Object>> response =
            exceptionHandler.handleValidationException(exception);

        assertEquals(
            HttpStatus.BAD_REQUEST,
            response.getStatusCode()
        );

        assertNotNull(response.getBody());

        assertEquals(400, response.getBody().get("status"));

        assertEquals(
            "Validation failed.",
            response.getBody().get("message")
        );

        Map<?, ?> errors =
            (Map<?, ?>) response.getBody().get("errors");

        assertEquals(2, errors.size());

        assertEquals(
            "Claim number is required",
            errors.get("claimNumber")
        );

        assertEquals(
            "Claim amount must be positive",
            errors.get("claimAmount")
        );
    }

    // =====================================
    // 2. RESOURCE NOT FOUND
    // =====================================

    @Test
    void shouldHandleNotFoundException() {

        ResponseStatusException exception =
            new ResponseStatusException(
                HttpStatus.NOT_FOUND,
                "Claim not found"
            );

        ResponseEntity<Map<String, Object>> response =
            exceptionHandler.handleResponseStatusException(exception);

        assertEquals(
            HttpStatus.NOT_FOUND,
            response.getStatusCode()
        );

        assertNotNull(response.getBody());
        assertEquals(404, response.getBody().get("status"));

        assertEquals(
            "Claim not found",
            response.getBody().get("message")
        );
    }

    // =====================================
    // 3. BAD REQUEST
    // =====================================

    @Test
    void shouldHandleBadRequestException() {

        ResponseStatusException exception =
            new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Invalid claim status"
            );

        ResponseEntity<Map<String, Object>> response =
            exceptionHandler.handleResponseStatusException(exception);

        assertEquals(
            HttpStatus.BAD_REQUEST,
            response.getStatusCode()
        );

        assertNotNull(response.getBody());
        assertEquals(400, response.getBody().get("status"));

        assertEquals(
            "Invalid claim status",
            response.getBody().get("message")
        );
    }

    // =====================================
    // 4. CONFLICT
    // =====================================

    @Test
    void shouldHandleConflictException() {

        ResponseStatusException exception =
            new ResponseStatusException(
                HttpStatus.CONFLICT,
                "Claim number already exists"
            );

        ResponseEntity<Map<String, Object>> response =
            exceptionHandler.handleResponseStatusException(exception);

        assertEquals(
            HttpStatus.CONFLICT,
            response.getStatusCode()
        );

        assertNotNull(response.getBody());
        assertEquals(409, response.getBody().get("status"));

        assertEquals(
            "Claim number already exists",
            response.getBody().get("message")
        );
    }

    // =====================================
    // 5. DATABASE CONSTRAINT VIOLATION
    // =====================================

    @Test
    void shouldHandleDataIntegrityException() {

        DataIntegrityViolationException exception =
            new DataIntegrityViolationException(
                "Duplicate database record"
            );

        ResponseEntity<Map<String, Object>> response =
            exceptionHandler.handleDataIntegrityException(exception);

        assertEquals(
            HttpStatus.CONFLICT,
            response.getStatusCode()
        );

        assertNotNull(response.getBody());
        assertEquals(409, response.getBody().get("status"));

        assertEquals(
            "The request conflicts with an existing record or database constraint.",
            response.getBody().get("message")
        );
    }

    // =====================================
    // 6. MALFORMED JSON
    // =====================================

    @Test
    void shouldHandleInvalidRequestBody() {

        HttpMessageNotReadableException exception =
            mock(HttpMessageNotReadableException.class);

        ResponseEntity<Map<String, Object>> response =
            exceptionHandler.handleInvalidRequest(exception);

        assertEquals(
            HttpStatus.BAD_REQUEST,
            response.getStatusCode()
        );

        assertNotNull(response.getBody());
        assertEquals(400, response.getBody().get("status"));

        assertEquals(
            "Invalid request body. Please check the field values and JSON format.",
            response.getBody().get("message")
        );
    }

    // =====================================
    // 7. UNEXPECTED SERVER ERROR
    // =====================================

    @Test
    void shouldHandleUnexpectedException() {

        Exception exception =
            new RuntimeException("Unexpected failure");

        ResponseEntity<Map<String, Object>> response =
            exceptionHandler.handleUnexpectedException(exception);

        assertEquals(
            HttpStatus.INTERNAL_SERVER_ERROR,
            response.getStatusCode()
        );

        assertNotNull(response.getBody());
        assertEquals(500, response.getBody().get("status"));

        assertEquals(
            "An unexpected server error occurred.",
            response.getBody().get("message")
        );
    }
}
