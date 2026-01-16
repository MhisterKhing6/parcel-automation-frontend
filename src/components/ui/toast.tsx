import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { X, CheckCircle2, AlertCircle, Info, AlertTriangle } from "lucide-react";
import { Card } from "./card";

export type ToastType = "success" | "error" | "info" | "warning";

interface Toast {
    id: string;
    message: string;
    type: ToastType;
    duration?: number;
}

interface ToastContextType {
    showToast: (message: string, type?: ToastType, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const showToast = useCallback((message: string, type: ToastType = "info", duration: number = 4000) => {
        const id = Math.random().toString(36).substring(2, 9);
        const newToast: Toast = { id, message, type, duration };
        
        setToasts((prev) => [...prev, newToast]);

        // Auto remove after duration
        setTimeout(() => {
            setToasts((prev) => prev.filter((toast) => toast.id !== id));
        }, duration);
    }, []);

    const removeToast = useCallback((id: string) => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, []);

    const getToastIcon = (type: ToastType) => {
        switch (type) {
            case "success":
                return <CheckCircle2 className="w-5 h-5 text-green-600" />;
            case "error":
                return <AlertCircle className="w-5 h-5 text-red-600" />;
            case "warning":
                return <AlertTriangle className="w-5 h-5 text-orange-600" />;
            case "info":
            default:
                return <Info className="w-5 h-5 text-blue-600" />;
        }
    };

    const getToastStyles = (type: ToastType) => {
        switch (type) {
            case "success":
                return "bg-green-50 border-green-200";
            case "error":
                return "bg-red-50 border-red-200";
            case "warning":
                return "bg-orange-50 border-orange-200";
            case "info":
            default:
                return "bg-blue-50 border-blue-200";
        }
    };

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 max-w-md w-full sm:w-auto">
                {toasts.map((toast) => (
                    <Card
                        key={toast.id}
                        className={`${getToastStyles(toast.type)} border shadow-lg p-4 animate-in slide-in-from-right transition-all`}
                    >
                        <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 mt-0.5">
                                {getToastIcon(toast.type)}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-neutral-800">{toast.message}</p>
                            </div>
                            <button
                                onClick={() => removeToast(toast.id)}
                                className="flex-shrink-0 text-neutral-400 hover:text-neutral-600 transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </Card>
                ))}
            </div>
        </ToastContext.Provider>
    );
};

export const useToast = () => {
    const context = useContext(ToastContext);
    if (context === undefined) {
        throw new Error("useToast must be used within a ToastProvider");
    }
    return context;
};


