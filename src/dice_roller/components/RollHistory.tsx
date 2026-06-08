import { memo, useRef, useEffect, useState } from 'react';
import { Star, RotateCw, Trash2 } from 'lucide-react';
import { useDiceRollerStore } from '../store/diceRollerStore';
import type { HistoryTabType } from '../utils/types-ext';

const TABS: { id: HistoryTabType; label: string }[] = [
    { id: 'chat', label: 'History' },
    { id: 'favorites', label: 'Favorites' },
    { id: 'recent', label: 'Recent' },
];

interface ListItem {
    key: string;
    notation: string;
    total?: number;
    isStarred?: boolean;
    onToggleStar?: () => void;
    onBodyClick?: () => void;
    isExpanded?: boolean;
    details?: string;
    formatted?: string;
}

function RollHistory() {
    const history = useDiceRollerStore((s) => s.history);
    const favorites = useDiceRollerStore((s) => s.favorites);
    const recentNotations = useDiceRollerStore((s) => s.recentNotations);
    const setNotationInput = useDiceRollerStore((s) => s.setNotationInput);
    const toggleFavorite = useDiceRollerStore((s) => s.toggleFavorite);
    const roll = useDiceRollerStore((s) => s.roll);
    const clearHistory = useDiceRollerStore((s) => s.clearHistory);
    const clearFavorites = useDiceRollerStore((s) => s.clearFavorites);
    const clearRecentNotations = useDiceRollerStore((s) => s.clearRecentNotations);

    const [activeTab, setActiveTab] = useState<HistoryTabType>('chat');
    const [expandedIds, setExpandedIds] = useState<string[]>([]);

    const contentRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (contentRef.current && activeTab === 'chat') {
            contentRef.current.scrollTop = contentRef.current.scrollHeight;
        }
    }, [history, activeTab]);

    const toggleExpand = (id: string) => {
        setExpandedIds((prev) =>
            prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
        );
    };

    const isFav = (notation: string) => favorites.some((f) => f.notation === notation);

    const renderItemRow = (item: ListItem) => (
        <div
            key={item.key}
            className={`px-3 py-2 rounded ${item.isExpanded ? 'bg-primary/25' : 'bg-bgBase/40'}`}
        >
            <div className="flex items-center gap-1.5 min-w-0">
                {item.onToggleStar ? (
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            item.onToggleStar!();
                        }}
                        className="flex-shrink-0 w-5 h-5 flex items-center justify-center cursor-pointer
                            hover:scale-110 transition-transform"
                        title={item.isStarred ? 'Remove from favorites' : 'Add to favorites'}
                    >
                        <Star
                            size={14}
                            fill={item.isStarred ? 'currentColor' : 'none'}
                            className={item.isStarred ? 'text-yellow-500' : 'opacity-40'}
                        />
                    </button>
                ) : null}
                <button
                    type="button"
                    onClick={item.onBodyClick}
                    className="flex-1 flex items-baseline gap-1.5 min-w-0 text-left
                        cursor-pointer bg-transparent border-none p-0"
                >
                    <span className="font-bold text-sm text-textSecondary truncate">
                        {item.notation}
                    </span>
                    {item.total != null && (
                        <span className="font-bold text-base text-textPrimary flex-shrink-0">
                            = {item.total}
                        </span>
                    )}
                </button>
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        setNotationInput(item.notation);
                    }}
                    onContextMenu={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        roll(item.notation);
                    }}
                    className="flex-shrink-0 w-6 h-6 flex items-center justify-center
                        border border-transparent rounded cursor-pointer
                        opacity-60 hover:opacity-100 hover:bg-bgBase/50 transition-all"
                    title="Set notation | Right-click to roll"
                >
                    <RotateCw size={12} />
                </button>
            </div>
            {item.isExpanded && item.details != null && (
                <div className="mt-2 pt-2 border-t border-border text-xs opacity-90 leading-relaxed">
                    Rolls: {item.details}
                    <br />
                    Formatted: {item.formatted}
                </div>
            )}
        </div>
    );

    const renderTabContent = () => {
        if (!activeTab) {
            return <div className="flex-1 overflow-y-auto min-h-0" />;
        }

        const isEmpty =
            (activeTab === 'chat' && history.length === 0) ||
            (activeTab === 'favorites' && favorites.length === 0) ||
            (activeTab === 'recent' && recentNotations.length === 0);
        if (isEmpty) {
            const emptyMsg =
                activeTab === 'chat'
                    ? 'No rolls yet'
                    : activeTab === 'favorites'
                      ? 'No favorites saved'
                      : 'No recent notations';
            return (
                <div className="flex-1 overflow-y-auto min-h-0" ref={contentRef}>
                    <div className="py-5 text-center italic opacity-70 text-textPrimary">
                        {emptyMsg}
                    </div>
                </div>
            );
        }

        const items: ListItem[] =
            activeTab === 'chat'
                ? history.map((entry) => ({
                      key: entry.id,
                      notation: entry.result.notation,
                      total: entry.result.total,
                      isStarred: isFav(entry.result.notation),
                      onToggleStar: () => toggleFavorite(entry.result.notation),
                      onBodyClick: () => toggleExpand(entry.id),
                      isExpanded: expandedIds.includes(entry.id),
                      details: entry.result.details,
                      formatted: entry.result.formatted,
                  }))
                : activeTab === 'favorites'
                  ? favorites.map((fav) => ({
                        key: fav.id,
                        notation: fav.notation,
                        isStarred: true,
                        onToggleStar: () => toggleFavorite(fav.notation),
                    }))
                  : recentNotations.map((notation, idx) => ({
                        key: `${notation}-${idx}`,
                        notation,
                    }));

        return (
            <div className="flex-1 overflow-y-auto min-h-0" ref={contentRef}>
                <div className="flex flex-col-reverse gap-1.5">{items.map(renderItemRow)}</div>
            </div>
        );
    };

    return (
        <div className="flex flex-col gap-3 flex-1 overflow-hidden">
            <div className="flex items-center justify-between gap-2">
                <div className="flex gap-0.5 flex-1">
                    {TABS.map((tab) => (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => {
                                setActiveTab(activeTab !== tab.id ? tab.id : '');
                            }}
                            className={`flex-1 py-0.5 px-2 text-xs font-semibold tracking-wide
                                border-b-2 transition-opacity cursor-pointer bg-transparent
                                ${
                                    activeTab === tab.id
                                        ? 'opacity-100 border-b-primary'
                                        : 'opacity-60 border-b-transparent hover:opacity-85'
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
                <button
                    type="button"
                    onClick={() => {
                        if (activeTab === 'chat') clearHistory();
                        else if (activeTab === 'favorites') clearFavorites();
                        else if (activeTab === 'recent') clearRecentNotations();
                    }}
                    disabled={
                        !activeTab ||
                        (activeTab === 'chat' && history.length === 0) ||
                        (activeTab === 'favorites' && favorites.length === 0) ||
                        (activeTab === 'recent' && recentNotations.length === 0)
                    }
                    className="flex items-center gap-1 py-0.5 px-3 text-xs font-semibold
                        border border-border rounded cursor-pointer
                        bg-bgSurface text-textPrimary
                        hover:bg-bgBase/50 transition-colors
                        disabled:opacity-40 disabled:cursor-not-allowed"
                    title={
                        activeTab === 'chat'
                            ? 'Clear history'
                            : activeTab === 'favorites'
                              ? 'Clear favorites'
                              : activeTab === 'recent'
                                ? 'Clear recent'
                                : 'Clear'
                    }
                >
                    <Trash2 size={12} />
                    Clear
                </button>
            </div>
            {renderTabContent()}
        </div>
    );
}

export default memo(RollHistory);
