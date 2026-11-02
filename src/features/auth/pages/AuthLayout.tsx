import type { ReactNode } from "react";
import suggestionsIcon from "../../../assets/figma-auth/suggestions.svg";
import stocksIcon from "../../../assets/figma-auth/stocks.svg";
import receptionsIcon from "../../../assets/figma-auth/receptions.svg";

const benefits = [
  { icon: suggestionsIcon, title: "Des suggestions à examiner", detail: "Vous gardez la main sur chaque décision." },
  { icon: stocksIcon, title: "Vos stocks en un coup d’œil", detail: "Repérez les produits à surveiller avant le service." },
  { icon: receptionsIcon, title: "Réceptions et commandes", detail: "Retrouvez vos livraisons et contrôlez les quantités reçues." },
];

export default function AuthLayout({ children }: { children: ReactNode }) {
  return <main className="auth-page">
    <aside className="auth-presentation" aria-label="Présentation de KookIA">
      <div className="auth-logo"><span aria-hidden="true">K</span><strong>KookIA</strong></div>
      <div className="auth-presentation-content">
        <h2>L’intelligence d’achat au service de votre restaurant.</h2>
        <p>Préparez vos achats et réduisez le gaspillage, sans perdre la main sur vos décisions.</p>
        <ul>{benefits.map(({ icon, title, detail }) => <li key={title}>
          <span className="auth-benefit-icon"><img src={icon} alt="" /></span>
          <span><strong>{title}</strong><small>{detail}</small></span>
        </li>)}</ul>
      </div>
      <p className="auth-copyright">© 2026 KookIA</p>
    </aside>
    <div className="auth-content">{children}</div>
  </main>;
}
