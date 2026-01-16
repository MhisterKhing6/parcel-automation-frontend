import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface AssignmentPdfData {
    parcelId: string;
    recipientName: string;
    phone: string;
    location: string;
    amount: string;
    status: string;
    assignedAt?: string;
}

export const generateAssignmentsPDF = (assignments: AssignmentPdfData[], riderName?: string): void => {
    try {
        // Use landscape orientation for better width
        const doc = new jsPDF('landscape', 'mm', 'a4');
        
        // Add header
        doc.setFontSize(18);
        doc.setTextColor(234, 105, 12); // Orange color
        doc.text('M&M Services - Rider Assignments', 14, 20);
        
        // Add rider name if provided
        if (riderName) {
            doc.setFontSize(12);
            doc.setTextColor(0, 0, 0);
            doc.text(`Rider: ${riderName}`, 14, 30);
        }
        
        // Add date
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        const currentDate = new Date().toLocaleString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        doc.text(`Generated: ${currentDate}`, 14, 37);
        
        // Helper function to truncate text if too long
        const truncateText = (text: string, maxLength: number = 30): string => {
            if (!text || text === 'N/A') return text || 'N/A';
            return text.length > maxLength ? text.substring(0, maxLength - 3) + '...' : text;
        };

        // Prepare table data with truncated long text
        const tableData = assignments.map(assignment => [
            truncateText(assignment.recipientName || 'N/A', 30),
            truncateText(assignment.phone || 'N/A', 25),
            truncateText(assignment.location || 'N/A', 50), // Location can be longer
            assignment.amount,
            '' // Signature column - empty for customer to sign
        ]);
        
        // Add table using autoTable
        autoTable(doc, {
            head: [['Recipient', 'Phone', 'Location', 'Amount', 'Signature']],
            body: tableData,
            startY: 45,
            styles: {
                fontSize: 8,
                cellPadding: 2,
                overflow: 'linebreak',
                cellWidth: 'wrap',
            },
            headStyles: {
                fillColor: [234, 105, 12], // Orange header
                textColor: [255, 255, 255],
                fontStyle: 'bold',
                fontSize: 9,
            },
            columnStyles: {
                0: { cellWidth: 50, overflow: 'linebreak' }, // Recipient
                1: { cellWidth: 45, overflow: 'linebreak' }, // Phone
                2: { cellWidth: 90, overflow: 'linebreak' }, // Location - wider for addresses
                3: { cellWidth: 40, overflow: 'linebreak' }, // Amount
                4: { cellWidth: 50, overflow: 'linebreak', halign: 'center', minCellHeight: 15 }, // Signature - centered with more space and height
            },
            bodyStyles: {
                cellPadding: { top: 5, bottom: 5, left: 2, right: 2 },
            },
            alternateRowStyles: {
                fillColor: [245, 245, 245],
            },
            margin: { top: 45, left: 10, right: 10 },
            tableWidth: 'auto',
            showHead: 'everyPage',
        });
        
        // Add footer
        const pageCount = doc.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(100, 100, 100);
            doc.text(
                `Page ${i} of ${pageCount}`,
                doc.internal.pageSize.width / 2,
                doc.internal.pageSize.height - 10,
                { align: 'center' }
            );
        }
        
        // Generate filename
        const filename = `rider-assignments-${new Date().toISOString().split('T')[0]}.pdf`;
        
        // Save PDF
        doc.save(filename);
    } catch (error) {
        console.error('PDF generation error:', error);
        throw error;
    }
};

