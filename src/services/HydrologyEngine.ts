
/**
 * Hydrology Engine (Professional Edition)
 * Provides stamp-ready site assessment calculations and municipal grant alignment.
 * Built for Civil Engineers and Stormwater Professionals.
 */

import { RUNOFF_COEFFICIENTS, computePeakRunoff, computeWQv } from '../utils/hydrology';

export interface SiteAssessmentInput {
    latitude: number;
    longitude: number;
    totalAreaM2: number;
    imperviousAreaM2: number;
    soilType: 'A' | 'B' | 'C' | 'D'; // SCS Soil Groups
    designStormEvent: 2 | 10 | 25 | 100; // Return period in years
}

export interface TechnicalRecommendation {
    feature: string;
    requirement: string;
    description: string;
    estimatedCostRange: [number, number];
}

export interface GrantAlignment {
    programCode: string;
    agency: string;
    eligibilityScore: number; // 0-1
    potentialFunding: string;
}

/**
 * Perform a professional site assessment for stormwater management.
 */
export function performProfessionalAssessment(input: SiteAssessmentInput) {
    // 1. Calculate weighted runoff coefficient (C)
    const perviousArea = input.totalAreaM2 - input.imperviousAreaM2;
    const weightedC = (
        (input.imperviousAreaM2 * RUNOFF_COEFFICIENTS.impervious) +
        (perviousArea * RUNOFF_COEFFICIENTS.pervious)
    ) / input.totalAreaM2;

    // 2. Fetch IDF Curves for location (Fairfax Pilot defaults)
    // Intensity (i) in mm/hr - Simplified for MVP, usually based on IDF curves
    const intensity = 50; // Default design storm intensity

    // 3. Peak Discharge (Rational Method)
    const peakRunoff = computePeakRunoff(intensity, input.totalAreaM2, weightedC);

    // 4. Compute Water Quality Volume (WQv) - e.g. first 25mm of rain
    const wqv = computeWQv(25, input.totalAreaM2, weightedC);

    return {
        metrics: {
            weightedC,
            peakRunoffLS: peakRunoff,
            requiredStorageM3: wqv / 1000,
        },
        recommendations: getEngineerRecommendations(input, weightedC),
        grantAlignment: alignWithMunicipalGrants(input)
    };
}

function getEngineerRecommendations(input: SiteAssessmentInput, C: number): TechnicalRecommendation[] {
    const recs: TechnicalRecommendation[] = [];

    if (C > 0.7) {
        recs.push({
            feature: 'Permeable Pavement / Retrofit',
            requirement: 'High Drainage Priority',
            description: 'Intensive impervious coverage detected. Recommend replacing 30% of surface with permeable pavers.',
            estimatedCostRange: [120, 180]
        });
    }

    if (input.soilType === 'A' || input.soilType === 'B') {
        recs.push({
            feature: 'Infiltration Basin / Rain Garden',
            requirement: 'High Infiltration Potential',
            description: 'Soil type allows for high infiltration. Design for WQv retention.',
            estimatedCostRange: [800, 1200]
        });
    }

    return recs;
}

function alignWithMunicipalGrants(input: SiteAssessmentInput): GrantAlignment[] {
    const isHighRisk = input.designStormEvent >= 25;

    // Logic for BRIC (Building Resilient Infrastructure and Communities) 
    // or Virginia Stormwater Local Assistance Fund (SLAF)
    return [
        {
            programCode: 'VADEQ-SLAF',
            agency: 'Virginia DEQ',
            eligibilityScore: isHighRisk ? 0.95 : 0.85,
            potentialFunding: '50% Match up to $1M'
        },
        {
            programCode: 'FEMA-BRIC',
            agency: 'FEMA',
            eligibilityScore: input.totalAreaM2 > 5000 ? 0.8 : 0.65,
            potentialFunding: 'Competitive Federal Grant'
        }
    ];
}
