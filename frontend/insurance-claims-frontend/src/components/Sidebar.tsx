type Page = "dashboard" | "policies" | "claims";

type SidebarProps = {
  activePage: Page;
  onNavigate: (page: Page) => void;
};

function Sidebar({ activePage, onNavigate }: SidebarProps) {
  return (
    <aside className="sidebar">
      <h2 className="sidebar-title">Insurance MS</h2>

      <nav className="sidebar-nav">
        <button
          className={activePage === "dashboard" ? "active" : ""}
          onClick={() => onNavigate("dashboard")}
        >
          Dashboard
        </button>

        <button
          className={activePage === "policies" ? "active" : ""}
          onClick={() => onNavigate("policies")}
        >
          Policies
        </button>

        <button
          className={activePage === "claims" ? "active" : ""}
          onClick={() => onNavigate("claims")}
        >
          Claims
        </button>
      </nav>
    </aside>
  );
}

export default Sidebar;
