import Link from "next/link";
import { Logo } from "./SiteNav";

export default function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-[#0c1f17]/5 bg-white">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 md:grid-cols-[1.2fr_1fr_1fr] md:px-8">
        <div>
          <Logo />
          <p className="mt-4 max-w-sm text-sm leading-6 text-[#5b6b62]">
            La plateforme française qui réunit covoiturage du quotidien et
            recharge électrique partagée, pour les particuliers comme pour les
            entreprises.
          </p>
        </div>

        <nav aria-label="Services" className="text-sm">
          <p className="font-display font-bold text-[#0c1f17]">Services</p>
          <ul className="mt-4 space-y-3 text-[#5b6b62]">
            <li><Link href="/covoiturage" className="hover:text-[#008f51]">Covoiturage</Link></li>
            <li><Link href="/bornes" className="hover:text-[#008f51]">Bornes de recharge</Link></li>
            <li><Link href="/entreprises" className="hover:text-[#008f51]">Offre entreprises</Link></li>
          </ul>
        </nav>

        <nav aria-label="Compte" className="text-sm">
          <p className="font-display font-bold text-[#0c1f17]">Mon compte</p>
          <ul className="mt-4 space-y-3 text-[#5b6b62]">
            <li><Link href="/connexion" className="hover:text-[#008f51]">Connexion</Link></li>
            <li><Link href="/dashboard" className="hover:text-[#008f51]">Mon espace</Link></li>
            <li><Link href="/profil" className="hover:text-[#008f51]">Mon profil</Link></li>
          </ul>
        </nav>
      </div>

      <div className="border-t border-[#0c1f17]/5">
        <p className="mx-auto max-w-7xl px-4 py-5 text-xs leading-5 text-[#5b6b62] md:px-8">
          © {new Date().getFullYear()} TAPGOO. Le covoiturage proposé sur la
          plateforme relève du partage de frais entre particuliers (art.
          L.&nbsp;3132-1 du Code des transports) : la participation demandée aux
          passagers ne peut excéder les frais réels du trajet.
        </p>
      </div>
    </footer>
  );
}
