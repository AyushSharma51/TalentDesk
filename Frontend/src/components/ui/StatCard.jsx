function StatCard({ label, value, note, color }) {
  return (
    <article className="stat-card">
      <div className="stat-top">
        <span>{label}</span>
        <span className={`stat-dot ${color}`} />
      </div>

      <h2>{value}</h2>
      <p>{note}</p>
    </article>
  );
}

export default StatCard;
