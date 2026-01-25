package com.alkicorp.bankingsim.service;

import com.alkicorp.bankingsim.auth.model.User;
import com.alkicorp.bankingsim.auth.service.CurrentUserService;
import com.alkicorp.bankingsim.model.Client;
import com.alkicorp.bankingsim.model.Product;
import com.alkicorp.bankingsim.model.enums.ProductStatus;
import com.alkicorp.bankingsim.repository.ClientRepository;
import com.alkicorp.bankingsim.repository.ProductRepository;
import jakarta.validation.ValidationException;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class ProductService {

    private final ProductRepository productRepository;
    private final ClientRepository clientRepository;
    private final CurrentUserService currentUserService;
    private final Clock clock = Clock.systemUTC();

    @Transactional
    public Product createProduct(int slotId, Product draft) {
        validateDraft(draft);
        User user = currentUserService.getCurrentUser();
        Product product = new Product();
        product.setSlotId(slotId);
        product.setCreatedBy(user);
        product.setName(draft.getName().trim());
        product.setPrice(draft.getPrice());
        product.setDescription(draft.getDescription().trim());
        product.setRooms(draft.getRooms());
        product.setSqft2(draft.getSqft2());
        product.setImageUrl(cleanImageUrl(draft.getImageUrl()));
        product.setStatus(ProductStatus.AVAILABLE);
        product.setCreatedAt(Instant.now(clock));
        return productRepository.save(product);
    }

    @Transactional
    public Product updateProduct(int slotId, Long productId, Product draft, String statusOverride) {
        validateDraft(draft);
        User user = currentUserService.getCurrentUser();
        Product product = productRepository.findByIdAndSlotIdAndCreatedById(productId, slotId, user.getId())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Product not found"));
        product.setName(draft.getName().trim());
        product.setPrice(draft.getPrice());
        product.setDescription(draft.getDescription().trim());
        product.setRooms(draft.getRooms());
        product.setSqft2(draft.getSqft2());
        product.setImageUrl(cleanImageUrl(draft.getImageUrl()));
        if (statusOverride != null && !statusOverride.isBlank()) {
            product.setStatus(parseStatus(statusOverride));
        }
        return productRepository.save(product);
    }

    @Transactional
    public void deleteProduct(int slotId, Long productId) {
        User user = currentUserService.getCurrentUser();
        Product product = productRepository.findByIdAndSlotIdAndCreatedById(productId, slotId, user.getId())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Product not found"));
        productRepository.delete(product);
    }

    @Transactional(readOnly = true)
    public List<Product> listAvailable(int slotId) {
        return productRepository.findBySlotIdAndStatus(slotId, ProductStatus.AVAILABLE);
    }

    @Transactional(readOnly = true)
    public List<Product> listAll(int slotId) {
        User user = currentUserService.getCurrentUser();
        return productRepository.findBySlotIdAndCreatedById(slotId, user.getId());
    }

    @Transactional(readOnly = true)
    public Product getProduct(int slotId, Long productId) {
        User user = currentUserService.getCurrentUser();
        return productRepository.findByIdAndSlotIdAndCreatedById(productId, slotId, user.getId())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Product not found"));
    }

    @Transactional(readOnly = true)
    public List<Product> getOwnedProducts(int slotId, Long clientId) {
        User user = currentUserService.getCurrentUser();
        Client client = clientRepository.findByIdAndSlotIdAndBankStateUserId(clientId, slotId, user.getId())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Client not found"));
        return productRepository.findByOwnerClientId(client.getId());
    }

    private void validateDraft(Product draft) {
        if (draft == null) {
            throw new ValidationException("Product data is required.");
        }
        if (draft.getName() == null || draft.getName().isBlank()) {
            throw new ValidationException("Property name is required.");
        }
        if (draft.getPrice() == null || draft.getPrice().compareTo(BigDecimal.ZERO) <= 0) {
            throw new ValidationException("Property price must be greater than zero.");
        }
        if (draft.getDescription() == null || draft.getDescription().isBlank()) {
            throw new ValidationException("Property description is required.");
        }
        if (draft.getRooms() == null || draft.getRooms() <= 0) {
            throw new ValidationException("Rooms must be greater than zero.");
        }
        if (draft.getSqft2() == null || draft.getSqft2() <= 0) {
            throw new ValidationException("Square footage must be greater than zero.");
        }
    }

    private String cleanImageUrl(String imageUrl) {
        if (imageUrl == null || imageUrl.isBlank()) {
            return null;
        }
        return imageUrl.trim();
    }

    private ProductStatus parseStatus(String status) {
        try {
            return ProductStatus.valueOf(status.trim().toUpperCase());
        } catch (IllegalArgumentException ex) {
            throw new ValidationException("Invalid product status.");
        }
    }
}
