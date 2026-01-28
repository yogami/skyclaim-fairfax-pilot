
/**
 * Claim Trigger Service (The "Oracle")
 * Evaluates multi-modal data streams to validate parametric insurance claims.
 */

export interface ClaimEvent {
    latitude: number;
    longitude: number;
    satelliteWaterDepthCm: number;
    riverGaugeStatus: 'NORMAL' | 'ACTION' | 'MINOR' | 'MODERATE' | 'MAJOR';
    iotSensorWet: boolean;
}

export interface Policy {
    id: string;
    name: string;
    region: string;
    triggers: {
        satelliteDepthCm: number;
        riverGaugeFloodStage: 'NORMAL' | 'ACTION' | 'MINOR' | 'MODERATE' | 'MAJOR';
        sensorVerification: boolean;
    };
    payoutAmountUSD: number;
}

export interface ClaimResult {
    approved: boolean;
    payoutAmount: number;
    reason: string[];
}

const FLOOD_SEVERITY_RANK = {
    'NORMAL': 0,
    'ACTION': 1,
    'MINOR': 2,
    'MODERATE': 3,
    'MAJOR': 4
};

/**
 * Evaluate a potential claim against a policy using Triple Oracle Verification.
 */
export function evaluateClaim(event: ClaimEvent, policy: Policy): ClaimResult {
    const reasons: string[] = [];
    let approved = true;

    // Oracle 1: Satellite Radar
    if (event.satelliteWaterDepthCm < policy.triggers.satelliteDepthCm) {
        approved = false;
        reasons.push(`Satellite depth insufficient (${event.satelliteWaterDepthCm}cm < ${policy.triggers.satelliteDepthCm}cm)`);
    }

    // Oracle 2: River Gauge (Municipal API)
    const eventSeverity = FLOOD_SEVERITY_RANK[event.riverGaugeStatus];
    const triggerSeverity = FLOOD_SEVERITY_RANK[policy.triggers.riverGaugeFloodStage];

    if (eventSeverity < triggerSeverity) {
        approved = false;
        reasons.push(`River gauge not at flood stage (${event.riverGaugeStatus} < ${policy.triggers.riverGaugeFloodStage})`);
    }

    // Oracle 3: IoT Sensor (Ground Truth)
    if (policy.triggers.sensorVerification && !event.iotSensorWet) {
        approved = false;
        reasons.push('IoT Sensor mismatch (Sensor reported DRY during flood event)');
    }

    return {
        approved,
        payoutAmount: approved ? policy.payoutAmountUSD : 0,
        reason: reasons
    };
}
