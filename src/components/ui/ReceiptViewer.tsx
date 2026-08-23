import React, { useState, useEffect } from 'react';
import { X, ExternalLink, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ReceiptService } from '../../services/receipt.service';

interface ReceiptViewerProps {
  storagePath: string;
  fileName: string;
  fileType: string;
  isOpen: boolean;
  onClose: () => void;
}

export const ReceiptViewer: React.FC<ReceiptViewerProps> = ({
  storagePath,
  fileName,
  fileType,
  isOpen,
  onClose
}) => {
  const [url, setUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && storagePath) {
      setIsLoading(true);
      setError(null);
      ReceiptService.getReceiptUrl(storagePath)
        .then(setUrl)
        .catch((err) => {
          console.error("Failed to load receipt:", err);
          setError("Failed to load receipt.");
        })
        .finally(() => setIsLoading(false));
    } else {
      setUrl(null);
    }
  }, [isOpen, storagePath]);

  const isImage = fileType?.startsWith('image/');
  const isPdf = fileType === 'application/pdf';

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[300] bg-black/90 backdrop-blur-sm flex flex-col items-center justify-center p-4"
        >
          {/* Header */}
          <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center bg-gradient-to-b from-black/50 to-transparent">
            <h3 className="text-white font-bold truncate max-w-[200px]">{fileName}</h3>
            <div className="flex items-center gap-4">
              {url && (
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white hover:text-muted-foreground/30"
                >
                  <ExternalLink size={24} />
                </a>
              )}
              <button
                onClick={onClose}
                className="text-white hover:text-muted-foreground/30 bg-card/10 p-2 rounded-full"
              >
                <X size={24} />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="w-full max-w-3xl max-h-[80vh] flex items-center justify-center relative rounded-[24px] overflow-hidden">
            {isLoading && (
              <div className="flex flex-col items-center text-white/50">
                <Loader2 className="animate-spin mb-4" size={32} />
                <span>Loading receipt...</span>
              </div>
            )}
            
            {error && (
              <div className="text-red-400 font-medium bg-red-400/10 px-6 py-4 rounded-xl border border-red-400/20">
                {error}
              </div>
            )}

            {!isLoading && !error && url && (
              <>
                {isImage && (
                  <img
                    src={url}
                    alt={fileName}
                    className="max-w-full max-h-[80vh] object-contain rounded-xl"
                  />
                )}
                {isPdf && (
                  <iframe
                    src={`${url}#toolbar=0`}
                    className="w-full h-[80vh] rounded-xl bg-card"
                    title={fileName}
                  />
                )}
                {!isImage && !isPdf && (
                  <div className="text-white text-center bg-card/10 p-8 rounded-2xl">
                    <p className="mb-4">Preview not available for this file type.</p>
                    <a href={url} target="_blank" rel="noopener noreferrer" className="bg-primary text-white px-6 py-3 rounded-full font-bold">
                      Download File
                    </a>
                  </div>
                )}
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
