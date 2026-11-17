
package com.insurance.claims;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest(properties = {
    "app.jwt.secret=VGhpcy1pcy1hLXRlc3Qtc2VjcmV0LXdpdGgtMzItYnl0ZXMtbWluaW11bQ=="
})
class Springbootproject3ApplicationTests {

    @Test
    void contextLoads() {
    }
}