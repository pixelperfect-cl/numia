import * as React from 'react';

interface CustomScrollbarProps {
    scrollContainerRef: React.RefObject<HTMLDivElement>;
    deps?: any[];
}

export function CustomScrollbar({ scrollContainerRef, deps = [] }: CustomScrollbarProps) {
    const trackRef = React.useRef<HTMLDivElement>(null);
    const thumbRef = React.useRef<HTMLDivElement>(null);
    const [thumbWidth, setThumbWidth] = React.useState(0);
    const [thumbLeft, setThumbLeft] = React.useState(0);
    const [dragging, setDragging] = React.useState(false);
    const dragStartX = React.useRef(0);
    const dragStartLeft = React.useRef(0);

    const updateThumb = React.useCallback(() => {
        const el = scrollContainerRef.current;
        if (!el) return;
        const viewRatio = el.clientWidth / el.scrollWidth;
        const newThumbWidth = Math.max(viewRatio * 100, 10);
        const maxScroll = el.scrollWidth - el.clientWidth;
        const scrollRatio = maxScroll > 0 ? el.scrollLeft / maxScroll : 0;
        const newThumbLeft = scrollRatio * (100 - newThumbWidth);
        setThumbWidth(newThumbWidth);
        setThumbLeft(newThumbLeft);
    }, [scrollContainerRef]);

    React.useEffect(() => {
        const el = scrollContainerRef.current;
        if (!el) return;
        updateThumb();
        el.addEventListener('scroll', updateThumb);
        const resizeObs = new ResizeObserver(updateThumb);
        resizeObs.observe(el);
        // Also observe children mutations for dynamic content
        const mutObs = new MutationObserver(updateThumb);
        mutObs.observe(el, { childList: true, subtree: true });
        return () => {
            el.removeEventListener('scroll', updateThumb);
            resizeObs.disconnect();
            mutObs.disconnect();
        };
    }, [updateThumb, ...deps]);

    React.useEffect(() => {
        if (!dragging) return;
        const onMove = (e: MouseEvent) => {
            const track = trackRef.current;
            const el = scrollContainerRef.current;
            if (!track || !el) return;
            const dx = e.clientX - dragStartX.current;
            const trackWidth = track.clientWidth;
            const movePct = (dx / trackWidth) * 100;
            const maxLeft = 100 - thumbWidth;
            const newLeft = Math.max(0, Math.min(dragStartLeft.current + movePct, maxLeft));
            const scrollRatio = maxLeft > 0 ? newLeft / maxLeft : 0;
            el.scrollLeft = scrollRatio * (el.scrollWidth - el.clientWidth);
        };
        const onUp = () => setDragging(false);
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
        return () => {
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
        };
    }, [dragging, thumbWidth, scrollContainerRef]);

    const handleTrackClick = (e: React.MouseEvent) => {
        const track = trackRef.current;
        const el = scrollContainerRef.current;
        if (!track || !el || e.target === thumbRef.current) return;
        const rect = track.getBoundingClientRect();
        const clickPct = ((e.clientX - rect.left) / rect.width) * 100;
        const maxLeft = 100 - thumbWidth;
        const newLeft = Math.max(0, Math.min(clickPct - thumbWidth / 2, maxLeft));
        const scrollRatio = maxLeft > 0 ? newLeft / maxLeft : 0;
        el.scrollTo({ left: scrollRatio * (el.scrollWidth - el.clientWidth), behavior: 'smooth' });
    };

    if (thumbWidth >= 100) return null;

    return (
        <div
            ref={trackRef}
            className="relative w-full h-1.5 rounded-full bg-muted/30 border border-border/20 mb-3 cursor-pointer group transition-all hover:h-2.5 hover:bg-muted/50"
            onClick={handleTrackClick}
        >
            <div
                ref={thumbRef}
                className="absolute top-0 h-full rounded-full bg-blue-500/30 hover:bg-blue-500/60 active:bg-blue-500/80 transition-colors cursor-grab active:cursor-grabbing shadow-[0_0_6px_rgba(59,130,246,0.15)]"
                style={{ width: `${thumbWidth}%`, left: `${thumbLeft}%` }}
                onMouseDown={(e) => {
                    e.stopPropagation();
                    setDragging(true);
                    dragStartX.current = e.clientX;
                    dragStartLeft.current = thumbLeft;
                }}
            />
        </div>
    );
}
