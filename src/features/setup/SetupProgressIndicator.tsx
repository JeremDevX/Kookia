const labels = ["Restaurant", "Équipe", "Fournisseurs", "Finalisation"];
export default function SetupProgressIndicator({ index }: { index: number }) {
  return <ol className="setup-progress" aria-label="Progression de la configuration">{labels.map((label, position) => <li key={label} aria-current={position === index ? "step" : undefined} data-completed={position < index || undefined} aria-label={position < index ? `${label} terminé` : undefined}>
    <span aria-hidden="true">{position < index ? "✓" : position + 1}</span> {label}
  </li>)}</ol>;
}
