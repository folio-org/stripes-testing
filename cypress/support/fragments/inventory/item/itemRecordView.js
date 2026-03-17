import { HTML, including, or } from '@interactors/html';
import {
  Accordion,
  Button,
  Callout,
  KeyValue,
  Link,
  MultiColumnList,
  MultiColumnListCell,
  MultiSelect,
  Pane,
  PaneHeader,
  Spinner,
  TextField,
  ValueChipRoot,
} from '../../../../../interactors';
import { ITEM_STATUS_NAMES } from '../../../constants';
import dateTools from '../../../utils/dateTools';
import ConfirmDeleteItemModal from '../modals/confirmDeleteItemModal';
import UpdateOwnershipModal from '../modals/updateOwnershipModal';
import ItemRecordEdit from './itemRecordEdit';

const actionsButton = Button('Actions');
const loanAccordion = Accordion('Loan and availability');
const administrativeDataAccordion = Accordion('Administrative data');
const acquisitionAccordion = Accordion('Acquisition');
const itemDataAccordion = Accordion('Item data');
const itemNotesAccordion = Accordion('Item notes');
const circulationHistoryAccordion = Accordion('Circulation history');
const saveAndCloseBtn = Button('Save & close');
const electronicAccessAccordion = Accordion('Electronic access');
const tagsAccordion = Accordion('Tags');
const hridKeyValue = KeyValue('Item HRID');
const textFieldTagInput = MultiSelect({ label: 'Tag text area' });
const closeIcon = Button({ icon: 'times' });

const verifyItemBarcode = (value) => {
  cy.expect(KeyValue('Item barcode').has({ value }));
};
const verifyItemIdentifier = (value) => {
  cy.expect(KeyValue('Item identifier').has({ value }));
};
const verifyPermanentLoanType = (value) => {
  cy.expect(KeyValue('Permanent loan type').has({ value }));
};
const verifyTemporaryLoanType = (value) => {
  cy.expect(KeyValue('Temporary loan type').has({ value }));
};
const verifyNote = (value) => {
  cy.expect(KeyValue('Check in note').has({ value }));
};
const waitLoading = () => {
  cy.contains('Item', { timeout: 120000 }).should('be.visible');
  cy.expect(Pane(including('Item')).exists());
};
const verifyItemStatus = (itemStatus) => {
  cy.expect(loanAccordion.find(KeyValue('Item status')).has({ value: itemStatus }));
};
const verifyItemStatusInPane = (itemStatus) => {
  cy.expect(PaneHeader(including(itemStatus)).exists());
};
const closeDetailView = () => {
  cy.expect(Pane(including('Item')).exists());
  cy.do(
    PaneHeader()
      .find(Button({ icon: 'times' }))
      .click(),
  );
  cy.expect(Pane(including('Item')).absent());
};
const findRowAndClickLink = (enumerationValue) => {
  cy.get(`div[class^="mclCell-"]:contains('${enumerationValue}')`)
    .closest('div[class^="mclRow-"]')
    .within(() => {
      cy.get('a').click();
    });
};
const getAssignedHRID = () => cy.then(() => hridKeyValue.value());
const clickUpdateOwnership = () => {
  cy.do([actionsButton.click(), Button('Update ownership').click()]);
};

const itemStatuses = {
  onOrder: ITEM_STATUS_NAMES.ON_ORDER,
  inProcess: ITEM_STATUS_NAMES.IN_PROCESS,
  available: ITEM_STATUS_NAMES.AVAILABLE,
  missing: ITEM_STATUS_NAMES.MISSING,
  inTransit: ITEM_STATUS_NAMES.IN_TRANSIT,
  paged: ITEM_STATUS_NAMES.PAGED,
  awaitingPickup: ITEM_STATUS_NAMES.AWAITING_PICKUP,
  checkedOut: ITEM_STATUS_NAMES.CHECKED_OUT,
  declaredLost: ITEM_STATUS_NAMES.DECLARED_LOST,
  awaitingDelivery: ITEM_STATUS_NAMES.AWAITING_DELIVERY,
};

export const actionsMenuOptions = {
  updateOwnership: 'Update ownership',
};

export default {
  itemStatuses,
  waitLoading,
  verifyItemBarcode,
  verifyItemIdentifier,
  verifyPermanentLoanType,
  verifyTemporaryLoanType,
  verifyNote,
  closeDetailView,
  verifyItemStatus,
  verifyItemStatusInPane,
  getAssignedHRID,
  findRowAndClickLink,
  clickUpdateOwnership,

  suppressedAsDiscoveryIsAbsent() {
    cy.wait(1000);
    cy.expect(HTML(including('Warning: Item is marked suppressed from discovery')).absent());
  },

  suppressedAsDiscoveryIsPresent() {
    cy.expect(HTML(including('Warning: Item is marked suppressed from discovery')).exists());
  },

  verifyUpdatedItemDate: () => {
    cy.do(
      loanAccordion.find(KeyValue('Item status')).perform((element) => {
        const rawDate = element.innerText;
        const parsedDate = Date.parse(
          rawDate.match(/\d{1,2}\/\d{1,2}\/\d{4},\s\d{1,2}:\d{1,2}\s\w{2}/gm)[0],
        );
        // For local run it needs to add 18000000
        // The time on the server and the time on the yuai differ by 3 hours. It was experimentally found that it is necessary to add 18000000 sec
        dateTools.verifyDate(parsedDate, 18000000);
      }),
    );
  },

  addPieceToItem: (numberOfPieces) => {
    cy.do([TextField({ name: 'numberOfPieces' }).fillIn(numberOfPieces), saveAndCloseBtn.click()]);
  },
  openItemEditForm(itemTitle) {
    cy.do([actionsButton.click(), Button('Edit').click()]);
    ItemRecordEdit.waitLoading(itemTitle);

    return ItemRecordEdit;
  },

  clickDeleteButton() {
    cy.do([actionsButton.click(), Button('Delete').click()]);

    return ConfirmDeleteItemModal;
  },

  duplicateItem() {
    cy.do([actionsButton.click(), Button('Duplicate').click()]);
  },

  createNewRequest() {
    cy.do([actionsButton.click(), Button('New request').click()]);
  },

  openRequest() {
    cy.do(loanAccordion.find(Link({ href: including('/requests?filters=requestStatus') })).click());
  },

  openBorrowerPage() {
    cy.do(
      KeyValue('Borrower')
        .find(Link({ href: including('/users/view') }))
        .click(),
    );
  },

  updateOwnership: (tenant, location) => {
    clickUpdateOwnership();
    UpdateOwnershipModal.validateUpdateOwnershipModalView(tenant);
    UpdateOwnershipModal.validateAbilityToCreateNewHoldings(tenant);
    UpdateOwnershipModal.updateHoldings(tenant, location);
  },

  verifyEffectiveLocationForItemInDetails: (location) => {
    cy.get('div[data-testid="item-effective-location"]').first().should('contain', location);
  },

  verifyEffectiveLocation: (location) => {
    cy.expect(
      Accordion('Location').find(KeyValue('Effective location for item')).has({ value: location }),
    );
  },

  verifyPermanentLocation: (location) => {
    cy.expect(
      Accordion({ label: 'Location' })
        .find(KeyValue({ dataTestId: 'item-permanent-location', value: location }))
        .exists(),
    );
  },

  verifyTemporaryLocation: (location) => {
    cy.expect(
      Accordion({ label: 'Location' })
        .find(KeyValue({ dataTestId: 'item-temporary-location', value: including(location) }))
        .exists(),
    );
  },

  checkItemAdministrativeNote: (note) => {
    cy.expect(
      MultiColumnList({ id: 'administrative-note-list' })
        .find(HTML(including(note)))
        .exists(),
    );
  },

  verifyTextAbsent(text) {
    cy.expect(HTML(including(text)).absent());
  },

  verifyMaterialType: (type, orLogic = false) => {
    let matcher = including(type);
    if (orLogic) matcher = or(...type.map((el) => including(el)));
    cy.expect(itemDataAccordion.find(HTML(matcher)).exists());
  },

  checkItemNote: (note, staffValue = 'Yes', value = 'Note') => {
    cy.expect(itemNotesAccordion.find(KeyValue(value)).has({ value: note }));
    cy.expect(itemNotesAccordion.find(KeyValue('Staff only')).has({ value: staffValue }));
  },

  checkItemNoteAbsent(noteTypeName) {
    cy.expect(itemNotesAccordion.find(KeyValue(noteTypeName)).absent());
  },

  checkMultipleItemNotes: (...itemNotes) => {
    itemNotes.forEach((itemNote) => {
      cy.expect([KeyValue(itemNote.type).has({ value: itemNote.note })]);
    });
  },

  checkMultipleItemNotesWithStaffOnly: (rowIndex, staffOnly, noteType, noteText) => {
    cy.get('#acc05').within(() => {
      cy.get("[class^='row---']")
        .eq(rowIndex)
        .within(() => {
          cy.get("[class^='col-']")
            .first()
            .within(() => {
              cy.get("[class^='kvRoot-'] [class^='kvValue---']").should('contain', staffOnly);
            });

          cy.get("[class^='col-']:nth-child(2)").within(() => {
            cy.get("[class^='kvRoot-'] [class^='kvLabel-']").should('contain', noteType);
            cy.get("[class^='kvRoot-'] [class^='kvValue-']").should('contain', noteText);
          });
        });
    });
  },

  checkCirculationNotesWithStaffOnly: (rowIndex, staffOnly, noteType, noteText) => {
    cy.get('#acc06').within(() => {
      cy.get("[class^='row---']")
        .eq(rowIndex)
        .within(() => {
          cy.get("[class^='col-']")
            .first()
            .within(() => {
              cy.get("[class^='kvRoot-'] [class^='kvValue---']").should('contain', staffOnly);
            });

          cy.get("[class^='col-']:nth-child(2)").within(() => {
            cy.get("[class^='kvRoot-'] [class^='kvLabel-']").should('contain', noteType);
            cy.get("[class^='kvRoot-'] [class^='kvValue-']").should('contain', noteText);
          });
        });
    });
  },

  checkStaffOnlyValueInLoanAccordion(staffOnlyValue) {
    cy.expect(loanAccordion.find(KeyValue('Staff only')).has({ value: staffOnlyValue }));
  },

  checkFieldsConditions({ fields, section } = {}) {
    fields.forEach(({ label, conditions }) => {
      cy.expect(section.find(KeyValue(label)).has(conditions));
    });
  },

  checkCheckInNote: (note, staffValue = 'Yes') => {
    cy.expect(loanAccordion.find(KeyValue('Check in note')).has({ value: note }));
    cy.contains('[class^="kvLabel-"]', 'Check in note')
      .parentsUntil('[aria-labelledby="accordion-toggle-button-acc06"]')
      .filter((index, el) => {
        return Array.from(el.classList).some((cls) => cls.startsWith('row-'));
      })
      .first()
      .within(() => {
        cy.contains('[class^="kvLabel-"]', 'Staff only')
          .parent()
          .find('[data-test-kv-value]')
          .should('contain.text', staffValue);
      });
  },

  checkCheckOutNote: (note, staffValue = 'Yes') => {
    cy.expect(loanAccordion.find(KeyValue('Check out note')).has({ value: note }));
    cy.contains('div', 'Check out note')
      .parentsUntil('[aria-labelledby="accordion-toggle-button-acc06"]')
      .filter((index, el) => {
        return Array.from(el.classList).some((cls) => cls.startsWith('row-'));
      })
      .first()
      .within(() => {
        cy.contains('[class^="kvLabel-"]', 'Staff only')
          .parent()
          .find('[data-test-kv-value]')
          .should('contain.text', staffValue);
      });
  },

  checkElectronicBookplateNote: (note) => {
    cy.expect(itemNotesAccordion.find(KeyValue('Electronic bookplate')).has({ value: note }));
  },

  checkBindingNoteWithStaffValue: (note, staffValue = 'No') => {
    cy.expect([itemNotesAccordion.find(KeyValue('Binding')).has({ value: note })]);
    cy.contains('section', 'Item notes')
      .find('div[class*= row]')
      .contains(note)
      .find('[class*=kvValue]')
      .should('have.text', `${staffValue}${note}`);
  },

  checkBindingNote: (note) => {
    cy.expect([itemNotesAccordion.find(KeyValue('Binding')).has({ value: note })]);
  },

  checkActionNote: (note) => {
    cy.expect(itemNotesAccordion.find(KeyValue('Action note')).has({ value: note }));
  },

  checkProvenanceNote: (note) => {
    cy.expect(itemNotesAccordion.find(KeyValue('Provenance')).has({ value: note }));
  },

  checkBarcode: (barcode) => {
    cy.expect(administrativeDataAccordion.find(KeyValue('Item barcode')).has({ value: barcode }));
  },

  checkCopyNumber: (copyNumber) => {
    cy.expect(itemDataAccordion.find(KeyValue('Copy number')).has({ value: copyNumber }));
  },

  checkCalloutMessage: () => {
    cy.expect(
      Callout({ textContent: including('The item - HRID  has been successfully saved.') }).exists(),
    );
  },
  checkItemRecordDetails({ administrativeData = [], itemData = [], acquisitionData = [] } = {}) {
    this.checkFieldsConditions({
      fields: administrativeData,
      section: administrativeDataAccordion,
    });
    this.checkFieldsConditions({ fields: itemData, section: itemDataAccordion });
    this.checkFieldsConditions({ fields: acquisitionData, section: acquisitionAccordion });
  },
  checkItemDetails(location, barcode, status) {
    this.verifyEffectiveLocation(location);
    this.checkBarcode(barcode);
    this.verifyItemStatus(status);
  },

  checkAccessionNumber: (number) => {
    cy.expect(
      administrativeDataAccordion.find(KeyValue('Accession number')).has({ value: number }),
    );
  },

  verifyNumberOfPieces: (number) => {
    cy.expect(itemDataAccordion.find(KeyValue('Number of pieces')).has({ value: number }));
  },

  verifyNumberOfMissingPieces: (number) => {
    cy.expect(Accordion('Condition').find(KeyValue('Missing pieces')).has({ value: number }));
  },

  checkHotlinksToCreatedPOL: (number) => {
    cy.expect(acquisitionAccordion.find(KeyValue('POL number')).has({ value: number }));
    cy.expect(acquisitionAccordion.find(Link({ href: including('/orders/lines/view') })).exists());
  },

  checkItemCirculationHistory: (date, servicePointName, userName) => {
    cy.expect([
      circulationHistoryAccordion.find(KeyValue('Check in date')).has({ value: including(date) }),
      circulationHistoryAccordion.find(KeyValue('Service point')).has({ value: servicePointName }),
      circulationHistoryAccordion.find(KeyValue('Source')).has({ value: including(userName) }),
    ]);
  },

  verifyCalloutMessage: () => {
    cy.expect(Callout({ textContent: including('has been successfully saved.') }).exists());
  },

  changeItemBarcode: (barcode) => {
    cy.do([TextField({ id: 'additem_barcode' }).fillIn(barcode), saveAndCloseBtn.click()]);
  },

  verifyStatisticalCode: (code) => cy.expect(
    MultiColumnList({ id: 'item-list-statistical-codes' })
      .find(MultiColumnListCell({ content: code }))
      .exists(),
  ),

  verifyLoanAndAvailabilitySection(data) {
    this.expandAll();
    verifyPermanentLoanType(
      data.permanentLoanType === '-' ? 'No value set-' : data.permanentLoanType,
    );
    verifyTemporaryLoanType(
      data.temporaryLoanType === '-' ? 'No value set-' : data.temporaryLoanType,
    );
    verifyItemStatus(data.itemStatus === '-' ? 'No value set-' : data.itemStatus);
    cy.expect([
      loanAccordion
        .find(
          KeyValue('Requests', {
            value: data.requestQuantity === '-' ? 'No value set-' : data.requestQuantity,
          }),
        )
        .exists(),
      loanAccordion
        .find(
          KeyValue('Borrower', { value: data.borrower === '-' ? 'No value set-' : data.borrower }),
        )
        .exists(),
      loanAccordion
        .find(
          KeyValue('Loan date', { value: data.loanDate === '-' ? 'No value set-' : data.loanDate }),
        )
        .exists(),
      loanAccordion
        .find(
          KeyValue('Due date', { value: data.dueDate === '-' ? 'No value set-' : data.dueDate }),
        )
        .exists(),
      loanAccordion
        .find(
          KeyValue('Staff only', {
            value: data.staffOnly === '-' ? 'No value set-' : data.staffOnly,
          }),
        )
        .exists(),
      loanAccordion
        .find(KeyValue('Note', { value: data.note === '-' ? 'No value set-' : data.note }))
        .exists(),
    ]);
  },

  verifyFormerIdentifiers: (identifier) => cy.expect(KeyValue('Former identifier').has({ value: identifier })),
  verifyShelvingOrder: (orderValue) => cy.expect(KeyValue('Shelving order').has({ value: orderValue })),
  verifyCallNumber: (callNumber) => cy.expect(KeyValue('Call number').has({ value: callNumber })),
  verifyItemPermanentLocation: (value) => {
    cy.get('div[data-testid="item-permanent-location"]')
      .find('div[class*=kvValue]')
      .should('have.text', value);
  },
  verifyHoldingsPermanentLocation: (value) => {
    cy.get('div[data-testid="holding-permanent-location"]')
      .find('div[class*=kvValue]')
      .should('have.text', value);
  },
  verifyItemEffectiveLocation: (value) => {
    cy.get('div[data-testid="item-effective-location"]')
      .last()
      .find('div[class*=kvValue]')
      .should('contain', value);
  },
  verifyItemMetadata: (updatedHoldingsDate, updatedItemData, userId) => {
    const convertedHoldingsDate = new Date(updatedHoldingsDate).getTime();
    const convertedItemsDate = new Date(updatedItemData.updatedDate).getTime();
    const timeDifference = (convertedItemsDate - convertedHoldingsDate) / 1000;

    // check that difference in time is less than 1 minute
    expect(timeDifference).to.be.lessThan(60000);
    expect(userId).to.eq(updatedItemData.updatedByUserId);
  },
  verifyItemCallNumberChangedAfterChangedInHoldings: (
    createdItemData,
    updatedItemData,
    updatedCallNumber,
  ) => {
    const updatedEffectiveCallNumberComponents = {
      callNumber: updatedItemData.effectiveCallNumberComponents.callNumber,
      prefix: updatedItemData.effectiveCallNumberComponents.prefix,
      suffix: updatedItemData.effectiveCallNumberComponents.suffix,
      typeId: updatedItemData.effectiveCallNumberComponents.typeId,
    };
    const createdEffectiveCallNumberComponents = {
      prefix: createdItemData.effectiveCallNumberComponents.prefix,
      suffix: createdItemData.effectiveCallNumberComponents.suffix,
      typeId: createdItemData.effectiveCallNumberComponents.typeId,
    };

    expect(updatedEffectiveCallNumberComponents.callNumber).to.eq(updatedCallNumber);
    expect(updatedEffectiveCallNumberComponents.prefix).to.eq(
      createdEffectiveCallNumberComponents.prefix,
    );
    expect(updatedEffectiveCallNumberComponents.suffix).to.eq(
      createdEffectiveCallNumberComponents.suffix,
    );
    expect(updatedEffectiveCallNumberComponents.typeId).to.eq(
      createdEffectiveCallNumberComponents.typeId,
    );
  },
  verifyItemPrefixChangedAfterChangedInHoldings: (
    createdItemData,
    updatedItemData,
    updatedPrefix,
  ) => {
    const updatedEffectiveCallNumberComponents = {
      callNumber: updatedItemData.effectiveCallNumberComponents.callNumber,
      prefix: updatedItemData.effectiveCallNumberComponents.prefix,
      suffix: updatedItemData.effectiveCallNumberComponents.suffix,
      typeId: updatedItemData.effectiveCallNumberComponents.typeId,
    };
    const createdEffectiveCallNumberComponents = {
      callNumber: createdItemData.effectiveCallNumberComponents.callNumber,
      suffix: createdItemData.effectiveCallNumberComponents.suffix,
      typeId: createdItemData.effectiveCallNumberComponents.typeId,
    };

    expect(updatedEffectiveCallNumberComponents.callNumber).to.eq(
      createdEffectiveCallNumberComponents.callNumber,
    );
    expect(updatedEffectiveCallNumberComponents.prefix).to.eq(updatedPrefix);
    expect(updatedEffectiveCallNumberComponents.suffix).to.eq(
      createdEffectiveCallNumberComponents.suffix,
    );
    expect(updatedEffectiveCallNumberComponents.typeId).to.eq(
      createdEffectiveCallNumberComponents.typeId,
    );
  },
  verifyItemSuffixChangedAfterChangedInHoldings: (
    createdItemData,
    updatedItemData,
    updatedSuffix,
  ) => {
    const updatedEffectiveCallNumberComponents = {
      callNumber: updatedItemData.effectiveCallNumberComponents.callNumber,
      prefix: updatedItemData.effectiveCallNumberComponents.prefix,
      suffix: updatedItemData.effectiveCallNumberComponents.suffix,
      typeId: updatedItemData.effectiveCallNumberComponents.typeId,
    };
    const createdEffectiveCallNumberComponents = {
      callNumber: createdItemData.effectiveCallNumberComponents.callNumber,
      prefix: createdItemData.effectiveCallNumberComponents.prefix,
      typeId: createdItemData.effectiveCallNumberComponents.typeId,
    };

    expect(updatedEffectiveCallNumberComponents.callNumber).to.eq(
      createdEffectiveCallNumberComponents.callNumber,
    );
    expect(updatedEffectiveCallNumberComponents.prefix).to.eq(
      createdEffectiveCallNumberComponents.prefix,
    );
    expect(updatedEffectiveCallNumberComponents.suffix).to.eq(updatedSuffix);
    expect(updatedEffectiveCallNumberComponents.typeId).to.eq(
      createdEffectiveCallNumberComponents.typeId,
    );
  },

  checkElectronicAccess: (
    relationshipValue,
    uriValue,
    linkText,
    materialsSpecified,
    urlPublicNote,
    row = 0,
  ) => {
    const columnMap = new Map([
      ['URL relationship', relationshipValue],
      ['URI', uriValue],
      ['Link text', linkText],
      ['Materials specified', materialsSpecified],
      ['URL public note', urlPublicNote],
    ]);

    columnMap.forEach((content, column) => {
      cy.expect(
        electronicAccessAccordion.find(MultiColumnListCell({ row, column, content })).exists(),
      );
    });
  },

  verifyLastUpdatedDate(date, userName) {
    cy.get('button[class^="metaHeaderButton-"]').click();
    cy.expect([
      administrativeDataAccordion.find(HTML(including(`Record last updated: ${date}`))).exists(),
      administrativeDataAccordion.find(HTML(including(`Source: ${userName}`))).exists(),
    ]);
  },

  validateOptionInActionsMenu(options) {
    cy.do(actionsButton.click());
    options.forEach(({ optionName, shouldExist }) => {
      if (shouldExist) {
        cy.expect(Button(optionName).exists());
      } else {
        cy.expect(Button(optionName).absent());
      }
    });
    cy.do(actionsButton.click());
    cy.wait(1500);
  },

  verifyEffectiveCallNumber: (effectiveCallNumber) => cy.expect(KeyValue('Effective call number').has({ value: effectiveCallNumber })),

  closeItemEditForm() {
    cy.do(Button({ icon: 'times' }).click());
    cy.wait(1000);
  },

  expandAll() {
    cy.do(Button('Expand all').click());
    cy.wait(1000);
  },

  toggleTagsAccordion(isOpened = true) {
    cy.do(tagsAccordion.clickHeader());
    cy.expect(tagsAccordion.is({ open: isOpened }));
  },

  checkTagsCounter(count) {
    cy.expect(tagsAccordion.has({ counter: `${count}` }));
  },

  verifyHrid: (hrid) => cy.expect(hridKeyValue.has({ value: hrid })),

  verifyVolume: (volume) => cy.expect(KeyValue('Volume').has({ value: volume })),

  verifyRequestsCount: (count) => {
    cy.expect(loanAccordion.find(KeyValue('Requests', { value: count.toString() })).exists());
  },

  addTag: (tagName) => {
    cy.expect(tagsAccordion.find(Spinner()).absent());
    cy.intercept('PUT', '**/inventory/items/*').as('addTag');
    cy.do(tagsAccordion.find(textFieldTagInput).choose(tagName));
    cy.wait('@addTag');
    cy.wait(1500);
  },

  checkTagSelectedInDropdown(tag, isShown = true) {
    if (isShown) cy.expect(ValueChipRoot(tag).exists());
    else cy.expect(ValueChipRoot(tag).absent());
  },

  addMultipleTags(tagNames) {
    cy.wait(1500);
    tagNames.forEach((tag) => {
      cy.expect(textFieldTagInput.find(Spinner()).absent());
      this.addTag(tag);
      this.checkTagSelectedInDropdown(tag);
      cy.expect(textFieldTagInput.find(Spinner()).absent());
    });
    cy.wait(1500);
    tagNames.forEach((tag) => {
      this.checkTagSelectedInDropdown(tag);
    });
  },

  deleteMultipleTags(tagNames) {
    cy.wait(1500);
    cy.intercept('PUT', '**/inventory/items/*').as('removeTag');
    tagNames.forEach((tag) => {
      this.checkTagSelectedInDropdown(tag);
      cy.expect(textFieldTagInput.find(Spinner()).absent());
      cy.do(ValueChipRoot(tag).find(closeIcon).click());
      cy.wait('@removeTag');
      cy.wait(1000);
      this.checkTagSelectedInDropdown(tag, false);
      cy.expect(textFieldTagInput.find(Spinner()).absent());
    });
    cy.wait(1500);
    tagNames.forEach((tag) => {
      this.checkTagSelectedInDropdown(tag, false);
    });
  },

  checkInstanceTitle: (instanceTitle) => {
    cy.expect(Pane(including('Item')).find(Link(instanceTitle)).exists());
  },
};
