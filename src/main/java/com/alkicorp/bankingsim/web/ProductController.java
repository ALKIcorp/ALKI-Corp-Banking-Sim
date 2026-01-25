package com.alkicorp.bankingsim.web;

import com.alkicorp.bankingsim.model.Product;
import com.alkicorp.bankingsim.service.ProductService;
import com.alkicorp.bankingsim.web.dto.CreateProductRequest;
import com.alkicorp.bankingsim.web.dto.ProductResponse;
import com.alkicorp.bankingsim.web.dto.UpdateProductRequest;
import java.util.List;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/slots/{slotId}/products")
@RequiredArgsConstructor
public class ProductController {

    private final ProductService productService;

    @GetMapping
    public List<ProductResponse> listAvailable(@PathVariable int slotId) {
        return productService.listAvailable(slotId).stream()
            .map(this::toResponse)
            .collect(Collectors.toList());
    }

    @GetMapping("/all")
    @PreAuthorize("hasRole('ADMIN')")
    public List<ProductResponse> listAll(@PathVariable int slotId) {
        return productService.listAll(slotId).stream()
            .map(this::toResponse)
            .collect(Collectors.toList());
    }

    @GetMapping("/{productId}")
    public ProductResponse getProduct(@PathVariable int slotId, @PathVariable Long productId) {
        return toResponse(productService.getProduct(slotId, productId));
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ProductResponse createProduct(@PathVariable int slotId, @RequestBody CreateProductRequest request) {
        Product draft = new Product();
        draft.setName(request.getName());
        draft.setPrice(request.getPrice());
        draft.setDescription(request.getDescription());
        draft.setRooms(request.getRooms());
        draft.setSqft2(request.getSqft2());
        draft.setImageUrl(request.getImageUrl());
        return toResponse(productService.createProduct(slotId, draft));
    }

    @PutMapping("/{productId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ProductResponse updateProduct(@PathVariable int slotId,
                                         @PathVariable Long productId,
                                         @RequestBody UpdateProductRequest request) {
        Product draft = new Product();
        draft.setName(request.getName());
        draft.setPrice(request.getPrice());
        draft.setDescription(request.getDescription());
        draft.setRooms(request.getRooms());
        draft.setSqft2(request.getSqft2());
        draft.setImageUrl(request.getImageUrl());
        return toResponse(productService.updateProduct(slotId, productId, draft, request.getStatus()));
    }

    @DeleteMapping("/{productId}")
    @PreAuthorize("hasRole('ADMIN')")
    public void deleteProduct(@PathVariable int slotId, @PathVariable Long productId) {
        productService.deleteProduct(slotId, productId);
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
