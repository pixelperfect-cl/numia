
import { Area, AreaChart, ResponsiveContainer } from 'recharts';

interface SparkAreaProps {
    data: number[];
    color?: string;
    height?: number;
}

export function SparkArea({ data, color = "#10b981", height = 40 }: SparkAreaProps) {
    // Transform array of numbers to object array for Recharts
    const chartData = data.map((val, i) => ({ i, val }));

    return (
        <div style={{ height }}>
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                    <defs>
                        <linearGradient id={`gradient-${color}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={color} stopOpacity={0.4} />
                            <stop offset="100%" stopColor={color} stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <Area
                        type="monotone"
                        dataKey="val"
                        stroke={color}
                        strokeWidth={2}
                        fill={`url(#gradient-${color})`}
                        isAnimationActive={true}
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
}
