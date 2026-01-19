package com.fleet.backend.bootstrap;

import com.fleet.backend.entity.Driver;
import com.fleet.backend.entity.Truck;
import com.fleet.backend.repository.DriverRepository;
import com.fleet.backend.repository.TruckRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@Profile("dev")
public class DevDataSeeder implements CommandLineRunner {

    private final DriverRepository driverRepo;
    private final TruckRepository truckRepo;

    public DevDataSeeder(DriverRepository driverRepo, TruckRepository truckRepo) {
        this.driverRepo = driverRepo;
        this.truckRepo = truckRepo;
    }

    @Override
    public void run(String... args) {
        // don’t re-seed every time
        if (driverRepo.count() == 0) {
            driverRepo.saveAll(List.of(
                    Driver.builder().name("Ardit Krasniqi").phone("+38970000111").email("ardit@fleet.demo").build(),
                    Driver.builder().name("Blerim Sejdiu").phone("+38970000112").email("blerim@fleet.demo").build(),
                    Driver.builder().name("Gent Aliu").phone("+38970000113").email("gent@fleet.demo").build()
            ));
        }

        if (truckRepo.count() == 0) {
            truckRepo.saveAll(List.of(
                    Truck.builder().plateNumber("TE-1001-AA").model("MAN TGX").capacityTons(24.0).build(),
                    Truck.builder().plateNumber("TE-1002-AA").model("Mercedes Actros").capacityTons(26.0).build(),
                    Truck.builder().plateNumber("TE-1003-AA").model("Volvo FH").capacityTons(25.0).build()
            ));
        }
    }
}
