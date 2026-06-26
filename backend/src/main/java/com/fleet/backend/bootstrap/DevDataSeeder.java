package com.fleet.backend.bootstrap;

import com.fleet.backend.dto.JobRequest;
import com.fleet.backend.entity.Driver;
import com.fleet.backend.entity.Job;
import com.fleet.backend.entity.Truck;
import com.fleet.backend.repository.DriverRepository;
import com.fleet.backend.repository.JobRepository;
import com.fleet.backend.repository.TruckRepository;
import com.fleet.backend.repository.UserRepository;
import com.fleet.backend.service.JobService;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Random;

/**
 * Seeds a realistic demo dataset (dev profile only): drivers, trucks, and a spread
 * of jobs across statuses and dates so the dashboard's KPIs, revenue trend and
 * charts look populated. DONE jobs are dated across the last ~8 weeks to drive the
 * revenue trend; a few active jobs are scheduled for today. Deterministic (fixed
 * RNG seed) so the demo looks the same on every fresh boot.
 */
@Component
@Profile("dev")
@Order(2) // runs after DevUserSeeder so the "driver" login already exists
public class DevDataSeeder implements CommandLineRunner {

    private final DriverRepository driverRepo;
    private final TruckRepository truckRepo;
    private final UserRepository userRepo;
    private final JobRepository jobRepo;
    private final JobService jobService;

    public DevDataSeeder(DriverRepository driverRepo, TruckRepository truckRepo,
                         UserRepository userRepo, JobRepository jobRepo, JobService jobService) {
        this.driverRepo = driverRepo;
        this.truckRepo = truckRepo;
        this.userRepo = userRepo;
        this.jobRepo = jobRepo;
        this.jobService = jobService;
    }

    // North Macedonia cities for realistic routes.
    private static final String[] CITIES = {
            "Skopje", "Tetovo", "Kumanovo", "Bitola", "Ohrid", "Prilep",
            "Veles", "Strumica", "Gostivar", "Štip", "Kavadarci", "Struga"
    };

    @Override
    public void run(String... args) {
        if (driverRepo.count() == 0) {
            driverRepo.saveAll(List.of(
                    Driver.builder().name("Ardit Krasniqi").phone("+38970000111").email("ardit@fleet.demo").build(),
                    Driver.builder().name("Blerim Sejdiu").phone("+38970000112").email("blerim@fleet.demo").build(),
                    Driver.builder().name("Gent Aliu").phone("+38970000113").email("gent@fleet.demo").build(),
                    Driver.builder().name("Fatmir Berisha").phone("+38970000114").email("fatmir@fleet.demo").build(),
                    Driver.builder().name("Driton Hoxha").phone("+38970000115").email("driton@fleet.demo").build(),
                    Driver.builder().name("Valon Ramadani").phone("+38970000116").email("valon@fleet.demo").build(),
                    Driver.builder().name("Egzon Maliqi").phone("+38970000117").email("egzon@fleet.demo").build()
            ));
        }

        if (truckRepo.count() == 0) {
            truckRepo.saveAll(List.of(
                    Truck.builder().plateNumber("TE-1001-AA").model("MAN TGX").capacityTons(24.0).fuelConsumptionL100km(28.5).build(),
                    Truck.builder().plateNumber("TE-1002-AA").model("Mercedes Actros").capacityTons(26.0).fuelConsumptionL100km(30.0).build(),
                    Truck.builder().plateNumber("TE-1003-AA").model("Volvo FH").capacityTons(25.0).fuelConsumptionL100km(27.0).build(),
                    Truck.builder().plateNumber("TE-1004-AA").model("Scania R450").capacityTons(28.0).fuelConsumptionL100km(31.0).build(),
                    Truck.builder().plateNumber("TE-1005-AA").model("Iveco S-Way").capacityTons(22.0).fuelConsumptionL100km(26.0).build(),
                    Truck.builder().plateNumber("TE-1006-AA").model("DAF XF").capacityTons(25.0).fuelConsumptionL100km(29.0).build()
            ));
        }

        Driver linked = linkDriverLogin();

        if (jobRepo.count() == 0) {
            seedJobs(linked);
        }
    }

    /** Link the "driver" demo login to a driver (idempotent). Returns that driver. */
    private Driver linkDriverLogin() {
        var driverUser = userRepo.findByUsername("driver").orElse(null);
        if (driverUser == null) return null;

        Driver driver = driverRepo.findByUser_Id(driverUser.getId()).orElse(null);
        if (driver == null) {
            driver = driverRepo.findAll().stream().findFirst().orElse(null);
            if (driver == null) return null;
            driver.setUser(driverUser);
            driver = driverRepo.save(driver);
        }
        return driver;
    }

    /**
     * Bulk demo jobs. Historical DONE jobs (priced, dated across the last 8 weeks)
     * drive the revenue figures + trend; a handful of active jobs (some today) and
     * a few cancelled ones round out the status mix. The linked driver gets one
     * fresh ASSIGNED job via {@link JobService} so the driver app + a JOB_ASSIGNED
     * notification have content.
     */
    private void seedJobs(Driver linked) {
        List<Driver> drivers = driverRepo.findAll();
        List<Truck> trucks = truckRepo.findAll();
        if (drivers.isEmpty() || trucks.isEmpty()) return;

        Random rnd = new Random(7); // fixed seed → reproducible demo
        LocalDateTime now = LocalDateTime.now();

        // Create the linked driver's ASSIGNED job FIRST, via the service, while the
        // job table is still empty — so its conflict validation has nothing to trip
        // on. (The bulk jobs below are saved directly and skip that validation.)
        if (linked != null) {
            LocalDateTime pickup = now.plusDays(1).withHour(9).withMinute(0).withSecond(0).withNano(0);
            JobRequest req = new JobRequest();
            req.setTitle("Delivery to Skopje");
            req.setPickupLocation("Tetovo");
            req.setDropoffLocation("Skopje");
            req.setPickupTime(pickup);
            req.setDropoffTime(pickup.plusHours(3));
            req.setPriceEur(new BigDecimal("250.00"));
            req.setDriverId(linked.getId());
            req.setTruckId(trucks.get(0).getId());
            jobService.createJob(req);
        }

        List<Job> batch = new ArrayList<>();

        // ~22 completed jobs spread across the last ~8 weeks (56 days).
        for (int i = 0; i < 22; i++) {
            int daysAgo = 1 + rnd.nextInt(56);
            int hour = 6 + rnd.nextInt(10);
            LocalDateTime pickup = now.minusDays(daysAgo)
                    .withHour(hour).withMinute(0).withSecond(0).withNano(0);
            int durationH = 2 + rnd.nextInt(5);
            int price = 150 + rnd.nextInt(46) * 10; // €150–€600, round tens
            String[] route = route(rnd);
            batch.add(Job.builder()
                    .title("Cargo " + route[0] + " → " + route[1])
                    .pickupLocation(route[0]).dropoffLocation(route[1])
                    .pickupTime(pickup).dropoffTime(pickup.plusHours(durationH))
                    .priceEur(BigDecimal.valueOf(price))
                    .status("DONE")
                    .driver(drivers.get(rnd.nextInt(drivers.size())))
                    .truck(trucks.get(rnd.nextInt(trucks.size())))
                    .createAt(pickup.minusDays(1))
                    .build());
        }

        // 3 cancelled jobs in the recent past.
        for (int i = 0; i < 3; i++) {
            LocalDateTime pickup = now.minusDays(3 + rnd.nextInt(20)).withHour(8 + i).withMinute(0).withSecond(0).withNano(0);
            String[] route = route(rnd);
            batch.add(Job.builder()
                    .title("Cargo " + route[0] + " → " + route[1])
                    .pickupLocation(route[0]).dropoffLocation(route[1])
                    .pickupTime(pickup).dropoffTime(pickup.plusHours(3))
                    .priceEur(BigDecimal.valueOf(150 + rnd.nextInt(30) * 10))
                    .status("CANCELLED")
                    .driver(drivers.get(rnd.nextInt(drivers.size())))
                    .truck(trucks.get(rnd.nextInt(trucks.size())))
                    .createAt(pickup.minusDays(1))
                    .build());
        }

        // 3 active jobs scheduled for today (so "Active Jobs Today" is populated).
        String[] todayStatuses = {"IN_PROGRESS", "ASSIGNED", "OPEN"};
        for (int i = 0; i < 3; i++) {
            LocalDateTime pickup = now.withHour(8 + i * 3).withMinute(0).withSecond(0).withNano(0);
            String[] route = route(rnd);
            boolean open = todayStatuses[i].equals("OPEN");
            batch.add(Job.builder()
                    .title("Cargo " + route[0] + " → " + route[1])
                    .pickupLocation(route[0]).dropoffLocation(route[1])
                    .pickupTime(pickup).dropoffTime(pickup.plusHours(2 + i))
                    .priceEur(BigDecimal.valueOf(200 + rnd.nextInt(30) * 10))
                    .status(todayStatuses[i])
                    .driver(open ? null : drivers.get(1 + rnd.nextInt(drivers.size() - 1)))
                    .truck(open ? null : trucks.get(rnd.nextInt(trucks.size())))
                    .createAt(now.minusDays(1))
                    .build());
        }

        // 4 upcoming jobs over the next two weeks.
        for (int i = 0; i < 4; i++) {
            LocalDateTime pickup = now.plusDays(1 + rnd.nextInt(13)).withHour(7 + rnd.nextInt(8)).withMinute(0).withSecond(0).withNano(0);
            String[] route = route(rnd);
            boolean assigned = rnd.nextBoolean();
            batch.add(Job.builder()
                    .title("Cargo " + route[0] + " → " + route[1])
                    .pickupLocation(route[0]).dropoffLocation(route[1])
                    .pickupTime(pickup).dropoffTime(pickup.plusHours(2 + rnd.nextInt(4)))
                    .priceEur(BigDecimal.valueOf(180 + rnd.nextInt(40) * 10))
                    .status(assigned ? "ASSIGNED" : "OPEN")
                    .driver(assigned ? drivers.get(rnd.nextInt(drivers.size())) : null)
                    .truck(assigned ? trucks.get(rnd.nextInt(trucks.size())) : null)
                    .createAt(now)
                    .build());
        }

        jobRepo.saveAll(batch);
    }

    /** A random distinct from/to city pair. */
    private static String[] route(Random rnd) {
        int a = rnd.nextInt(CITIES.length);
        int b = rnd.nextInt(CITIES.length);
        while (b == a) b = rnd.nextInt(CITIES.length);
        return new String[]{CITIES[a], CITIES[b]};
    }
}
