import { HTML, including } from '@interactors/html';
import {
  KeyValue,
  MultiColumnList,
  Section,
  MultiColumnListCell,
  Button,
  Accordion,
  Link,
  Pane,
  Callout,
  Badge,
} from '../../../../interactors';

const instanceDetailsSection = Section({ id: 'pane-instancedetails' });
const instanceDetailsNotesSection = Section({ id: 'instance-details-notes' });
const marcViewSection = Section({ id: 'marc-view-pane' });
const catalogedDateKeyValue = KeyValue('Cataloged date');
const sourceKeyValue = KeyValue('Source');
const instanceStatusTermKeyValue = KeyValue('Instance status term');
const instanceHridKeyValue = KeyValue('Instance HRID');
const actionsButton = Button('Actions');
const viewSourceButton = Button('View source');
const instanceAdministrativeNote = MultiColumnList({ id: 'administrative-note-list' });
const instanceNote = MultiColumnList({ id: 'list-instance-notes-0' });
const electronicAccessAccordion = Accordion('Electronic access');
const instanceDetailsPane = Pane({ id: 'pane-instancedetails' });

const verifyResourceTitle = (value) => {
  cy.expect(KeyValue('Resource title').has({ value }));
};

const verifyInstanceSource = (sourceValue) => cy.expect(sourceKeyValue.has({ value: sourceValue }));

const verifyInstanceStatusCode = (value) => {
  cy.expect(KeyValue('Instance status code').has({ value }));
};

const verifyResourceType = (value) => {
  cy.expect(KeyValue('Resource type term').has({ value }));
};

const verifyCatalogedDate = (value) => {
  cy.expect(catalogedDateKeyValue.has({ value }));
};

const verifyInstanceStatusTerm = (value) => {
  cy.expect(instanceStatusTermKeyValue.has({ value }));
};

const verifyMarkAsSuppressed = () => {
  cy.expect(
    instanceDetailsSection
      .find(HTML(including('Warning: Instance is marked staff suppressed')))
      .exists(),
  );
};

const verifyMarkAsSuppressedFromDiscovery = () => {
  cy.expect(
    instanceDetailsSection
      .find(HTML(including('Warning: Instance is marked suppressed from discovery')))
      .exists(),
  );
};

const verifyMarkAsSuppressedFromDiscoveryAndSuppressed = () => {
  cy.expect(
    instanceDetailsSection
      .find(
        HTML(
          including('Warning: Instance is marked suppressed from discovery and staff suppressed'),
        ),
      )
      .exists(),
  );
};

const verifyGeneralNoteContent = (content) => {
  cy.expect(instanceDetailsNotesSection.find(HTML(including(content))).exists());
};

const verifySrsMarcRecord = () => {
  cy.expect(marcViewSection.exists());
};

const verifyImportedFieldExists = (field) => {
  cy.expect(marcViewSection.find(HTML(including(field))).exists());
};

const viewSource = () => {
  cy.do(instanceDetailsSection.find(actionsButton).click());
  cy.wait(2000);
  cy.do(viewSourceButton.click());
};

const verifyAdministrativeNote = (value) => {
  cy.expect(instanceAdministrativeNote.find(MultiColumnListCell({ content: value })).exists());
};

const verifyInstanceNote = (value) => {
  cy.expect(instanceNote.find(MultiColumnListCell({ content: value })).exists());
};

const verifyStatisticalCode = (value) => {
  cy.expect(
    MultiColumnList({ id: 'list-statistical-codes' })
      .find(MultiColumnListCell({ content: value }))
      .exists(),
  );
};

const verifyNatureOfContent = (value) => {
  cy.expect(KeyValue('Nature of content').has({ value }));
};

const verifyInstanceRecordViewOpened = () => {
  cy.expect(instanceDetailsPane.exists());
};

const verifyElectronicAccess = (uriValue, linkText = 'No value set-', rowNumber = 0) => {
  cy.expect(
    electronicAccessAccordion
      .find(MultiColumnListCell({ row: rowNumber, columnIndex: 1, content: uriValue }))
      .exists(),
  );
  cy.expect(
    electronicAccessAccordion
      .find(MultiColumnListCell({ row: rowNumber, columnIndex: 2, content: linkText }))
      .exists(),
  );
};

const verifyElectronicAccessAbsent = (rowNumber = 0) => {
  cy.expect(
    electronicAccessAccordion
      .find(MultiColumnListCell({ row: rowNumber, columnIndex: 1 }))
      .absent(),
  );
};

const waitLoading = () => cy.expect(actionsButton.exists());

export default {
  waitLoading,
  verifyResourceTitle,
  verifyInstanceStatusCode,
  verifyResourceType,
  verifyCatalogedDate,
  verifyInstanceStatusTerm,
  verifyMarkAsSuppressed,
  verifyMarkAsSuppressedFromDiscovery,
  verifyMarkAsSuppressedFromDiscoveryAndSuppressed,
  verifyGeneralNoteContent,
  verifySrsMarcRecord,
  verifyImportedFieldExists,
  viewSource,
  verifyAdministrativeNote,
  verifyInstanceNote,
  verifyStatisticalCode,
  verifyNatureOfContent,
  verifyInstanceSource,
  verifyInstanceRecordViewOpened,
  verifyElectronicAccess,
  verifyElectronicAccessAbsent,
  verifyHotlinkToPOL: (number) => {
    cy.expect(
      Accordion('Acquisition')
        .find(MultiColumnListCell({ row: 0, content: number }))
        .exists(),
    );
    cy.expect(
      Accordion('Acquisition')
        .find(Link({ href: including('/orders/lines/view') }))
        .exists(),
    );
  },
  verifyIsHoldingsCreated: (...holdingToBeOpened) => {
    cy.expect(Accordion({ label: including(`Holdings: ${holdingToBeOpened}`) }).exists());
  },
  verifyIsInstanceOpened: (title) => {
    cy.expect(instanceDetailsPane.exists());
    cy.expect(Pane({ titleLabel: including(title) }).exists());
  },
  verifyInstancePaneExists: () => {
    cy.wait(1500);
    cy.expect(instanceDetailsPane.exists());
  },
  verifyCalloutMessage: (number) => {
    cy.expect(
      Callout({
        textContent: including(
          `Record ${number} created. Results may take a few moments to become visible in Inventory`,
        ),
      }).exists(),
    );
  },

  verifyItemsCount(itemsCount, ...holdingToBeOpened) {
    cy.wait(1000);
    cy.expect(
      Accordion({ label: including(`Holdings: ${holdingToBeOpened}`) })
        .find(Badge())
        .has({ value: itemsCount.toString() }),
    );
  },

  verifyQuantityOfItemsRelatedtoHoldings(holdingToBeOpened, quantityOfItems) {
    cy.do(
      Accordion({ label: including(`Holdings: ${holdingToBeOpened}`) }).perform((el) => {
        const items = el.querySelectorAll('div[class^="mclRow-"]').length;
        expect(quantityOfItems).to.eq(items);
      }),
    );
  },

  verifyInstanceHridValue: (hrid) => cy.expect(instanceHridKeyValue.has({ value: hrid })),

  clickNextPaginationButton() {
    cy.do(Pane({ id: 'pane-instancedetails' }).find(Button('Next')).click());
  },

  openHoldingView: () => {
    cy.do(Button('View holdings').click());
    cy.expect(Button('Actions').exists());
  },

  getAssignedHRID: () => cy.then(() => instanceHridKeyValue.value()),
};
