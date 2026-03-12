"use client";

import { useState, useEffect } from "react";
import { Star } from "lucide-react";
import clsx from "clsx";

interface Props {
  entityType:  string;
  entityId:    string;
  initialFav:  boolean;
  onToggle?:   (id: string, isFav: boolean) => void;
}

export default function FavouriteButton({ entityType, entityId, initialFav, onToggle }: Props) {
  const [fav,     setFav]     = useState(initialFav);
  const [loading, setLoading] = useState(false);

  // Sync wanneer parent async favorieten ophaalt en de prop bijwerkt
  useEffect(() => { setFav(initialFav); }, [initialFav]);

  async function toggle(e: React.MouseEvent) {
    e.stopPropagation();
    if (loading) return;
    setLoading(true);
    try {
      if (fav) {
        await fetch(
          `/api/favourites?entity_type=${encodeURIComponent(entityType)}&entity_id=${encodeURIComponent(entityId)}`,
          { method: "DELETE" }
        );
      } else {
        await fetch("/api/favourites", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ entity_type: entityType, entity_id: entityId }),
        });
      }
      const next = !fav;
      setFav(next);
      onToggle?.(entityId, next);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      title={fav ? "Verwijder uit favorieten" : "Voeg toe aan favorieten"}
      className={clsx(
        "p-1.5 rounded-lg transition-colors disabled:opacity-50",
        fav
          ? "text-amber-400 hover:text-amber-500"
          : "text-slate-300 hover:text-amber-400 opacity-0 group-hover:opacity-100"
      )}
    >
      <Star size={13} className={fav ? "fill-current" : ""} />
    </button>
  );
}
