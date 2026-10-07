import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface DropdownProps {
    label: string;
    icon?: React.ReactNode;
    children: React.ReactNode;
    buttonClassName?: string;
    style?: React.CSSProperties;
}

export default function Dropdown({ label, icon, children, buttonClassName = 'btn-secondary', style }: DropdownProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [position, setPosition] = useState({ top: 0, left: 0 });
    const dropdownRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node) &&
                buttonRef.current && !buttonRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);

            // Calculate position
            if (buttonRef.current) {
                const rect = buttonRef.current.getBoundingClientRect();
                setPosition({
                    top: rect.bottom + 8,
                    left: rect.left
                });
            }
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    return (
        <div className="relative">
            <button
                ref={buttonRef}
                onClick={() => setIsOpen(!isOpen)}
                className={`${buttonClassName} px-4 py-2 rounded-lg flex items-center text-sm hover:scale-105 transition-transform`}
                style={style}
            >
                {icon}
                {label}
                <svg
                    className={`w-4 h-4 ml-2 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {isOpen && createPortal(
                <div
                    ref={dropdownRef}
                    className="w-56 bg-dark-surface rounded-lg shadow-2xl border border-dark-border overflow-hidden"
                    style={{
                        position: 'fixed',
                        top: `${position.top}px`,
                        left: `${position.left}px`,
                        zIndex: 99999
                    }}
                >
                    <div onClick={() => setIsOpen(false)}>
                        {children}
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}

interface DropdownItemProps {
    onClick: () => void;
    icon?: React.ReactNode;
    label: string;
    badge?: string;
}

export function DropdownItem({ onClick, icon, label, badge }: DropdownItemProps) {
    const handleClick = () => {
        onClick();
    };

    return (
        <button
            onClick={handleClick}
            className="w-full px-4 py-3 flex items-center gap-3 hover:bg-dark-elevated transition-colors text-left text-sm text-gray-100"
        >
            {icon && <div className="text-primary">{icon}</div>}
            <span className="flex-1 text-gray-100">{label}</span>
            {badge && (
                <span className="px-2 py-1 bg-primary/20 text-primary text-xs rounded-full">
                    {badge}
                </span>
            )}
        </button>
    );
}

export function DropdownDivider() {
    return <div className="h-px bg-dark-border my-1" />;
}
