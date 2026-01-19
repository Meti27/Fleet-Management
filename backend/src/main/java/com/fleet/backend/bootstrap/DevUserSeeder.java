package com.fleet.backend.bootstrap;

import com.fleet.backend.entity.AppUser;
import com.fleet.backend.repository.UserRepository;
import com.fleet.backend.security.Role;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
@Profile("dev")
public class DevUserSeeder implements CommandLineRunner {

    private final UserRepository userRepo;
    private final PasswordEncoder encoder;

    public DevUserSeeder(UserRepository userRepo, PasswordEncoder encoder) {
        this.userRepo = userRepo;
        this.encoder = encoder;
    }

    @Override
    public void run(String... args) {
        seed("admin", "admin123", Role.ADMIN);
        seed("dispatcher", "dispatch123", Role.DISPATCHER);
        seed("viewer", "viewer123", Role.VIEWER);
    }

    private void seed(String username, String password, Role role) {
        userRepo.findByUsername(username).orElseGet(() ->
                userRepo.save(new AppUser(username, encoder.encode(password), role))
        );
    }
}
