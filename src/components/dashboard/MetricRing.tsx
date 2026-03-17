
import { cn } from '@/lib/utils';

interface MetricRingProps {
    percentage: number; // 0 to 100
    color?: string; // Hex or Tailwind class logic if we adapt
    size?: number;
    strokeWidth?: number;
    children?: React.ReactNode;
    className?: string;
}

export function MetricRing({
    percentage,
    color = "#10b981",
    size = 120,
    strokeWidth = 8,
    children,
    className
}: MetricRingProps) {
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (percentage / 100) * circumference;

    return (
        <div className={cn("relative flex items-center justify-center", className)} style={{ width: size, height: size }}>
            {/* Background Ring */}
            <svg width={size} height={size} className="transform -rotate-90">
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="transparent"
                    stroke="currentColor"
                    strokeWidth={strokeWidth}
                    className="text-muted/20"
                />
                {/* Progress Ring */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="transparent"
                    stroke={color} // Logic to use 'stroke-current' if color is class, but hex is safer for dynamic data
                    strokeWidth={strokeWidth}
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    className="transition-all duration-1000 ease-out"
                />
            </svg>
            {/* Inner Content */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                {children}
            </div>
        </div>
    );
}
