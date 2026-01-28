
import { describe, it, expect } from 'vitest';
import { evaluateClaim, ClaimEvent, Policy } from '../../../src/services/ClaimTrigger';

describe('ClaimTrigger Service', () => {
    // Fairfax Policy
    const fairfaxPolicy: Policy = {
        id: 'skyclaim_fairfax_basic',
        name: 'SkyClaim Fairfax Basic',
        region: 'usa-va-fairfax',
        triggers: {
            satelliteDepthCm: 10,  // >10cm water
            riverGaugeFloodStage: 'MODERATE', // USGS Flood Stage
            sensorVerification: true // Must match IoT sensor
        },
        payoutAmountUSD: 5000
    };

    it('should REJECT claim if Satellite data is below threshold', () => {
        const event: ClaimEvent = {
            latitude: 38.8462,
            longitude: -77.3064,
            satelliteWaterDepthCm: 5, // Too low
            riverGaugeStatus: 'MODERATE',
            iotSensorWet: true
        };

        const result = evaluateClaim(event, fairfaxPolicy);
        expect(result.approved).toBe(false);
        expect(result.reason[0]).toContain('Satellite depth insufficient');
    });

    it('should REJECT claim if River Gauge is normal', () => {
        const event: ClaimEvent = {
            latitude: 38.8462,
            longitude: -77.3064,
            satelliteWaterDepthCm: 15, // Good
            riverGaugeStatus: 'NORMAL', // Too low
            iotSensorWet: true
        };

        const result = evaluateClaim(event, fairfaxPolicy);
        expect(result.approved).toBe(false);
        expect(result.reason[0]).toContain('River gauge not at flood stage');
    });

    it('should REJECT claim if IoT Sensor is Dry (Fraud Check)', () => {
        const event: ClaimEvent = {
            latitude: 38.8462,
            longitude: -77.3064,
            satelliteWaterDepthCm: 15,
            riverGaugeStatus: 'MODERATE',
            iotSensorWet: false // Dry!
        };

        const result = evaluateClaim(event, fairfaxPolicy);
        expect(result.approved).toBe(false);
        expect(result.reason[0]).toContain('IoT Sensor mismatch');
    });

    it('should APPROVE claim if ALL Oracles agree', () => {
        const event: ClaimEvent = {
            latitude: 38.8462,
            longitude: -77.3064,
            satelliteWaterDepthCm: 15, // >10
            riverGaugeStatus: 'MAJOR', // > MODERATE
            iotSensorWet: true // Matches
        };

        const result = evaluateClaim(event, fairfaxPolicy);
        expect(result.approved).toBe(true);
        expect(result.payoutAmount).toBe(5000);
    });
});
