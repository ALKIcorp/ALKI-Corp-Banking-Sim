package com.alkicorp.bankingsim.service;

import java.math.BigDecimal;

public final class SimulationConstants {
    public static final BigDecimal DAILY_WITHDRAWAL_LIMIT = BigDecimal.valueOf(500);
    public static final BigDecimal LIQUID_CASH_MONTHLY_GROWTH = BigDecimal.valueOf(0.025);
    public static final BigDecimal SP500_INITIAL_PRICE = BigDecimal.valueOf(4500);
    public static final BigDecimal SP500_ANNUAL_GROWTH = BigDecimal.valueOf(0.10);
    public static final BigDecimal SP500_ANNUAL_DIVIDEND = BigDecimal.valueOf(0.03);
    public static final int DAYS_PER_YEAR = 12;
    public static final int REPAYMENT_PERIOD_DAYS = 1;
    public static final long REAL_MS_PER_GAME_DAY = 60_000L; // 1 minute real time = 1 game day

    private SimulationConstants() {
    }
}
