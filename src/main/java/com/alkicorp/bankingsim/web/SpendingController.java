package com.alkicorp.bankingsim.web;

import com.alkicorp.bankingsim.model.SpendingCategory;
import com.alkicorp.bankingsim.model.Transaction;
import com.alkicorp.bankingsim.service.SpendingService;
import com.alkicorp.bankingsim.web.dto.SpendingCategoryRequest;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/slots/{slotId}")
@RequiredArgsConstructor
public class SpendingController {

    private final SpendingService spendingService;
    private final com.alkicorp.bankingsim.repository.SpendingCategoryRepository spendingCategoryRepository;

    @PostMapping("/clients/{clientId}/spendings/run")
    public List<Transaction> runSpending(@PathVariable int slotId, @PathVariable Long clientId) {
        return spendingService.generateSpending(slotId, clientId);
    }

    @GetMapping("/spending-categories")
    public List<SpendingCategory> listCategories() {
        return spendingCategoryRepository.findAllByOrderByIdAsc();
    }

    @PostMapping("/spending-categories")
    @PreAuthorize("hasRole('ADMIN')")
    public SpendingCategory createCategory(@RequestBody SpendingCategoryRequest request) {
        SpendingCategory cat = new SpendingCategory();
        cat.setName(request.getName());
        cat.setMinPctIncome(request.getMinPctIncome());
        cat.setMaxPctIncome(request.getMaxPctIncome());
        cat.setVariability(request.getVariability());
        cat.setMandatory(request.getMandatory());
        cat.setDefaultActive(request.getDefaultActive());
        cat.setCreatedAt(java.time.Instant.now());
        return spendingCategoryRepository.save(cat);
    }

    @PutMapping("/spending-categories/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public SpendingCategory updateCategory(@PathVariable Long id, @RequestBody SpendingCategoryRequest request) {
        SpendingCategory cat = spendingCategoryRepository.findById(id).orElseThrow();
        cat.setName(request.getName());
        cat.setMinPctIncome(request.getMinPctIncome());
        cat.setMaxPctIncome(request.getMaxPctIncome());
        cat.setVariability(request.getVariability());
        cat.setMandatory(request.getMandatory());
        cat.setDefaultActive(request.getDefaultActive());
        return spendingCategoryRepository.save(cat);
    }
}
