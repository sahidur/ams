"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  FileDown, 
  Eye, 
  X, 
  Loader2, 
  Printer,
  Download
} from "lucide-react";
import { Button, Modal } from "@/components/ui";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

interface PDFGeneratorProps {
  bodyTemplate: string;
  formData: Record<string, unknown>;
  requestNumber: string;
  templateName: string;
  requesterName: string;
  submittedAt: string | null;
  status: string;
  className?: string;
}

export function PDFGenerator({
  bodyTemplate,
  formData,
  requestNumber,
  templateName,
  requesterName,
  submittedAt,
  status,
  className = "",
}: PDFGeneratorProps) {
  const [showPreview, setShowPreview] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  // Replace {{fieldName}} placeholders with actual values
  const processTemplate = (template: string): string => {
    let processed = template;
    
    // Add system placeholders
    const systemFields = {
      request_number: requestNumber,
      template_name: templateName,
      requester_name: requesterName,
      submitted_at: submittedAt ? new Date(submittedAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }) : "—",
      status: status,
      current_date: new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
    };

    // Replace system fields
    Object.entries(systemFields).forEach(([key, value]) => {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, "gi");
      processed = processed.replace(regex, String(value));
    });

    // Replace form data fields
    Object.entries(formData || {}).forEach(([key, value]) => {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, "gi");
      processed = processed.replace(regex, String(value ?? ""));
    });

    // Remove any remaining unreplaced placeholders
    processed = processed.replace(/\{\{[^}]+\}\}/g, "_______________");

    return processed;
  };

  const processedContent = bodyTemplate ? processTemplate(bodyTemplate) : null;

  const handleDownloadPDF = async () => {
    if (!contentRef.current) return;

    setIsGenerating(true);
    try {
      const canvas = await html2canvas(contentRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
      });

      const imgWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      const pdf = new jsPDF("p", "mm", "a4");
      let firstPage = true;

      while (heightLeft > 0) {
        if (!firstPage) {
          pdf.addPage();
        }
        
        pdf.addImage(
          canvas.toDataURL("image/png"),
          "PNG",
          0,
          position,
          imgWidth,
          imgHeight
        );
        
        heightLeft -= pageHeight;
        position -= pageHeight;
        firstPage = false;
      }

      pdf.save(`${templateName.replace(/\s+/g, "_")}_${requestNumber}.pdf`);
    } catch (error) {
      console.error("Error generating PDF:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrint = () => {
    if (!contentRef.current) return;
    
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${templateName} - ${requestNumber}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 40px;
              line-height: 1.6;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin: 16px 0;
            }
            th, td {
              border: 1px solid #d1d5db;
              padding: 8px 12px;
              text-align: left;
            }
            th {
              background-color: #f3f4f6;
            }
            ul, ol {
              padding-left: 24px;
            }
            h1 { font-size: 24px; }
            h2 { font-size: 20px; }
            h3 { font-size: 18px; }
            @media print {
              body { padding: 20px; }
            }
          </style>
        </head>
        <body>
          ${processedContent}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  if (!bodyTemplate) {
    return null;
  }

  return (
    <div className={className}>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowPreview(true)}
        >
          <Eye className="w-4 h-4 mr-1" />
          Preview Document
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleDownloadPDF}
          isLoading={isGenerating}
        >
          <FileDown className="w-4 h-4 mr-1" />
          Download PDF
        </Button>
      </div>

      {/* Preview Modal */}
      <Modal
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        title="Document Preview"
        size="full"
      >
        <div className="space-y-4">
          {/* Actions */}
          <div className="flex justify-end gap-2 pb-4 border-b">
            <Button variant="outline" onClick={handlePrint}>
              <Printer className="w-4 h-4 mr-1" />
              Print
            </Button>
            <Button onClick={handleDownloadPDF} isLoading={isGenerating}>
              <Download className="w-4 h-4 mr-1" />
              Download PDF
            </Button>
          </div>

          {/* Document Preview */}
          <div className="bg-gray-100 p-6 rounded-lg overflow-auto max-h-[70vh]">
            <div
              ref={contentRef}
              className="bg-white shadow-lg mx-auto max-w-[210mm] p-10 min-h-[297mm]"
              style={{ fontFamily: "Arial, sans-serif" }}
            >
              {/* Document Header */}
              <div className="border-b pb-4 mb-6">
                <h1 className="text-xl font-bold text-gray-900">{templateName}</h1>
                <div className="flex justify-between text-sm text-gray-500 mt-2">
                  <span>Request #: {requestNumber}</span>
                  <span>Date: {submittedAt ? new Date(submittedAt).toLocaleDateString() : new Date().toLocaleDateString()}</span>
                </div>
              </div>

              {/* Body Content */}
              <div 
                className="prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: processedContent || "" }}
              />

              {/* Document Footer */}
              <div className="border-t mt-10 pt-4 text-xs text-gray-400 text-center">
                Generated from AMS | {new Date().toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default PDFGenerator;
