package com.alkicorp.bankingsim.web;

import com.alkicorp.bankingsim.model.Product;
import com.alkicorp.bankingsim.service.ProductService;
import com.alkicorp.bankingsim.web.dto.ProductResponse;
import java.util.List;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/products")
@RequiredArgsConstructor
public class PublicProductController {

    private final ProductService productService;

    /**
     * Public endpoint used by the property market to display every available property across all slots.
     */
    @GetMapping("/available")
    public List<ProductResponse> listAvailableAcrossSlots() {
        return productService.listAvailableAcrossSlots().stream()
            .map(this::toResponse)
            .collect(Collectors.toList());
    }

    private ProductResponse toResponse(Product product) {
        return ProductResponse.builder()
            .id(product.getId())
            .slotId(product.getSlotId())
            .name(product.getName())
            .price(product.getPrice())
            .description(product.getDescription())
            .rooms(product.getRooms())
            .sqft2(product.getSqft2())
            .imageUrl(product.getImageUrl())
            .status(product.getStatus().name())
            .ownerClientId(product.getOwnerClient() == null ? null : product.getOwnerClient().getId())
            .createdAt(product.getCreatedAt())
            .build();
    }
}
