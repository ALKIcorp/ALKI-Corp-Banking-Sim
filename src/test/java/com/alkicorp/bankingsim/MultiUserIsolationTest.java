package com.alkicorp.bankingsim;

import com.alkicorp.bankingsim.auth.model.User;
import com.alkicorp.bankingsim.auth.repository.UserRepository;
import com.alkicorp.bankingsim.service.BankService;
import com.alkicorp.bankingsim.service.ClientService;
import java.util.List;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.ActiveProfiles;

@SpringBootTest
@ActiveProfiles("test")
class MultiUserIsolationTest {

    private static final int TEST_SLOT_ID = 1001;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private BankService bankService;

    @Autowired
    private ClientService clientService;

    @AfterEach
    void clearAuthContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void usersCannotSeeEachOthersSlotData() {
        User userA = ensureUser("user-a", "user-a@example.com");
        User userB = ensureUser("user-b", "user-b@example.com");

        setAuth(userA.getUsername());
        bankService.resetAndGetState(TEST_SLOT_ID);
        clientService.createClient(TEST_SLOT_ID, "Alice");
        Assertions.assertEquals(1, clientService.getClients(TEST_SLOT_ID).size());

        setAuth(userB.getUsername());
        bankService.resetAndGetState(TEST_SLOT_ID);
        Assertions.assertEquals(0, clientService.getClients(TEST_SLOT_ID).size());
        clientService.createClient(TEST_SLOT_ID, "Bob");
        Assertions.assertEquals(1, clientService.getClients(TEST_SLOT_ID).size());

        setAuth(userA.getUsername());
        Assertions.assertEquals(1, clientService.getClients(TEST_SLOT_ID).size());
    }

    private User ensureUser(String username, String email) {
        return userRepository.findByUsernameIgnoreCase(username)
            .orElseGet(() -> {
                User user = new User();
                user.setUsername(username);
                user.setEmail(email);
                user.setPasswordHash("test-password-hash");
                return userRepository.save(user);
            });
    }

    private void setAuth(String username) {
        UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
            username,
            null,
            List.of()
        );
        SecurityContextHolder.getContext().setAuthentication(auth);
    }
}
