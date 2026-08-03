import { useState } from "react";
import type { AppData } from "../../types";
import { BRAIN_TABS, brainTabItems, type BrainTab } from "../../lib/brain";

export function BrainView({ data }: { data: AppData }) {
  const [activeTab, setActiveTab] = useState<BrainTab>("All");
  const items = brainTabItems(data, activeTab);

  return (
    <section className="panel span-3">
      <div className="tabs" role="tablist">
        {BRAIN_TABS.map((tab) => (
          <button
            className={activeTab === tab ? "active" : ""}
            key={tab}
            onClick={() => setActiveTab(tab)}
            type="button"
          >
            {tab}
          </button>
        ))}
      </div>
      <div className="review-list">
        {items.map((item) => (
          <article key={item.id}>
            <strong>{item.title}</strong>
            <span>{item.body}</span>
            {item.url && (
              <a href={item.url} target="_blank" rel="noreferrer">
                {item.url}
              </a>
            )}
          </article>
        ))}
        {!items.length && <p className="empty-note">Nothing here yet.</p>}
      </div>
    </section>
  );
}
