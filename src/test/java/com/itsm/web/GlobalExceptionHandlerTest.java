package com.itsm.web;

import com.itsm.web.dto.ApiError;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockHttpServletRequest;

import static org.assertj.core.api.Assertions.assertThat;

class GlobalExceptionHandlerTest {

    @Test
    @DisplayName("TC36 Database down: the error becomes a DatabaseFailureException, 503 with a readable message")
    void databaseDown() {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/incidents");
        ResponseEntity<ApiError> response = new GlobalExceptionHandler()
                .handleDatabase(new DataAccessResourceFailureException("Connection refused"), request);

        assertThat(response.getStatusCode().value()).isEqualTo(503);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().message()).isEqualTo("The database is not available right now, please try again");
        assertThat(response.getBody().path()).isEqualTo("/api/incidents");
    }
}
