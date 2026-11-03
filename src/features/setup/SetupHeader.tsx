import { CircleHelp } from "lucide-react";

export default function SetupHeader({ step }: { step: number }) {
  return <header className="setup-header">
    <div className="auth-logo setup-logo"><span aria-hidden="true">K</span><strong>KookIA</strong></div>
    <div className="setup-header-actions"><span>Étape {step} sur 4</span>
      <a href="mailto:support@kookia.app?subject=Support%20KookiA"><CircleHelp size={16} aria-hidden="true" />Besoin d’aide ?</a>
    </div>
  </header>;
}
