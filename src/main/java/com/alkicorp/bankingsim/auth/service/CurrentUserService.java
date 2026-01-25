package com.alkicorp.bankingsim.auth.service;

import com.alkicorp.bankingsim.auth.model.User;
import com.alkicorp.bankingsim.auth.repository.UserRepository;
import java.util.Optional;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class CurrentUserService {

    private final UserRepository userRepository;

    public CurrentUserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public User getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || auth.getName() == null || auth.getName().isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not authenticated");
        }
        String usernameOrEmail = auth.getName();
        Optional<User> user = userRepository.findByUsernameIgnoreCase(usernameOrEmail)
            .or(() -> userRepository.findByEmailIgnoreCase(usernameOrEmail));
        return user.orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not found"));
    }
}
