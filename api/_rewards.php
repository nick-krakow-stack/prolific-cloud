<?php
/**
 * Reward helpers for Prolific submissions.
 *
 * Prolific can report adjustments separately from the base reward. In those
 * cases reward_amount_minor may contain only the adjustment, so dashboard
 * totals must use the effective payout components instead of the raw field.
 */

declare(strict_types=1);

function effective_reward_amount_minor($baseReward, $adjustment, $bonus, $screenedOut, $rawReward): int {
    $baseReward = (int)($baseReward ?? 0);
    $adjustment = (int)($adjustment ?? 0);
    $bonus = (int)($bonus ?? 0);
    $screenedOut = (int)($screenedOut ?? 0);
    $rawReward = (int)($rawReward ?? 0);

    if ($screenedOut !== 0) {
        return $screenedOut + $adjustment + $bonus;
    }

    if ($baseReward !== 0 || $adjustment !== 0 || $bonus !== 0) {
        return $baseReward + $adjustment + $bonus;
    }

    return $rawReward;
}

function effective_reward_amount_sql(string $alias = ''): string {
    $prefix = $alias !== '' ? $alias . '.' : '';

    return "CASE
        WHEN COALESCE({$prefix}screened_out_amount_minor, 0) <> 0
            THEN COALESCE({$prefix}screened_out_amount_minor, 0)
               + COALESCE({$prefix}adjustment_amount_minor, 0)
               + COALESCE({$prefix}bonus_amount_minor, 0)
        WHEN COALESCE({$prefix}base_reward_minor, 0) <> 0
          OR COALESCE({$prefix}adjustment_amount_minor, 0) <> 0
          OR COALESCE({$prefix}bonus_amount_minor, 0) <> 0
            THEN COALESCE({$prefix}base_reward_minor, 0)
               + COALESCE({$prefix}adjustment_amount_minor, 0)
               + COALESCE({$prefix}bonus_amount_minor, 0)
        ELSE COALESCE({$prefix}reward_amount_minor, 0)
    END";
}
