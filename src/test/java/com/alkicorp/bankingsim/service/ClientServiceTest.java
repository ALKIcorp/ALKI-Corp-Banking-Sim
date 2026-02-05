package com.alkicorp.bankingsim.service;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoMoreInteractions;
import static org.mockito.Mockito.when;

import com.alkicorp.bankingsim.auth.model.User;
import com.alkicorp.bankingsim.auth.service.CurrentUserService;
import com.alkicorp.bankingsim.model.BankState;
import com.alkicorp.bankingsim.model.Client;
import com.alkicorp.bankingsim.repository.ClientJobRepository;
import com.alkicorp.bankingsim.repository.ClientRepository;
import com.alkicorp.bankingsim.repository.TransactionRepository;
import java.util.Collections;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

@ExtendWith(MockitoExtension.class)
class ClientServiceTest {

    private static final int SLOT_ID = 42;
    private static final long CLIENT_ID = 7L;

    @Mock
    private ClientRepository clientRepository;
    @Mock
    private ClientJobRepository clientJobRepository;
    @Mock
    private TransactionRepository transactionRepository;
    @Mock
    private SimulationService simulationService;
    @Mock
    private CurrentUserService currentUserService;
    @Mock
    private User user;

    @InjectMocks
    private ClientService clientService;

    @BeforeEach
    void setup() {
        when(currentUserService.getCurrentUser()).thenReturn(user);
    }

    @Test
    void getClients_advancesSimulationFirst() {
        when(simulationService.getAndAdvanceState(user, SLOT_ID)).thenReturn(Optional.of(new BankState()));
        when(clientRepository.findBySlotIdAndBankStateUserId(SLOT_ID, user.getId())).thenReturn(Collections.emptyList());

        clientService.getClients(SLOT_ID);

        verify(simulationService).getAndAdvanceState(user, SLOT_ID);
        verify(clientRepository).findBySlotIdAndBankStateUserId(SLOT_ID, user.getId());
        verifyNoMoreInteractions(simulationService);
    }

    @Test
    void getClients_throwsWhenBankStateMissing() {
        when(simulationService.getAndAdvanceState(user, SLOT_ID)).thenReturn(Optional.empty());

        assertThrows(ResponseStatusException.class, () -> clientService.getClients(SLOT_ID));
    }

    @Test
    void getTransactions_advancesSimulationBeforeFetching() {
        Client client = new Client();
        client.setId(CLIENT_ID);
        when(simulationService.getAndAdvanceState(user, SLOT_ID)).thenReturn(Optional.of(new BankState()));
        when(clientRepository.findByIdAndSlotIdAndBankStateUserId(CLIENT_ID, SLOT_ID, user.getId()))
            .thenReturn(Optional.of(client));
        when(transactionRepository.findByClientOrderByCreatedAtDesc(client)).thenReturn(Collections.emptyList());

        clientService.getTransactions(CLIENT_ID, SLOT_ID);

        verify(simulationService).getAndAdvanceState(user, SLOT_ID);
        verify(clientRepository).findByIdAndSlotIdAndBankStateUserId(CLIENT_ID, SLOT_ID, user.getId());
        verify(transactionRepository).findByClientOrderByCreatedAtDesc(client);
    }
}
