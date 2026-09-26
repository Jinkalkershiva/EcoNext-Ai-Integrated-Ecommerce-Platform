package com.econext.gateway;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.cloud.contract.wiremock.AutoConfigureWireMock;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.reactive.server.WebTestClient;

import static com.github.tomakehurst.wiremock.client.WireMock.*;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureWireMock(port = 0)
@TestPropertySource(properties = {
        "AUTH_SERVICE_URL=http://localhost:${wiremock.server.port}",
        "PRODUCT_SERVICE_URL=http://localhost:${wiremock.server.port}",
        "DJANGO_BACKEND_URL=http://localhost:${wiremock.server.port}"
})
class GatewayRoutingIntegrationTests {

    @LocalServerPort
    private int gatewayPort;

    private WebTestClient webTestClient;

    @BeforeEach
    void setUp() {
        this.webTestClient = WebTestClient.bindToServer()
                .baseUrl("http://localhost:" + gatewayPort)
                .build();
    }

    @Test
    void testAuthRouteDispatchesToAuthService() {
        stubFor(post(urlEqualTo("/api/auth/login/"))
                .willReturn(aResponse()
                        .withHeader("Content-Type", "application/json")
                        .withBody("{\"status\":\"success\",\"message\":\"Login successful\"}")
                        .withStatus(200)));

        webTestClient.post()
                .uri("/api/auth/login/")
                .header("Content-Type", "application/json")
                .bodyValue("{\"username\":\"testuser\",\"password\":\"pass\"}")
                .exchange()
                .expectStatus().isOk()
                .expectBody()
                .jsonPath("$.status").isEqualTo("success")
                .jsonPath("$.message").isEqualTo("Login successful");

        verify(postRequestedFor(urlEqualTo("/api/auth/login/")));
    }

    @Test
    void testProductRouteDispatchesToProductService() {
        stubFor(get(urlEqualTo("/api/products/"))
                .willReturn(aResponse()
                        .withHeader("Content-Type", "application/json")
                        .withBody("{\"count\":50,\"results\":[]}")
                        .withStatus(200)));

        webTestClient.get()
                .uri("/api/products/")
                .exchange()
                .expectStatus().isOk()
                .expectBody()
                .jsonPath("$.count").isEqualTo(50);

        verify(getRequestedFor(urlEqualTo("/api/products/")));
    }

    @Test
    void testCatchAllRouteDispatchesToDjangoFallback() {
        stubFor(get(urlEqualTo("/api/unmigrated/endpoint/"))
                .willReturn(aResponse()
                        .withHeader("Content-Type", "application/json")
                        .withBody("{\"legacy\":true}")
                        .withStatus(200)));

        webTestClient.get()
                .uri("/api/unmigrated/endpoint/")
                .exchange()
                .expectStatus().isOk()
                .expectBody()
                .jsonPath("$.legacy").isEqualTo(true);

        verify(getRequestedFor(urlEqualTo("/api/unmigrated/endpoint/")));
    }
}
