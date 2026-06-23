import { ReactNode, useState } from "react";
import { ChevronRight, Home } from "lucide-react";
import type { AppData, Task } from "../../types";

export function PanelHeader({
  title,
  icon: Icon,
  action,
  onAction,
}: {
  title: string;
  icon: typeof Home;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <header className="panel-header">
      <div>
        <Icon size={17} />
        <h2>{title}</h2>
      </div>
      {action && (
        <button onClick={onAction} type="button">
          {action}
          <ChevronRight size={15} />
        </button>
      )}
    </header>
  );
}

export function Metric({
  label,
  value,
  tone,
}: {
  label: string;
  value: string | number;
  tone: "purple" | "blue" | "green" | "red";
}) {
  return (
    <div className={`metric ${tone}`}>
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

export function Progress({ percent }: { percent: number }) {
  return (
    <div className="progress" aria-label={`${percent}% complete`}>
      <i style={{ width: `${percent}%` }} />
    </div>
  );
}

export function Priority({ priority }: { priority: Task["priority"] }) {
  return <span className={`priority ${priority}`}>{priority}</span>;
}

export function StatusPill({ active, label }: { active: boolean; label: string }) {
  return <span className={`status-pill ${active ? "active" : ""}`}>{label}</span>;
}

export function ListItems({
  items,
  empty = "Nothing here yet.",
}: {
  items: string[];
  empty?: string;
}) {
  return (
    <ul className="list-items">
      {items.length ? items.map((item) => <li key={item}>{item}</li>) : <li>{empty}</li>}
    </ul>
  );
}

export function TabbedList<T>({
  tabs,
  items,
  getTab,
  render,
}: {
  tabs: string[];
  items: T[];
  getTab: (item: T) => string;
  render: (item: T) => ReactNode;
}) {
  const [activeTab, setActiveTab] = useState(tabs[0]);
  const visible = activeTab === "all" ? items : items.filter((item) => getTab(item) === activeTab);

  return (
    <section className="panel span-3">
      <div className="tabs" role="tablist">
        {tabs.map((tab) => (
          <button className={activeTab === tab ? "active" : ""} key={tab} onClick={() => setActiveTab(tab)} type="button">
            {tab.replace("-", " ")}
          </button>
        ))}
      </div>
      <div className="review-list">
        {visible.map((item, index) => (
          <article key={index}>{render(item)}</article>
        ))}
      </div>
    </section>
  );
}

export function Timeline({ data }: { data: AppData }) {
  return (
    <div className="timeline">
      {data.tasks
        .filter((task) => task.dueDate)
        .slice(0, 5)
        .map((task) => (
          <div key={task.id}>
            <span>{task.dueDate}</span>
            <strong>{task.title}</strong>
          </div>
        ))}
    </div>
  );
}
