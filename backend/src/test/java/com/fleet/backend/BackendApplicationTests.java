package com.fleet.backend;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

/**
 * Boots the full Spring context against a throwaway PostgreSQL container.
 * This verifies that the Flyway migrations apply cleanly and that every JPA
 * entity validates against the resulting schema (ddl-auto=validate).
 *
 * disabledWithoutDocker=true: skips gracefully when no usable Docker daemon is
 * reachable, so a plain `mvn test` stays green on machines without Docker; CI
 * (which has Docker) runs it for real.
 */
@SpringBootTest
@Testcontainers(disabledWithoutDocker = true)
class BackendApplicationTests {

	@Container
	@ServiceConnection
	static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:17");

	@Test
	void contextLoads() {
	}

}
