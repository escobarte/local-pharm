import type { SearchResult } from "@/lib/medications/search";
import { DesktopSelectLink } from "./DesktopSelectLink";
import { MedicationCardBody, medicationCardClass } from "./MedicationCardBody";

type Props = SearchResult & {
  /** Desktop: the card selects the medication in the side panel of the results. */
  selectHref: string;
  selected: boolean;
};

/**
 * One search result. Mobile: opens the medication page. Desktop (lg): selects it
 * in the panel.
 */
export function MedicationCard({ med, summary, selectHref, selected }: Props) {
  return (
    <li>
      <DesktopSelectLink
        href={`/medications/${med.id}`}
        desktopHref={selectHref}
        selected={selected}
        className={medicationCardClass}
      >
        <MedicationCardBody med={med} summary={summary} />
      </DesktopSelectLink>
    </li>
  );
}
