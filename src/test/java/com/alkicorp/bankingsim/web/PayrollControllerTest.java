package com.alkicorp.bankingsim.web;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.alkicorp.bankingsim.auth.model.User;
import com.alkicorp.bankingsim.auth.service.CurrentUserService;
import com.alkicorp.bankingsim.model.BankState;
import com.alkicorp.bankingsim.service.PayrollService;
import com.alkicorp.bankingsim.service.SimulationService;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class PayrollControllerTest {

    @Mock
    private PayrollService payrollService;

    @Mock
    private SimulationService simulationService;

    @Mock
    private CurrentUserService currentUserService;

    @Mock
    private User user;

    @InjectMocks
    private PayrollController controller;

    @Test
    void runUsesCurrentGameDayFromSimulation() {
        BankState state = new BankState();
        state.setGameDay(17.5);

        when(currentUserService.getCurrentUser()).thenReturn(user);
        when(user.getId()).thenReturn(7L);
        when(simulationService.getAndAdvanceState(user, 1)).thenReturn(Optional.of(state));

        controller.run(1);

        verify(payrollService).runPayroll(1, 7L, 17.5);
    }
}
