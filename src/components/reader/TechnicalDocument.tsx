import type {
  DocumentSection as DocumentSectionContract,
  ReaderTextInteractionCallback,
} from "@/lib/contracts/document";
import { DocumentSection } from "@/components/reader/DocumentSection";

type TechnicalDocumentProps = {
  sections: DocumentSectionContract[];
  activeSectionId: string;
  onTextInteraction?: ReaderTextInteractionCallback;
};

export function TechnicalDocument({
  sections,
  activeSectionId,
  onTextInteraction,
}: TechnicalDocumentProps) {
  return (
    <article id="region-technical-document" className="technical-document">
      {sections.map((section, index) => (
        <DocumentSection
          key={section.id}
          section={section}
          sectionNumber={index + 1}
          active={section.id === activeSectionId}
          onTextInteraction={onTextInteraction}
        />
      ))}
    </article>
  );
}
