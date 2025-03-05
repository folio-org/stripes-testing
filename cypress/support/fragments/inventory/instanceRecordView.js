import { HTML, including, not } from '@interactors/html';
import {
  Accordion,
  Badge,
  Button,
  Callout,
  KeyValue,
  Link,
  MultiColumnList,
  MultiColumnListCell,
  MultiColumnListHeader,
  MultiColumnListRow,
  Pane,
  Section,
  Tooltip,
  matching,
} from '../../../../interactors';
import InteractorsTools from '../../utils/interactorsTools';
import InstanceRecordEdit from './instanceRecordEdit';
import InstanceStates from './instanceStates';
import InventoryEditMarcRecord from './inventoryEditMarcRecord';
import InventoryNewHoldings from './inventoryNewHoldings';
import SelectInstanceModal from './modals/inventoryInstanceSelectInstanceModal';

const rootSection = Section({ id: 'pane-instancedetails' });
const instanceDetailsNotesSection = Section({ id: 'instance-details-notes' });
const marcViewSection = Pane({ id: 'marc-view-pane' });
const catalogedDateKeyValue = KeyValue('Cataloged date');
const sourceKeyValue = KeyValue('Source');
const instanceStatusTermKeyValue = KeyValue('Instance status term');
const instanceHridKeyValue = KeyValue('Instance HRID');
const actionsButton = Button('Actions');
const viewSourceButton = Button({ id: 'clickable-view-source' });
const searchButton = Button({ ariaLabel: 'search' });
const instanceAdministrativeNote = MultiColumnList({ id: 'administrative-note-list' });
const instanceNote = MultiColumnList({ id: 'list-instance-notes-0' });
const listClassifications = MultiColumnList({ id: 'list-classifications' });
const electronicAccessAccordion = Accordion('Electronic access');
const classificationAccordion = Accordion('Classification');
const subjectAccordion = Accordion('Subject');
const descriptiveDataAccordion = Accordion('Descriptive data');
const adminDataAccordion = Accordion('Administrative data');
const titleDataAccordion = Accordion('Title data');
const publisherList = descriptiveDataAccordion.find(MultiColumnList({ id: 'list-publication' }));
const precedingTitles = titleDataAccordion.find(MultiColumnList({ id: 'precedingTitles' }));
const succeedingTitles = titleDataAccordion.find(MultiColumnList({ id: 'succeedingTitles' }));
const dateTypeKeyValue = descriptiveDataAccordion.find(KeyValue('Date type'));
const date1KeyValue = descriptiveDataAccordion.find(KeyValue('Date 1'));
const date2KeyValue = descriptiveDataAccordion.find(KeyValue('Date 2'));
const addItemButton = Button('Add item');
const subjectList = subjectAccordion.find(MultiColumnList({ id: 'list-subject' }));

const verifyResourceTitle = (value) => {
  cy.expect(KeyValue('Resource title').has({ value }));
};
const verifyIndexTitle = (value) => {
  cy.expect(KeyValue('Index title').has({ value }));
};

const verifyInstanceSource = (sourceValue) => cy.expect(sourceKeyValue.has({ value: including(sourceValue) }));

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
    rootSection.find(HTML(including('Warning: Instance is marked staff suppressed'))).exists(),
  );
};

const verifyMarkAsSuppressedFromDiscovery = () => {
  cy.expect(
    rootSection
      .find(HTML(including('Warning: Instance is marked suppressed from discovery')))
      .exists(),
  );
};

const verifyMarkAsSuppressedFromDiscoveryAndSuppressed = () => {
  cy.expect(
    rootSection
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
  cy.wait(1000);
  cy.do(rootSection.find(actionsButton).click());
  cy.wait(1500);
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
  cy.expect(rootSection.exists());
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

const waitLoading = () => {
  cy.wait(1000);
  cy.get('#pane-instancedetails').within(() => {
    cy.contains('button', 'Action').should('exist');
  });
};
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
  verifyIndexTitle,
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
  verifyInstanceIsOpened: (title) => {
    cy.expect(rootSection.exists());
    cy.expect(Pane({ titleLabel: including(title) }).exists());
  },
  verifyInstancePaneExists: () => {
    cy.wait(1500);
    cy.expect(rootSection.exists());
  },
  verifyCalloutMessage: (message) => {
    cy.expect(
      Callout({
        textContent: including(message),
      }).exists(),
    );
  },
  verifySuccsessCalloutMessage: () => {
    InteractorsTools.checkCalloutMessage(
      matching(new RegExp(InstanceStates.instanceSavedSuccessfully)),
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
    cy.wait(1500);
    cy.get('#precedingTitles [class*="mclCell-"]:nth-child(1)').eq(0).should('include.text', title);
  },
  verifyPrecedingTitleSearchIcon: (title) => {
    cy.expect(
      precedingTitles
        .find(MultiColumnListCell({ content: including(title) }))
        .find(searchButton)
        .exists(),
    );
    cy.do(
      precedingTitles
        .find(MultiColumnListCell({ content: including(title) }))
        .find(searchButton)
        .hoverMouse(),
    );
    cy.expect(Tooltip().has({ text: `Search for ${title}` }));
  },
  verifyPrecedingTitleSearchIconAbsent() {
    cy.get('#precedingTitles [class*="mclCell-"]:nth-child(1)')
      .eq(0)
      .find('button[ariaLabel="search"]')
      .should('not.exist');
  },
  verifySucceedingTitleSearchIconAbsent() {
    cy.get('#succeedingTitles [class*="mclCell-"]:nth-child(1)')
      .eq(0)
      .find('button[ariaLabel="search"]')
      .should('not.exist');
  },
  verifySucceedingTitleSearchIcon: (title) => {
    cy.expect(
      succeedingTitles
        .find(MultiColumnListCell({ content: including(title) }))
        .find(Button({ ariaLabel: 'search' }))
        .exists(),
    );
    cy.do(
      succeedingTitles
        .find(MultiColumnListCell({ content: including(title) }))
        .find(Button({ ariaLabel: 'search' }))
        .hoverMouse(),
    );
    cy.expect(Tooltip().has({ text: `Search for ${title}` }));
  },
  verifySucceedingTitle: (title) => {
    cy.expect(succeedingTitles.find(MultiColumnListCell({ content: including(title) })).exists());
  },

  precedingTitlesIconClick() {
    cy.get('#precedingTitles').find('a').invoke('removeAttr', 'target').click();
  },
  succeedingTitlesIconClick() {
    cy.get('#succeedingTitles').find('a').invoke('removeAttr', 'target').click();
  },

  clickNextPaginationButton() {
    cy.do(Pane({ id: 'pane-instancedetails' }).find(Button('Next')).click());
  },

  openHoldingView: () => {
    cy.do(Button('View holdings').click());
    cy.expect(actionsButton.exists());
  },

  openSubjectAccordion: () => cy.do(subjectAccordion.clickHeader()),

  duplicate: () => {
    cy.do([rootSection.find(actionsButton).click(), Button({ id: 'copy-instance' }).click()]);
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

  verifyNotMarkAsStaffSuppressed() {
    cy.wait(1000);
    cy.expect(
      rootSection.find(HTML(including('Warning: Instance is marked staff suppressed'))).absent(),
    );
  },

  verifyMarkedAsStaffSuppressed() {
    cy.expect(
      rootSection
        .find(adminDataAccordion)
        .find(HTML(including('Staff suppressed')))
        .exists(),
    );
  },

  verifyNotMarkAssuppressFromDiscavery() {
    cy.expect(
      rootSection
        .find(adminDataAccordion)
        .find(HTML(including('Suppressed from discovery')))
        .absent(),
    );
  },

  verifyMarkedAsPreviouslyHeld() {
    cy.expect(
      rootSection
        .find(adminDataAccordion)
        .find(HTML(including('Previously held')))
        .exists(),
    );
  },

  verifyNotMarkAsPreviouslyHeld() {
    cy.expect(
      rootSection
        .find(adminDataAccordion)
        .find(HTML(including('Previously held')))
        .absent(),
    );
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

  verifyItemIsCreated: (holdingToBeOpened, itemBarcode) => {
    cy.expect(
      Accordion({ label: including(`Holdings: ${holdingToBeOpened}`) })
        .find(MultiColumnListCell({ columnIndex: 0 }))
        .find(HTML(including(itemBarcode)))
        .exists(),
    );
  },

  verifyModeOfIssuance(value) {
    cy.expect(KeyValue('Mode of issuance').has({ value }));
  },

  verifyPublisher: ({ publisher, role, place, date }, indexRow = 0) => {
    cy.expect([
      publisherList
        .find(MultiColumnListCell({ row: indexRow, column: 'Publisher' }))
        .has({ content: including(publisher) }),
      publisherList
        .find(MultiColumnListCell({ row: indexRow, column: 'Publisher role' }))
        .has({ content: including(role) }),
      publisherList
        .find(MultiColumnListCell({ row: indexRow, column: 'Place of publication' }))
        .has({ content: including(place) }),
      publisherList
        .find(MultiColumnListCell({ row: indexRow, column: 'Publication date' }))
        .has({ content: including(date) }),
    ]);
  },

  verifyContributorWithMarcAppLink: (indexRow, indexColumn, value) => {
    cy.expect(
      Accordion('Contributor')
        .find(MultiColumnList({ id: 'list-contributors' }))
        .find(MultiColumnListRow({ index: indexRow }))
        .find(MultiColumnListCell({ columnIndex: indexColumn }))
        .has({ content: including(value) }),
    );
  },

  verifyContributorNameWithMarcAppIcon: (indexRow, indexColumn, value) => {
    cy.expect(
      Accordion('Contributor')
        .find(MultiColumnListRow({ index: indexRow }))
        .find(
          MultiColumnListCell({
            columnIndex: indexColumn,
            content: 'Linked to MARC authority' + value,
          }),
        )
        .exists(),
    );
  },

  verifyContributorNameWithoutMarcAppIcon: (row, value) => {
    cy.expect(
      Accordion('Contributor')
        .find(MultiColumnListCell({ row, content: including(value) }))
        .has({ content: not(including('Linked to MARC authority')) }),
    );
  },

  verifyInstanceAdministrativeNote: (note) => {
    cy.expect(instanceAdministrativeNote.find(HTML(including(note))).exists());
  },

  scroll: () => {
    cy.get('[id^="list-items-"] div.mclScrollable---JvHuN').scrollTo('right');
  },

  edit: () => {
    cy.do(rootSection.find(actionsButton).click());
    cy.do(Button('Edit instance').click());
    InstanceRecordEdit.waitLoading();
  },

  moveHoldingsItemsToAnotherInstance: () => {
    cy.do(rootSection.find(actionsButton).click());
    cy.do(Button('Move holdings/items to another instance').click());
    SelectInstanceModal.verifyModalExists();
  },

  addHoldings: () => {
    cy.do(Button({ id: 'clickable-new-holdings-record' }).click());
    InventoryNewHoldings.waitLoading();
  },

  addItem() {
    cy.expect(addItemButton.exists());
    cy.do(addItemButton.click());
  },

  editMarcBibliographicRecord: () => {
    cy.wait(1000);
    cy.do([rootSection.find(actionsButton).click(), Button({ id: 'edit-instance-marc' }).click()]);
    InventoryEditMarcRecord.checkEditableQuickMarcFormIsOpened();
  },

  exportInstanceMarc: () => {
    cy.wait(1000);
    cy.do([rootSection.find(actionsButton).click(), Button('Export instance (MARC)').click()]);
  },

  setRecordForDeletion: () => {
    cy.do(Button({ id: 'quick-export-trigger' }).click());
  },

  markAsDeletedViaApi: (id) => {
    cy.okapiRequest({
      method: 'DELETE',
      path: `inventory/instances/${id}/mark-deleted`,
      isDefaultSearchParamsRequired: false,
    });
  },

  verifyEditInstanceButtonAbsent() {
    cy.do(rootSection.find(actionsButton).click());
    cy.expect(Button({ id: 'edit-instance' }).absent());
  },

  verifyEditInstanceButtonIsEnabled() {
    cy.do(rootSection.find(actionsButton).click());
    cy.expect(Button({ id: 'edit-instance' }).has({ disabled: false }));
  },

  verifyAddMARCHoldingsRecordOptionAbsent() {
    cy.do(rootSection.find(actionsButton).click());
    cy.expect(Button({ id: 'Add MARC holdings record' }).absent());
  },

  verifyViewRequestOptionAbsent() {
    cy.do(rootSection.find(actionsButton).click());
    cy.expect(Button('New request').absent());
  },

  verifyViewRequestOptionEnabled() {
    cy.do(rootSection.find(actionsButton).click());
    cy.expect(Button(including('New request')).exists());
  },

  verifyNewOrderOptionAbsent() {
    cy.do(rootSection.find(actionsButton).click());
    cy.expect(Button({ id: 'clickable-create-order' }).absent());
  },

  verifyShareLocalInstanceOptionAbsent() {
    cy.do(rootSection.find(actionsButton).click());
    cy.expect(Button({ id: 'share-local-instance' }).absent());
  },

  verifyMoveItemsWithinAnInstanceOptionAbsent() {
    cy.do(rootSection.find(actionsButton).click());
    cy.expect(Button({ id: 'inventory-menu-section' }).absent());
  },

  verifyMoveHoldingsItemsToAnotherInstanceOptionAbsent() {
    cy.do(rootSection.find(actionsButton).click());
    cy.expect(Button({ id: 'move-instance' }).absent());
  },

  verifyMoveHoldingsItemsToAnotherInstanceOptionExists() {
    cy.do(rootSection.find(actionsButton).click());
    cy.expect(Button({ id: 'move-instance' }).exists());
  },

  verifyInstanceHeader(header) {
    cy.get('#paneHeaderpane-instancedetails')
      .find('[class*="paneTitleLabel-"]')
      .should('have.text', header);
  },

  verifySetRecordForDeletionOptionEnabled() {
    cy.do(rootSection.find(actionsButton).click());
    cy.expect(Button({ id: 'quick-export-trigger' }).has({ disabled: false }));
  },

  verifySetRecordForDeletionOptionAbsent() {
    cy.do(rootSection.find(actionsButton).click());
    cy.expect(Button({ id: 'quick-export-trigger' }).absent());
  },

  checkMultipleItemNotesWithStaffOnly: (
    rowIndex,
    staffOnly,
    noteType,
    noteText,
    rowIndexInNote = 0,
  ) => {
    cy.get('#instance-details-notes').within(() => {
      cy.get(`[id="list-instance-notes-${rowIndex}"]`).within(() => {
        cy.get('[role="columnheader"]').eq(1).should('have.text', noteType);

        cy.get(`[data-row-index=row-${rowIndexInNote}] [role="gridcell"]`)
          .eq(0)
          .should('contain', staffOnly);

        cy.get(`[data-row-index=row-${rowIndexInNote}] [role="gridcell"]`)
          .eq(1)
          .should('contain', noteText);
      });
    });
  },

  verifyInstanceSubject: (subjectSource) => {
    cy.expect([
      subjectList
        .find(MultiColumnListRow({ index: subjectSource.indexRow }))
        .find(MultiColumnListCell({ column: 'Subject headings' }))
        .has({ content: subjectSource.subjectHeadings }),
      subjectList
        .find(MultiColumnListRow({ index: subjectSource.indexRow }))
        .find(MultiColumnListCell({ column: 'Subject source' }))
        .has({ content: subjectSource.subjectSource }),
      subjectList
        .find(MultiColumnListRow({ index: subjectSource.indexRow }))
        .find(MultiColumnListCell({ column: 'Subject type' }))
        .has({ content: subjectSource.subjectType }),
    ]);
  },

  verifyInstanceSubjectAbsent: () => {
    cy.expect(subjectAccordion.find(HTML('The list contains no items')).exists());
  },

  checkNotesByType(
    noteTypeRowIndex,
    columnHeader,
    noteValue,
    staffOnlyValue = 'No',
    noteRecordRowIndexInNoteType = 0,
  ) {
    cy.expect(
      MultiColumnList({ id: `list-instance-notes-${noteTypeRowIndex}` })
        .find(
          MultiColumnListCell({
            column: 'Staff only',
            content: staffOnlyValue,
            row: noteRecordRowIndexInNoteType,
          }),
        )
        .exists(),
    );
    cy.expect(
      MultiColumnList({ id: `list-instance-notes-${noteTypeRowIndex}` })
        .find(
          MultiColumnListCell({
            column: columnHeader,
            content: noteValue,
            row: noteRecordRowIndexInNoteType,
          }),
        )
        .exists(),
    );
  },
  verifyResourceIdentifier(type, value, rowIndex) {
    const identifierRow = Accordion('Identifiers').find(
      MultiColumnList({ id: 'list-identifiers' }).find(MultiColumnListRow({ index: rowIndex })),
    );

    cy.expect(identifierRow.find(MultiColumnListCell({ columnIndex: 0 })).has({ content: type }));
    cy.expect(identifierRow.find(MultiColumnListCell({ columnIndex: 1 })).has({ content: value }));
  },

  verifyDates(date1 = 'No value set-', date2 = 'No value set-', dateType = 'No value set-') {
    cy.expect([
      date1KeyValue.has({ value: date1 }),
      date2KeyValue.has({ value: date2 }),
      dateTypeKeyValue.has({ value: dateType }),
    ]);
  },

  verifyLastUpdatedDate(updatedDate) {
    cy.expect(
      Accordion('Administrative data')
        .find(HTML(including(`Record last updated: ${updatedDate}`)))
        .exists(),
    );
  },

  verifyNoteTextAbsentInInstanceAccordion(noteText) {
    cy.expect(instanceDetailsNotesSection.find(HTML(including(noteText))).absent());
  },
};
