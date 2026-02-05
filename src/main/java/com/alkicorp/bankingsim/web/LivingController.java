package com.alkicorp.bankingsim.web;

import com.alkicorp.bankingsim.model.ClientLiving;
import com.alkicorp.bankingsim.model.Rental;
import com.alkicorp.bankingsim.auth.model.User;
import com.alkicorp.bankingsim.auth.service.CurrentUserService;
import com.alkicorp.bankingsim.service.LivingService;
import com.alkicorp.bankingsim.service.RentService;
import com.alkicorp.bankingsim.web.dto.LivingResponse;
import com.alkicorp.bankingsim.web.dto.RentalResponse;
import java.util.List;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/slots/{slotId}")
@RequiredArgsConstructor
public class LivingController {

    private final LivingService livingService;
    private final RentService rentService;
    private final CurrentUserService currentUserService;

    @GetMapping("/rentals")
    public List<RentalResponse> rentals(@PathVariable int slotId) {
        return livingService.getAllRentals().stream().map(this::toRentalResponse).collect(Collectors.toList());
    }

    @PostMapping("/clients/{clientId}/living/rental/{rentalId}")
    public LivingResponse assignRental(@PathVariable int slotId, @PathVariable Long clientId, @PathVariable Long rentalId) {
        ClientLiving living = livingService.assignRental(slotId, clientId, rentalId);
        return toLivingResponse(living);
    }

    @PostMapping("/clients/{clientId}/living/owned/{propertyId}")
    public LivingResponse assignOwned(@PathVariable int slotId, @PathVariable Long clientId, @PathVariable Long propertyId) {
        ClientLiving living = livingService.assignOwnedProperty(slotId, clientId, propertyId);
        return toLivingResponse(living);
    }

    @PostMapping("/clients/{clientId}/living/none")
    public LivingResponse clearLiving(@PathVariable int slotId, @PathVariable Long clientId) {
        ClientLiving living = livingService.clearLiving(slotId, clientId);
        return toLivingResponse(living);
    }

    @GetMapping("/clients/{clientId}/living")
    public LivingResponse getLiving(@PathVariable int slotId, @PathVariable Long clientId) {
        ClientLiving living = livingService.getLiving(slotId, clientId);
        return toLivingResponse(living);
    }

    @PostMapping("/rentals/run-rent")
    public void triggerRent(@PathVariable int slotId) {
        User user = currentUserService.getCurrentUser();
        rentService.chargeRent(slotId, user.getId(), 0d);
    }

    private RentalResponse toRentalResponse(Rental r) {
        return RentalResponse.builder()
            .id(r.getId())
            .name(r.getName())
            .monthlyRent(r.getMonthlyRent())
            .bedrooms(r.getBedrooms())
            .sqft(r.getSqft())
            .location(r.getLocation())
            .imageUrl(r.getImageUrl())
            .status(r.getStatus())
            .createdAt(r.getCreatedAt())
            .build();
    }

    private LivingResponse toLivingResponse(ClientLiving living) {
        return LivingResponse.builder()
            .livingType(living.getLivingType().name())
            .propertyId(living.getProperty() == null ? null : living.getProperty().getId())
            .rentalId(living.getRental() == null ? null : living.getRental().getId())
            .monthlyRent(living.getMonthlyRentCache())
            .nextRentDay(living.getNextRentDay())
            .delinquent(living.getDelinquent())
            .startDate(living.getStartDate())
            .build();
    }
}
