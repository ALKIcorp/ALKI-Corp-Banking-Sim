package com.alkicorp.bankingsim.repository;

import com.alkicorp.bankingsim.model.Product;
import com.alkicorp.bankingsim.model.enums.ProductStatus;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProductRepository extends JpaRepository<Product, Long> {
    List<Product> findBySlotIdAndStatus(int slotId, ProductStatus status);

    List<Product> findBySlotIdAndCreatedById(int slotId, Long userId);

    Optional<Product> findByIdAndSlotIdAndCreatedById(Long id, int slotId, Long userId);

    Optional<Product> findByIdAndSlotIdAndOwnerClientId(Long id, int slotId, Long ownerClientId);

    Optional<Product> findByIdAndSlotId(Long id, int slotId);

    List<Product> findByOwnerClientId(Long clientId);
}
