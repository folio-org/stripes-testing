import { HTML, including, not, or } from '@interactors/html';
import {
  Accordion,
  Badge,
  Button,
  Callout,
  KeyValue,
  Link,
  MessageBanner,
  MultiColumnList,
  MultiColumnListCell,
  MultiColumnListHeader,
  MultiColumnListRow,
  Pane,
  Section,
  Tooltip,
  matching,
} from '../../../../interactors';
import DateTools from '../../utils/dateTools';
import InteractorsTools from '../../utils/interactorsTools';
import InstanceRecordEdit from './instanceRecordEdit';
import InstanceStates from './instanceStates';
import InventoryEditMarcRecord from './inventoryEditMarcRecord';
import InventoryNewHoldings from './inventoryNewHoldings';
import ItemRecordView from './item/itemRecordView';
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
const addItemButton = Button('Add item');
const versionHistoryButton = Button({ icon: 'clock' });
const addHoldingsButton = Button({ id: 'clickable-new-holdings-record' });
const clipboardIcon = Button({ icon: 'clipboard' });
const instanceAdministrativeNote = MultiColumnList({ id: 'administrative-note-list' });
const instanceNote = MultiColumnList({ id: 'list-instance-notes-0' });
const listClassifications = MultiColumnList({ id: 'list-classifications' });
const electronicAccessAccordion = Accordion('Electronic access');
const classificationAccordion = Accordion('Classification');
const subjectAccordion = Accordion('Subject');
const descriptiveDataAccordion = Accordion('Descriptive data');
const adminDataAccordion = Accordion('Administrative data');
const titleDataAccordion = Accordion('Title data');
const contributorAccordion = Accordion('Contributor');
const acquisitionAccordion = Accordion('Acquisition');
const consortiaHoldingsAccordion = Accordion({ id: including('consortialHoldings') });
const publisherList = descriptiveDataAccordion.find(MultiColumnList({ id: 'list-publication' }));
const precedingTitles = titleDataAccordion.find(MultiColumnList({ id: 'precedingTitles' }));
const succeedingTitles = titleDataAccordion.find(MultiColumnList({ id: 'succeedingTitles' }));
const dateTypeKeyValue = descriptiveDataAccordion.find(KeyValue('Date type'));
const date1KeyValue = descriptiveDataAccordion.find(KeyValue('Date 1'));
const date2KeyValue = descriptiveDataAccordion.find(KeyValue('Date 2'));
const subjectList = subjectAccordion.find(MultiColumnList({ id: 'list-subject' }));
const formatsList = descriptiveDataAccordion.find(MultiColumnList({ id: 'list-formats' }));
const clipboardCopyCalloutText = (value) => `Successfully copied "${value}" to clipboard.`;

const verifyResourceTitle = (value) => {
  cy.expect(KeyValue('Resource title').has({ value }));
};
const verifyIndexTitle = (value) => {
  cy.expect(KeyValue('Index title').has({ value }));
};

const verifyInstanceSource = (sourceValue) => {
  cy.expect(sourceKeyValue.has({ value: including(sourceValue) }));
};

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
  cy.wait(500);
  cy.do(viewSourceButton.click());
};

const verifyAdministrativeNote = (value, isExist = true) => {
  if (isExist) {
    cy.expect(instanceAdministrativeNote.find(MultiColumnListCell({ content: value })).exists());
  } else {
    cy.expect(instanceAdministrativeNote.find(MultiColumnListCell({ content: value })).absent());
  }
};

const verifyInstanceNote = (value) => {
  cy.expect(instanceNote.find(MultiColumnListCell({ content: value })).exists());
};

const verifyStatisticalCode = (value, isExist = true) => {
  if (isExist) {
    cy.expect(
      MultiColumnList({ id: 'list-statistical-codes' })
        .find(MultiColumnListCell({ content: value }))
        .exists(),
    );
  } else {
    cy.expect(
      MultiColumnList({ id: 'list-statistical-codes' })
        .find(MultiColumnListCell({ content: value }))
        .absent(),
    );
  }
};

const verifyStatisticalCodeTypeAndName = (type, name) => {
  cy.expect([
    MultiColumnList({ id: 'list-statistical-codes' })
      .find(MultiColumnListCell({ column: 'Statistical code type', content: type }))
      .exists(),
    MultiColumnList({ id: 'list-statistical-codes' })
      .find(MultiColumnListCell({ column: 'Statistical code name', content: name }))
      .exists(),
  ]);
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
const clickActionsButton = () => {
  cy.do(rootSection.find(actionsButton).click());
};

export const actionsMenuOptions = {
  addMarcHoldingsRecord: 'Add MARC holdings record',
  edit: 'Edit instance',
  duplicate: 'Duplicate instance',
  delete: 'Delete',
  moveHoldingsItemsToAnotherInstance: 'Move holdings/items to another instance',
  moveItemsWithinAnInstance: 'Move items within an instance',
  newOrder: 'New order',
  shareLocalInstance: 'Share local instance',
  newRequest: 'New request',
  setRecordForDeletion: 'Set record for deletion',
  newMarcBibRecord: 'New MARC bibliographic record',
  exportInstanceMarc: 'Export instance (MARC)',
};

export default {
  waitLoading,
  clickActionsButton,
  getMultiColumnListCellsValues,
  verifyResourceTitle,
  verifyIndexTitle,
  verifyInstanceStatusCode,
  verifyResourceType,
  verifyCatalogedDate,
  verifyInstanceStatusTerm,
  verifyGeneralNoteContent,
  verifySrsMarcRecord,
  verifyImportedFieldExists,
  viewSource,
  verifyAdministrativeNote,
  verifyInstanceNote,
  verifyStatisticalCode,
  verifyStatisticalCodeTypeAndName,
  verifyNatureOfContent,
  verifyInstanceSource,
  verifyInstanceRecordViewOpened,
  verifyElectronicAccess,
  verifyElectronicAccessAbsent,
  verifyHotlinkToPOL: (number) => {
    cy.expect(acquisitionAccordion.find(MultiColumnListCell({ row: 0, content: number })).exists());
    cy.expect(acquisitionAccordion.find(Link({ href: including('/orders/lines/view') })).exists());
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
      Accordion({ label: including(`Holdings: ${holdingToBeOpened}`) }).perform((elem) => {
        const items = elem.querySelectorAll('div[class^="mclRow-"]').length;
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

  openHoldingView: (actionsShown = true) => {
    cy.do(Button('View holdings').click());
    if (actionsShown) cy.expect(actionsButton.exists());
  },

  openHoldingItem({ name, barcode, shouldOpen = true }) {
    const holdingsSection = Accordion({ label: including(`Holdings: ${name}`) });

    if (shouldOpen) {
      cy.do(holdingsSection.clickHeader());
    }
    cy.wait(2500);
    cy.do(
      holdingsSection
        .find(MultiColumnListCell({ columnIndex: 1, content: barcode }))
        .find(Button(including(barcode)))
        .click(),
    );

    ItemRecordView.waitLoading();
  },

  openItemByHyperlink(barcode) {
    cy.wait(2000);
    cy.do(
      rootSection
        .find(MultiColumnListCell({ column: 'Item: barcode', content: barcode }))
        .find(Link({ href: including('/inventory/view/') }))
        .click(),
    );
    ItemRecordView.waitLoading();
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
        MultiColumnListHeader({ content: title }).perform((elem) => {
          order = elem.attributes.getNamedItem('aria-sort').value;
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

  verifyPublicationFrequency(value) {
    cy.expect(KeyValue('Publication frequency').has({ value }));
  },

  verifyPublicationRange(value) {
    cy.expect(KeyValue('Publication range').has({ value }));
  },

  verifyMarkAsStaffSuppressedWarning(isDisplayed = true) {
    cy.wait(1000);
    const element = rootSection.find(
      HTML(including('Warning: Instance is marked staff suppressed')),
    );

    if (isDisplayed) {
      cy.expect(element.exists());
    } else {
      cy.expect(element.absent());
    }
  },

  verifyMarkAsSuppressedFromDiscoveryWarning() {
    cy.expect(
      rootSection
        .find(HTML(including('Warning: Instance is marked suppressed from discovery')))
        .exists(),
    );
  },

  verifyMarkAsSuppressedFromDiscoveryAndStaffSuppressedWarning() {
    cy.expect(
      rootSection
        .find(
          HTML(
            including('Warning: Instance is marked suppressed from discovery and staff suppressed'),
          ),
        )
        .exists(),
    );
  },

  verifyInstanceIsSetForDeletionSuppressedFromDiscoveryStaffSuppressedWarning: () => {
    cy.expect(
      MessageBanner().has({
        textContent:
          'Warning: Instance is set for deletion, suppressed from discovery, and staff suppressed',
      }),
    );
  },

  verifyWarningMessage: () => {
    cy.expect(
      HTML(
        including(
          'You do not currently have permission to access details of shared instances. Contact your FOLIO administrator for more information.',
        ),
      ).exists(),
    );
  },

  verifyInstanceIsMarkedAsStaffSuppressed() {
    cy.expect(
      rootSection
        .find(adminDataAccordion)
        .find(HTML(including('Staff suppressed')))
        .exists(),
    );
  },

  verifyInstanceIsMarkedAsSuppressedFromDiscovery(isDisplayed = true) {
    const element = rootSection
      .find(adminDataAccordion)
      .find(HTML(including('Suppressed from discovery')));

    if (isDisplayed) {
      cy.expect(element.exists());
    } else {
      cy.expect(element.absent());
    }
  },

  verifyInstanceIsSetForDeletion(isDisplayed = true) {
    const element = rootSection.find(adminDataAccordion).find(HTML(including('Set for deletion')));

    if (isDisplayed) {
      cy.expect(element.exists());
    } else {
      cy.expect(element.absent());
    }
  },

  verifyInstanceIsMarkedAsPreviouslyHeld(isDisplayed = true) {
    const element = rootSection.find(adminDataAccordion).find(HTML(including('Previously held')));

    if (isDisplayed) {
      cy.expect(element.exists());
    } else {
      cy.expect(element.absent());
    }
  },

  verifyClassification(classType, classification) {
    const list = classificationAccordion.find(listClassifications);

    cy.expect(list.find(MultiColumnListCell({ columnIndex: 0, content: classType })).exists());

    cy.expect(list.find(MultiColumnListCell({ columnIndex: 1, content: classification })).exists());
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
      contributorAccordion
        .find(MultiColumnList({ id: 'list-contributors' }))
        .find(MultiColumnListRow({ index: indexRow }))
        .find(MultiColumnListCell({ columnIndex: indexColumn }))
        .has({ content: including(value) }),
    );
  },

  verifyContributorNameWithMarcAppIcon: (indexRow, indexColumn, value) => {
    cy.expect(
      contributorAccordion
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
      contributorAccordion
        .find(MultiColumnListCell({ row, content: including(value) }))
        .has({ content: not(including('Linked to MARC authority')) }),
    );
  },

  expandContributorAccordion() {
    cy.do(contributorAccordion.clickHeader());
  },

  verifyContributorAccordionIsEmpty() {
    this.expandContributorAccordion();

    const columns = ['Name type', 'Name', 'Type', 'Free text', 'Primary'];

    columns.forEach((column) => {
      cy.expect(
        contributorAccordion
          .find(MultiColumnListRow({ index: 0 }))
          .find(MultiColumnListCell({ column, content: 'No value set-' }))
          .exists(),
      );
    });
  },

  verifyInstanceAdministrativeNote: (note) => {
    cy.expect(instanceAdministrativeNote.find(HTML(including(note))).exists());
  },

  verifyInstaneceAdministrativeNoteByRow: (note, rowIndex = 0) => {
    cy.expect(
      instanceAdministrativeNote
        .find(MultiColumnListCell({ row: rowIndex, content: including(note) }))
        .exists(),
    );
  },

  scroll: () => {
    cy.get('[id^="list-items-"] div.mclScrollable---JvHuN').scrollTo('right');
  },

  edit: () => {
    clickActionsButton();
    cy.do(Button('Edit instance').click());
    InstanceRecordEdit.waitLoading();
  },

  moveHoldingsItemsToAnotherInstance: () => {
    clickActionsButton();
    cy.do(Button('Move holdings/items to another instance').click());
    SelectInstanceModal.verifyModalExists();
  },

  addHoldings: () => {
    cy.do(addHoldingsButton.click());
    InventoryNewHoldings.waitLoading();
  },

  addConsortiaHoldings: (memberTenantName) => {
    cy.wait(2000);
    cy.intercept('locations?*').as('getHoldingsPage');
    cy.do(Accordion(memberTenantName).find(addHoldingsButton).click());
    cy.wait('@getHoldingsPage', { timeout: 5_000 }).then(() => {
      InventoryNewHoldings.waitLoading();
    });
  },

  clickAddItemByHoldingName({ holdingName } = {}) {
    const holdingSection = rootSection.find(Accordion(including(holdingName)));
    cy.do(holdingSection.find(addItemButton).click());
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
    cy.do(Button(actionsMenuOptions.setRecordForDeletion).click());
  },

  markAsDeletedViaApi: (id) => {
    cy.okapiRequest({
      method: 'DELETE',
      path: `inventory/instances/${id}/mark-deleted`,
      isDefaultSearchParamsRequired: false,
      failOnStatusCode: false,
    });
  },

  expandHoldings(...holdingToBeOpened) {
    const openActions = [];
    for (let i = 0; i < holdingToBeOpened.length; i++) {
      openActions.push(
        Accordion({ label: including(`Holdings: ${holdingToBeOpened[i]}`) }).clickHeader(),
      );
    }
    cy.do(openActions);
    // don't have elem on page for waiter
    cy.wait(2000);
  },

  expandConsortiaHoldings() {
    cy.wait(2000);
    cy.do(consortiaHoldingsAccordion.clickHeader());
    cy.wait(2000);
    cy.expect(consortiaHoldingsAccordion.has({ open: true }));
  },

  expandAllInConsortialHoldingsAccordion(instanceId) {
    cy.do([
      Section({ id: `consortialHoldings.${instanceId}` })
        .find(Button('Expand all'))
        .click(),
    ]);
  },

  collapseAllInConsortialHoldingsAccordion(instanceId) {
    cy.do([
      Section({ id: `consortialHoldings.${instanceId}` })
        .find(Button('Collapse all'))
        .click(),
    ]);
  },

  expandMemberSubHoldings(memberTenantName) {
    cy.wait(4000);
    cy.do(Accordion(memberTenantName).focus());
    cy.do(Accordion(memberTenantName).clickHeader());
    cy.wait(2000);
    cy.expect(Accordion(memberTenantName).has({ open: true }));
  },

  openHoldingsAccordion: (location) => {
    cy.wait(2000);
    cy.do(Button(including(location)).click());
    cy.wait(6000);
  },

  verifyItemIsCreated: (holdingToBeOpened, itemBarcode) => {
    cy.expect(
      Accordion({ label: including(`Holdings: ${holdingToBeOpened}`) })
        .find(
          MultiColumnListCell({
            column: 'Item: barcode',
            content: itemBarcode,
          }),
        )
        .exists(),
    );
  },

  verifyMemberSubSubHoldingsAccordion(tenant, memberId, holdingsId, isOpen = true) {
    cy.wait(2000);
    cy.expect([
      Accordion(tenant).has({ open: isOpen }),
      Accordion({ id: `consortialHoldings.${memberId}.${holdingsId}` }).exists(),
    ]);
  },

  verifyEditInstanceButtonIsEnabled() {
    clickActionsButton();
    cy.expect(Button({ id: 'edit-instance' }).has({ disabled: false }));
  },

  verifyInstanceHeader(header) {
    cy.get('#paneHeaderpane-instancedetails')
      .find('[class*="paneTitleLabel-"]')
      .should('have.text', header);
  },

  validateOptionInActionsMenu(optionName, shouldExist = true, openMenu = true) {
    if (openMenu) clickActionsButton();
    if (shouldExist) {
      cy.expect(Button(optionName).exists());
    } else {
      cy.expect(Button(optionName).absent());
    }
  },

  verifyHoldingsAbsent(holdingsLocation) {
    cy.expect(Accordion({ label: including(`Holdings: ${holdingsLocation}`) }).absent());
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

  verifyInstanceSubject: (subjectSource, isLinkedToMarcAuthority = false) => {
    if (isLinkedToMarcAuthority) {
      cy.expect(
        subjectList
          .find(MultiColumnListRow({ index: subjectSource.indexRow }))
          .find(MultiColumnListCell({ column: 'Subject headings' }))
          .has({ content: `Linked to MARC authority${subjectSource.subjectHeadings}` }),
      );
    } else {
      cy.expect(
        subjectList
          .find(MultiColumnListRow({ index: subjectSource.indexRow }))
          .find(MultiColumnListCell({ column: 'Subject headings' }))
          .has({ content: subjectSource.subjectHeadings }),
      );
    }
    cy.expect([
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

  verifyHoldingsListIsEmpty(instanceId) {
    cy.expect(
      Section({ id: `consortialHoldings.${instanceId}` })
        .find(HTML(including('The list contains no items')))
        .exists(),
    );
  },

  verifyItemsListIsEmpty() {
    cy.expect(HTML(including('The list contains no items')).exists());
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

  verifyRecentLastUpdatedDateAndTime() {
    const currentDate = new Date();

    // Generate three time points: one minute before, current, one minute after
    const timePoints = [];
    for (let i = -1; i <= 1; i++) {
      const timePoint = new Date(currentDate.getTime() + i * 60 * 1000);
      timePoints.push(DateTools.getFormattedEndDateWithTimUTC(timePoint, true));
    }

    cy.expect(
      adminDataAccordion
        .find(
          HTML(
            or(...timePoints.map((timePoint) => including(`Record last updated: ${timePoint}`))),
          ),
        )
        .exists(),
    );
  },

  verifyLastUpdatedDateAndTime(updatedDate) {
    cy.expect(
      adminDataAccordion.find(HTML(including(`Record last updated: ${updatedDate}`))).exists(),
    );
  },

  verifyNoteTextAbsentInInstanceAccordion(noteText) {
    cy.expect(instanceDetailsNotesSection.find(HTML(including(noteText))).absent());
  },

  verifyConsortialHoldingsAccordion(isOpen = false) {
    cy.expect([
      Section({ id: including('consortialHoldings') }).exists(),
      consortiaHoldingsAccordion.has({ open: isOpen }),
    ]);
  },

  verifyConsortiaHoldingsAccordion(instanceId, isOpen = false) {
    cy.expect([
      Section({ id: `consortialHoldings.${instanceId}` }).exists(),
      Accordion({ id: `consortialHoldings.${instanceId}` }).has({ open: isOpen }),
    ]);
  },

  verifyMemberSubHoldingsAccordionAbsent(memberId) {
    cy.wait(2000);
    cy.expect(Accordion({ id: including(memberId) }).absent());
  },

  verifyMemberSubHoldingsAccordion(memberId, isOpen = true) {
    cy.wait(2000);
    cy.expect([
      consortiaHoldingsAccordion.has({ open: isOpen }),
      Accordion({ id: including(memberId) }).exists(),
    ]);
  },

  verifySubHoldingsAccordion(memberId, holdingId, isOpen = true) {
    cy.wait(1000);
    cy.expect([
      Accordion({ id: `consortialHoldings.${memberId}.${holdingId}` }).has({ open: isOpen }),
    ]);
  },

  clickVersionHistoryButton() {
    cy.do(versionHistoryButton.click());
  },

  moveItemsWithinAnInstance() {
    clickActionsButton();
    cy.do(Button({ id: 'move-instance-items' }).click());
  },

  verifyMoveToButtonState(holdingToBeOpened, isEnubled = true) {
    if (isEnubled) {
      cy.expect(
        Accordion({ label: including(`Holdings: ${holdingToBeOpened}`) })
          .find(Button({ id: including('clickable-move-holdings-') }))
          .has({ disabled: true }),
      );
    } else {
      cy.expect(
        Accordion({ label: including(`Holdings: ${holdingToBeOpened}`) })
          .find(Button({ id: including('clickable-move-holdings-') }))
          .has({ disabled: false }),
      );
    }
  },

  verifyInstanceFormat(category, term, code, source) {
    let matchingString = category;
    if (!term) matchingString += 'No value set-';
    else matchingString += `  ${term}`;
    if (code) matchingString += code;
    if (source) matchingString += source;
    cy.expect(formatsList.find(MultiColumnListRow(including(matchingString))).exists());
  },

  verifyAddHoldingsButtonIsAbsent() {
    cy.expect(addHoldingsButton.absent());
  },

  verifyAddItemButtonVisibility({ holdingName, shouldBePresent = true } = {}) {
    const holdingSection = rootSection.find(Accordion(including(holdingName)));

    if (shouldBePresent) {
      cy.expect(holdingSection.find(addItemButton).exists());
    } else {
      cy.expect(holdingSection.find(addItemButton).absent());
    }
  },

  verifyCopyClassificationNumberToClipboard(classificationNumber, clipboardIndex = 0) {
    cy.then(() => {
      cy.do(
        classificationAccordion
          .find(listClassifications)
          .find(MultiColumnListCell({ columnIndex: 1, content: classificationNumber }))
          .find(clipboardIcon)
          .click(),
      );
      cy.expect(Callout(clipboardCopyCalloutText(classificationNumber)).exists());
    }).then(() => {
      cy.checkBrowserPrompt({ callNumber: clipboardIndex, promptValue: classificationNumber });
    });
  },

  verifyAlternativeTitle(indexRow, value, isLinkedToMarcAuthority = false) {
    const alternativeTitleCell = titleDataAccordion
      .find(MultiColumnList({ id: 'list-alternative-titles' }))
      .find(MultiColumnListRow({ index: indexRow }))
      .find(MultiColumnListCell({ column: 'Alternative title' }));

    if (isLinkedToMarcAuthority) {
      cy.expect(alternativeTitleCell.has({ content: `Linked to MARC authority${value}` }));
    } else {
      cy.expect(alternativeTitleCell.has({ content: value }));
    }
  },
  collapseAll() {
    cy.get('#pane-instancedetails').find('button').contains('Expand all').first()
      .click();
    cy.wait(1500);
    cy.get('#pane-instancedetails').find('button').contains('Collapse all').first()
      .click();
    cy.wait(1500);
  },
  openAcquisitionAccordion() {
    cy.do(acquisitionAccordion.clickHeader());
  },
  verifyMemberTenantSubAccordionInAcquisitionAccordion(values) {
    if (Array.isArray(values)) {
      values.forEach((expectedValue, index) => {
        cy.expect(
          acquisitionAccordion
            .find(Accordion({ id: 'active-acquisition-accordion' }))
            .find(MultiColumnListCell({ row: 0, columnIndex: index, content: expectedValue }))
            .exists(),
        );
      });
    } else {
      // Handle single value case
      cy.expect(
        acquisitionAccordion
          .find(Accordion({ id: 'active-acquisition-accordion' }))
          .find(MultiColumnListCell({ row: 0, content: values }))
          .exists(),
      );
    }
  },
  verifyCentralTenantSubAccordionInAcquisitionAccordion(values) {
    if (Array.isArray(values)) {
      values.forEach((expectedValue, index) => {
        cy.expect(
          acquisitionAccordion
            .find(Accordion({ id: 'central-acquisition-accordion' }))
            .find(MultiColumnListCell({ row: 0, columnIndex: index, content: expectedValue }))
            .exists(),
        );
      });
    } else {
      // Handle single value case
      cy.expect(
        acquisitionAccordion
          .find(Accordion({ id: 'central-acquisition-accordion' }))
          .find(MultiColumnListCell({ row: 0, content: values }))
          .exists(),
      );
    }
  },
  verifyMemberTenantSubAccordionInAcquisitionAccordionIsEmpty(shouldOpen = true) {
    if (shouldOpen) {
      cy.do(
        acquisitionAccordion.find(Accordion({ id: 'active-acquisition-accordion' })).clickHeader(),
      );
    }
    cy.expect(
      acquisitionAccordion
        .find(Accordion({ id: 'active-acquisition-accordion' }))
        .find(HTML('The list contains no items'))
        .exists(),
    );
  },

  verifyAcquisitionAccordionDetails: (values) => {
    if (Array.isArray(values)) {
      values.forEach((expectedValue, index) => {
        cy.expect(
          acquisitionAccordion
            .find(MultiColumnListCell({ row: 0, columnIndex: index, content: expectedValue }))
            .exists(),
        );
      });
    } else {
      // Handle single value case
      cy.expect(
        acquisitionAccordion.find(MultiColumnListCell({ row: 0, content: values })).exists(),
      );
    }
  },

  openAccordion: (name) => {
    cy.do(Accordion(name).clickHeader());
  },
};
