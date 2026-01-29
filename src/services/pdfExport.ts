import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import type { GreenFix } from '../utils/hydrology';
import { performProfessionalAssessment } from './HydrologyEngine';

export interface PDFExportData {
    streetName: string;
    latitude: number;
    longitude: number;
    rainfall: number;
    totalArea: number;
    totalReduction: number;
    features: GreenFix[];
    peakRunoff: number;
    screenshotElement?: HTMLElement | null;
}

/**
 * Export project data as a professional engineer's report
 */
export async function exportProjectPDF(data: PDFExportData): Promise<void> {
    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
    });

    // Run professional assessment
    const assessment = performProfessionalAssessment({
        latitude: data.latitude,
        longitude: data.longitude,
        totalAreaM2: data.totalArea,
        imperviousAreaM2: data.totalArea,
        soilType: 'B',
        designStormEvent: 10
    });

    let y = 15;
    y = drawPDFHeader(doc, data, y);
    y = await drawARCapture(doc, data, y);
    y = drawHydrologyData(doc, data, assessment.metrics, y);
    y = drawEngineeringSpecifications(doc, assessment.recommendations, y);
    y = drawGrantAlignmentSummary(doc, assessment.grantAlignment, y);
    drawPDFFooter(doc);

    const filename = `${data.streetName.replace(/\s+/g, '_')}_Engineering_Report.pdf`;
    doc.save(filename);
}

function drawPDFHeader(doc: jsPDF, data: PDFExportData, y: number): number {
    const pageWidth = doc.internal.pageSize.getWidth();
    doc.setFillColor(31, 41, 55);
    doc.rect(0, 0, pageWidth, 35, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('Stormwater Site Assessment Report', 10, y + 5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(14);
    doc.text(`Project Location: ${data.streetName}`, 10, y + 15);

    doc.setFontSize(10);
    doc.text(`GIS Coordinates: ${data.latitude.toFixed(6)}, ${data.longitude.toFixed(6)}`, 10, y + 22);

    return 45;
}

async function addCaptureToPDF(doc: jsPDF, container: HTMLElement | null, y: number): Promise<void> {
    if (!container) {
        doc.setFontSize(10);
        doc.setTextColor(128, 128, 128);
        doc.text('[AR Site Survey Placeholder]', 10, y + 50);
        return;
    }
    const canvas = await html2canvas(container);
    doc.addImage(canvas.toDataURL('image/png'), 'PNG', 10, y, 190, 100);
}

async function drawARCapture(doc: jsPDF, data: PDFExportData, y: number): Promise<number> {
    doc.setTextColor(31, 41, 55);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('1.0 Field Infrastructure Analysis (AR Capture)', 10, y);
    const container = data.screenshotElement || document.querySelector('#ar-container');
    try {
        await addCaptureToPDF(doc, container as HTMLElement, y + 5);
    } catch { /* ignore */ }
    return y + 110;
}

function drawHydrologyData(doc: jsPDF, data: PDFExportData, metrics: any, y: number): number {
    doc.setTextColor(31, 41, 55);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('2.0 Hydrology & Basin Characteristics (Rational Method)', 10, y);
    y += 8;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`• Rainfall Intensity (i): ${data.rainfall} mm/hr`, 15, y);
    y += 6;
    doc.text(`• Weighted Runoff Coefficient (C): ${metrics.weightedC.toFixed(2)}`, 15, y);
    y += 6;
    doc.text(`• Peak Discharge (Q): ${metrics.peakRunoffLS.toFixed(2)} L/s`, 15, y);
    y += 6;
    doc.text(`• Required Water Quality Volume (WQv): ${metrics.requiredStorageM3.toFixed(2)} m³`, 15, y);
    return y + 10;
}

function drawEngineeringSpecifications(doc: jsPDF, recs: any[], y: number): number {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('3.0 Technical Specifications & Infrastructure Sizing', 10, y);
    y += 8;

    recs.forEach((rec, index) => {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text(`${index + 1}. ${rec.feature}`, 15, y);
        y += 5;
        doc.setFont('helvetica', 'normal');
        doc.text(`Requirement: ${rec.requirement}`, 20, y);
        y += 5;
        doc.text(`Spec: ${rec.description}`, 20, y);
        y += 6;
    });

    return y + 5;
}

function drawGrantAlignmentSummary(doc: jsPDF, grants: any[], y: number): number {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('4.0 Municipal Grant & Funding Alignment', 10, y);
    y += 8;

    grants.forEach((grant) => {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text(`• ${grant.programCode} (${grant.agency})`, 15, y);
        y += 5;
        doc.setFont('helvetica', 'normal');
        doc.text(`Target Score: ${(grant.eligibilityScore * 100).toFixed(0)}% | Payout: ${grant.potentialFunding}`, 20, y);
        y += 6;
    });

    return y + 15;
}

function drawPDFFooter(doc: jsPDF): void {
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    doc.text(
        `Technical Assessment generated by Micro-Catchment Pro OS | Civil Engineering Companion | ${new Date().toLocaleDateString()}`,
        10,
        285
    );
}
