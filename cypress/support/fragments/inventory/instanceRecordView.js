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
  MultiColumnListHeader,
} from '../../../../interactors';
import InstanceRecordEdit from './instanceRecordEdit';

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
const classificationAccordion = Accordion('Classification');
const listClassifications = MultiColumnList({ id: 'list-classifications' });

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
const getMultiColumnListCellsValues = (cell) => {
  const cells = [];

  // get MultiColumnList rows and loop over
  return cy
    .get('[id^="list-items-"]')
    .find('[data-row-index]')
    .each(($row) => {
      // from each row, choose specific cell
      cy.get(`[class*="mclCell-"]:nth-child(${cell})`, { withinSubject: $row })
        // extract its text content
        .invoke('text')
        .then((cellValue) => {
          cells.push(cellValue);
        });
    })
    .then(() => cells);
};

export default {
  waitLoading,
  getMultiColumnListCellsValues,
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
  verifyCalloutMessage: (message) => {
    cy.expect(
      Callout({
        textContent: including(message),
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
  verifyPrecedingTitle: (title) => {
    cy.expect(
      Accordion('Title data')
        .find(MultiColumnList({ id: 'precedingTitles' }))
        .find(MultiColumnListCell({ content: title }))
        .exists(),
    );
  },
  verifySucceedingTitle: (title) => {
    cy.expect(
      Accordion('Title data')
        .find(MultiColumnList({ id: 'succeedingTitles' }))
        .find(MultiColumnListCell({ content: title }))
        .exists(),
    );
  },

  clickNextPaginationButton() {
    cy.do(Pane({ id: 'pane-instancedetails' }).find(Button('Next')).click());
  },

  openHoldingView: () => {
    cy.do(Button('View holdings').click());
    cy.expect(Button('Actions').exists());
  },

  getAssignedHRID: () => cy.then(() => KeyValue('Instance HRID').value()),

  validateStringsAscendingOrder(prev) {
    const itemsClone = [...prev];

    itemsClone.sort((a, b) => {
      // when sorting move falsy values to the end and localeCompare truthy values
      if (!a) return 1;
      if (!b) return -1;
      return a.localeCompare(b);
    });

    expect(prev).to.deep.equal(itemsClone);
  },

  validateStringsDescendingOrder(prev) {
    const itemsClone = [...prev];
    // when sorting move falsy values to the beginning and localeCompare truthy values
    itemsClone.sort((a, b) => {
      if (!a) return -1;
      if (!b) return 1;
      return b.localeCompare(a);
    });
    expect(prev).to.deep.equal(itemsClone);
  },

  sortingColumns: [
    {
      title: 'Item: barcode',
      id: including('clickable-list-column-barcode'),
      columnIndex: 1,
    },
    {
      title: 'Status',
      id: 'status',
      columnIndex: 2,
    },
    {
      title: 'Copy number',
      id: 'copynumber',
      columnIndex: 3,
    },
    {
      title: 'Enumeration',
      id: 'enumeration',
      columnIndex: 6,
    },
    {
      title: 'Chronology',
      id: 'chronology',
      columnIndex: 7,
    },
    {
      title: 'Volume',
      id: 'chronology',
      columnIndex: 8,
    },
    {
      title: 'Year, caption',
      id: 'yearcaption',
      columnIndex: 9,
    },
  ],

  getSortOrder(title) {
    let order;
    return cy
      .do(
        MultiColumnListHeader({ content: title }).perform((el) => {
          order = el.attributes.getNamedItem('aria-sort').value;
        }),
      )
      .then(() => order);
  },

  verifySortingOrder({ title, columnIndex }) {
    cy.wait(3000);
    if (title === 'Enumeration') {
      cy.get('[id^="list-items-"] div.mclScrollable---JvHuN').scrollTo('right');
    }

    this.getSortOrder(title).then((order) => {
      this.getMultiColumnListCellsValues(columnIndex).then((cells) => {
        if (order === 'ascending') {
          this.validateStringsAscendingOrder(cells);
        } else if (order === 'descending') {
          this.validateStringsDescendingOrder(cells);
        }
      });
    });
  },

  verifyEdition(value) {
    cy.expect(KeyValue('Edition').has({ value }));
  },

  verifyClassification(classType, classification) {
    cy.expect(
      classificationAccordion
        .find(listClassifications)
        .find(MultiColumnListCell({ columnIndex: 0, content: classType }))
        .exists(),
    );
    cy.expect(
      classificationAccordion
        .find(listClassifications)
        .find(MultiColumnListCell({ columnIndex: 1, content: classification }))
        .exists(),
    );
  },

  scroll: () => {
    cy.get('[id^="list-items-"] div.mclScrollable---JvHuN').scrollTo('right');
  },

  edit: () => {
    cy.do(instanceDetailsSection.find(actionsButton).click());
    cy.do(Button('Edit instance').click());
    InstanceRecordEdit.waitLoading();
  },
};
