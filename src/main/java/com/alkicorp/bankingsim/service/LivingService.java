package com.alkicorp.bankingsim.service;

import com.alkicorp.bankingsim.auth.model.User;
import com.alkicorp.bankingsim.auth.service.CurrentUserService;
import com.alkicorp.bankingsim.model.Client;
import com.alkicorp.bankingsim.model.ClientLiving;
import com.alkicorp.bankingsim.model.Product;
import com.alkicorp.bankingsim.model.Rental;
import com.alkicorp.bankingsim.model.enums.LivingType;
import com.alkicorp.bankingsim.repository.ClientLivingRepository;
import com.alkicorp.bankingsim.repository.ProductRepository;
import com.alkicorp.bankingsim.repository.RentalRepository;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class LivingService {

    private final ClientService clientService;
    private final ClientLivingRepository clientLivingRepository;
    private final RentalRepository rentalRepository;
    private final ProductRepository productRepository;
    private final CurrentUserService currentUserService;
    private final SimulationService simulationService;
    private final Clock clock = Clock.systemUTC();

    @Transactional(readOnly = true)
    public ClientLiving getLiving(int slotId, Long clientId) {
        clientService.getClient(slotId, clientId);
        return clientLivingRepository.findByClientIdAndSlotId(clientId, slotId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Living selection not set"));
    }

    @Transactional
    public ClientLiving assignRental(int slotId, Long clientId, Long rentalId) {
        Client client = clientService.getClient(slotId, clientId);
        Rental rental = rentalRepository.findById(rentalId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Rental not found"));
        ClientLiving living = clientLivingRepository.findByClientIdAndSlotId(clientId, slotId)
                .orElse(new ClientLiving());
        living.setClient(client);
        living.setSlotId(slotId);
        living.setLivingType(LivingType.RENTAL);
        living.setRental(rental);
        living.setProperty(null);
        living.setMonthlyRentCache(rental.getMonthlyRent());
        living.setStartDate(Instant.now(clock));
        living.setNextRentDay(computeNextRentDay(slotId));
        living.setDelinquent(false);
        return clientLivingRepository.save(living);
    }

    @Transactional
    public ClientLiving assignOwnedProperty(int slotId, Long clientId, Long propertyId) {
        Client client = clientService.getClient(slotId, clientId);
        Product product = productRepository.findByIdAndSlotId(propertyId, slotId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Property not found"));
        ClientLiving living = clientLivingRepository.findByClientIdAndSlotId(clientId, slotId)
                .orElse(new ClientLiving());
        living.setClient(client);
        living.setSlotId(slotId);
        living.setLivingType(LivingType.OWNED_PROPERTY);
        living.setProperty(product);
        living.setRental(null);
        living.setMonthlyRentCache(BigDecimal.ZERO);
        living.setStartDate(Instant.now(clock));
        living.setNextRentDay(0);
        living.setDelinquent(false);
        return clientLivingRepository.save(living);
    }

    @Transactional
    public ClientLiving clearLiving(int slotId, Long clientId) {
        Client client = clientService.getClient(slotId, clientId);
        ClientLiving living = clientLivingRepository.findByClientIdAndSlotId(clientId, slotId)
                .orElse(new ClientLiving());
        living.setClient(client);
        living.setSlotId(slotId);
        living.setLivingType(LivingType.NONE);
        living.setRental(null);
        living.setProperty(null);
        living.setMonthlyRentCache(BigDecimal.ZERO);
        living.setStartDate(Instant.now(clock));
        living.setNextRentDay(0);
        living.setDelinquent(false);
        return clientLivingRepository.save(living);
    }

    private int computeNextRentDay(int slotId) {
        User user = currentUserService.getCurrentUser();
        double gameDay = simulationService.getAndAdvanceState(user, slotId)
                .map(s -> s.getGameDay()).orElse(0d);
        int dayOfMonth = ((int) Math.floor(gameDay) % 30) + 1;
        int daysUntilFirst = dayOfMonth == 1 ? 30 : (31 - dayOfMonth);
        return (int) Math.floor(gameDay) + daysUntilFirst;
    }

    @Transactional(readOnly = true)
    public java.util.List<Rental> getAllRentals() {
        return rentalRepository.findByStatus("ACTIVE");
    }
}
