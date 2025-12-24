import moment from 'moment';
import { recurse } from 'cypress-recurse';
import { matching } from '@interactors/html';
import {
  QuickMarcEditor,
  QuickMarcEditorRow,
  TextArea,
  Section,
  Button,
  Modal,
  Callout,
  TextField,
  Spinner,
  and,
  or,
  some,
  Pane,
  HTML,
  including,
  PaneContent,
  PaneHeader,
  Tooltip,
  Select,
  Link,
  Label,
} from '../../../interactors';
import dateTools from '../utils/dateTools';
import getRandomPostfix from '../utils/stringTools';
import InventoryInstance from './inventory/inventoryInstance';
import Institutions from './settings/tenant/location-setup/institutions';
import {
  INVENTORY_LDR_FIELD_DROPDOWNS_NAMES,
  INVENTORY_LDR_FIELD_TYPE_DROPDOWN,
  INVENTORY_LDR_FIELD_BLVL_DROPDOWN,
  INVENTORY_008_FIELD_DTST_DROPDOWN,
  INVENTORY_008_FIELD_CONF_DROPDOWN,
  INVENTORY_008_FIELD_FEST_DROPDOWN,
  INVENTORY_008_FIELD_INDX_DROPDOWN,
  INVENTORY_008_FIELD_LITF_DROPDOWN,
  MARC_HOLDING_LDR_FIELD_STATUS_DROPDOWN,
  MARC_HOLDING_LDR_FIELD_TYPE_DROPDOWN,
  MARC_HOLDING_LDR_FIELD_ELVL_DROPDOWN,
  MARC_HOLDING_LDR_FIELD_ITEM_DROPDOWN,
  MARC_HOLDING_LDR_FIELD_DROPDOWNS_NAMES,
  AUTHORITY_LDR_FIELD_DROPDOWNS_NAMES,
} from '../constants';

const holdingsRecordViewSection = Section({ id: 'view-holdings-record-pane' });
const actionsButton = Button('Actions');
const rootSection = Section({ id: 'quick-marc-editor-pane' });
const viewMarcSection = Section({ id: 'marc-view-pane' });
const cancelButton = Button('Cancel');
const closeWithoutSavingBtn = Button('Close without saving');
const xButton = Button({ ariaLabel: 'Close ' });
const addFieldButton = Button({ ariaLabel: 'plus-sign' });
const deleteFieldButton = Button({ ariaLabel: 'trash' });
const linkToMarcRecordButton = Button({ ariaLabel: 'link' });
const unlinkIconButton = Button({ ariaLabel: 'unlink' });
const viewAuthorityIconButton = Button({ ariaLabel: 'eye-open' });
const arrowUpButton = Button({ ariaLabel: 'arrow-up' });
const saveAndCloseButton = Button({ id: 'quick-marc-record-save' });
const saveAndKeepEditingBtn = Button({ id: 'quick-marc-record-save-edit' });
const saveAndCloseButtonEnabled = Button({ id: 'quick-marc-record-save', disabled: false });
const saveAndKeepEditingBtnEnabled = Button({ id: 'quick-marc-record-save-edit', disabled: false });
const saveAndCloseButtonDisabled = Button({ id: 'quick-marc-record-save', disabled: true });
const saveAndKeepEditingBtnDisabled = Button({ id: 'quick-marc-record-save-edit', disabled: true });
const confirmationModal = Modal({ id: 'quick-marc-confirm-modal' });
const cancelEditConformModel = Modal({ id: 'cancel-editing-confirmation' });
const cancelEditConfirmBtn = Button('Keep editing');
const updateLinkedBibFieldsModal = Modal({ id: 'quick-marc-update-linked-bib-fields' });
const confirmDeletingRecordModal = Modal({ id: 'confirm-delete-note' });
const saveButton = Modal().find(
  Button({ id: 'clickable-quick-marc-update-linked-bib-fields-confirm' }),
);
const keepEditingButton = updateLinkedBibFieldsModal.find(
  Button({ id: 'clickable-quick-marc-update-linked-bib-fields-cancel' }),
);
const continueWithSaveButton = Modal().find(
  Button({ id: 'clickable-quick-marc-confirm-modal-confirm' }),
);
const restoreDeletedFieldsBtn = Modal().find(
  Button({ id: 'clickable-quick-marc-confirm-modal-cancel' }),
);
const quickMarcEditorRowContent = HTML({ className: including('quickMarcEditorRowContent') });
const instanceDetailsPane = Pane({ id: 'pane-instancedetails' });
const unlinkModal = Modal({ id: 'quick-marc-confirm-unlink-modal' });
const removeLinkingModal = Modal({ id: 'quick-marc-remove-authority-linking-confirm-modal' });
const keepLinkingButton = Button({
  id: 'clickable-quick-marc-remove-authority-linking-confirm-modal-cancel',
});
const removeLinkingButton = Button({
  id: 'clickable-quick-marc-remove-authority-linking-confirm-modal-confirm',
});
const unlinkButtonInsideModal = Button({ id: 'clickable-quick-marc-confirm-unlink-modal-confirm' });
const cancelUnlinkButtonInsideModal = Button({
  id: 'clickable-quick-marc-confirm-unlink-modal-cancel',
});
const confirmDeleteButton = Modal().find(Button({ id: 'clickable-confirm-delete-note-confirm' }));
const calloutAfterSaveAndClose = Callout(
  'This record has successfully saved and is in process. Changes may not appear immediately.',
);
const calloutUpdatedRecord = Callout(
  'This record has successfully saved and is in process. Changes may not appear immediately.',
);
const calloutOnDeriveFirst = Callout('Creating record may take several seconds.');
const calloutOnDeriveSecond = Callout('Record created.');
const calloutUpdatedLinkedBibRecord = Callout(
  'This record has successfully saved and is in process. 2 linked bibliographic record(s) updates have begun.',
);
const calloutNonEditableLdrBib = Callout(
  'Record cannot be saved. Please check the Leader. Only positions 5, 6, 7, 8, 17, 18 and/or 19 can be edited in the Leader.',
);
const calloutDelete008Error = Callout('Record cannot be saved without 008 field');
const calloutAfterSaveAndCloseNewRecord = Callout('Record created.');
const calloutMarcTagWrongLength = Callout(
  'Record cannot be saved. A MARC tag must contain three characters.',
);
const calloutInvalidMarcTag = Callout('Invalid MARC tag. Please try again.');
const calloutNo245MarcTag = Callout('Field 245 is required.');
const calloutMultiple245MarcTags = Callout('Record cannot be saved with more than one field 245.');
const calloutMultiple001MarcTags = Callout('Record cannot be saved. Can only have one MARC 001.');
const calloutMultiple010MarcTags = Callout('Record cannot be saved with more than one 010 field');
const calloutMultiple010Subfields = Callout('010 can only have one $a.');
const calloutInvalidLDRValue = Callout(
  including('Record cannot be saved. Please enter a valid Leader'),
);

const calloutThreeCharacterMarcTag = Callout(
  'Record cannot be saved. A MARC tag must contain three characters.',
);
const closeButton = Button({ icon: 'times' });
const validRecord = InventoryInstance.validOCLC;
const specRetInputNamesHoldings008 = [
  'records[4].content.Spec ret[0]',
  'records[4].content.Spec ret[1]',
  'records[4].content.Spec ret[2]',
];

const paneHeader = PaneHeader({ id: 'paneHeaderquick-marc-editor-pane' });
const linkHeadingsButton = Button('Link headings');
const arrowDownButton = Button({ icon: 'arrow-down' });
const buttonLink = Button({ icon: 'unlink' });
const deleteFieldsModal = Modal({ id: 'quick-marc-confirm-modal' });
const slowInternetConnectionModal = Modal({ id: 'quick-marc-validation-modal' });
const cancelButtonInDeleteFieldsModal = Button({ id: 'clickable-quick-marc-confirm-modal-cancel' });
const confirmButtonInDeleteFieldsModal = Button({
  id: 'clickable-quick-marc-confirm-modal-confirm',
});
const validationCalloutMainText =
  'Please scroll to view the entire record. Resolve issues as needed and save to revalidate the record.';
const validationFailErrorMessage = 'Record cannot be saved with a fail error.';
const derivePaneHeaderText = /Derive a new .*MARC bib record/;
const searchButtonIn010Field = Button({ ariaLabel: 'search' });
const getTag008BoxErrorText = (boxName) => `Fail: Record cannot be saved. Field 008 contains an invalid value in "${boxName}" position.`;
const tagLengthNumbersOnlyInlineErrorText =
  'Fail: Tag must contain three characters and can only accept numbers 0-9.';
const tagLengthInlineErrorText =
  'Fail: Record cannot be saved. A MARC tag must contain three characters.';
const invalidTagInlineErrorText = 'Fail: Invalid MARC tag. Please try again.';
const tag1XXNonRepeatableRequiredCalloutText = 'Field 1XX is non-repeatable and required.';
const getSubfieldNonRepeatableInlineErrorText = (subfield) => `Fail: Subfield '${subfield}' is non-repeatable.`;
const paneheaderDateFormat = 'M/D/YYYY h:mm A';

const tag008HoldingsBytesProperties = {
  acqStatus: {
    interactor: TextField('AcqStatus'),
    defaultValue: '\\',
    newValue: 'v',
    voidValue: ' ',
    replacedVoidValue: '\\',
  },
  acqMethod: {
    interactor: TextField('AcqMethod'),
    defaultValue: '\\',
    newValue: 'v',
    voidValue: ' ',
    replacedVoidValue: '\\',
  },
  acqEndDate: {
    interactor: TextField('AcqEndDate'),
    defaultValue: '\\\\\\\\',
    newValue: 'vvvv',
    voidValue: '    ',
    replacedVoidValue: '\\\\\\\\',
  },
  genRet: {
    interactor: TextField('Gen ret'),
    defaultValue: '\\',
    newValue: 'v',
    voidValue: 'v',
    replacedVoidValue: 'v',
  },
  specRet0: {
    interactor: TextField('Spec ret', { name: specRetInputNamesHoldings008[0] }),
    defaultValue: 'u',
    newValue: 'v',
    voidValue: 'v',
    replacedVoidValue: 'v',
  },
  specRet1: {
    interactor: TextField('Spec ret', { name: specRetInputNamesHoldings008[1] }),
    defaultValue: 'u',
    newValue: 'v',
    voidValue: 'v',
    replacedVoidValue: 'v',
  },
  specRet2: {
    interactor: TextField('Spec ret', { name: specRetInputNamesHoldings008[2] }),
    defaultValue: 'e',
    newValue: 'v',
    voidValue: 'v',
    replacedVoidValue: 'v',
  },
  compl: {
    interactor: TextField('Compl'),
    defaultValue: 'n',
    newValue: '9',
    voidValue: '9',
    replacedVoidValue: '9',
  },
  copies: {
    interactor: TextField('Copies'),
    defaultValue: 'g\\\\',
    newValue: 'vvv',
    voidValue: 'vvv',
    replacedVoidValue: 'vvv',
  },
  lend: {
    interactor: TextField('Lend'),
    defaultValue: '\\',
    newValue: 'v',
    voidValue: 'v',
    replacedVoidValue: 'v',
  },
  repro: {
    interactor: TextField('Repro'),
    defaultValue: '\\',
    newValue: 'v',
    voidValue: 'v',
    replacedVoidValue: 'v',
  },
  lang: {
    interactor: TextField('Lang'),
    defaultValue: '\\\\\\',
    newValue: 'vvv',
    voidValue: 'vvv',
    replacedVoidValue: 'vvv',
  },
  sepComp: {
    interactor: TextField('Sep/comp'),
    defaultValue: '\\',
    newValue: 'v',
    voidValue: 'v',
    replacedVoidValue: 'v',
  },
  reptDate: {
    interactor: TextField('Rept date'),
    defaultValue: '\\\\\\\\\\\\',
    newValue: 'vvvvvv',
    voidValue: 'vvvvvv',
    replacedVoidValue: 'vvvvvv',
  },
  getUsualProperties: () => {
    return [
      tag008HoldingsBytesProperties.acqStatus,
      tag008HoldingsBytesProperties.acqMethod,
      tag008HoldingsBytesProperties.acqEndDate,
      tag008HoldingsBytesProperties.genRet,
      tag008HoldingsBytesProperties.compl,
      tag008HoldingsBytesProperties.copies,
      tag008HoldingsBytesProperties.lend,
      tag008HoldingsBytesProperties.repro,
      tag008HoldingsBytesProperties.lang,
      tag008HoldingsBytesProperties.sepComp,
      tag008HoldingsBytesProperties.reptDate,
    ];
  },
  getAllProperties: () => {
    return Object.values(tag008HoldingsBytesProperties).filter(
      (objectProperty) => typeof objectProperty !== 'function',
    );
  },
};

const tag008DefaultValues = [
  {
    isSelect: true,
    interactor: Select('Srce'),
    defaultValue: '\\ - National bibliographic agency',
  },
  { isSelect: true, interactor: Select('Audn'), defaultValue: '\\ - Unknown or not specified' },
  { isSelect: false, interactor: TextField('Lang'), defaultValue: '\\\\\\' },
  { isSelect: true, interactor: Select('Form'), defaultValue: '\\ - None of the following' },
  { isSelect: true, interactor: Select('Conf'), defaultValue: '1 - Conference publication' },
  { isSelect: true, interactor: Select('Biog'), defaultValue: '\\ - No biographical material' },
  { isSelect: true, interactor: Select('MRec'), defaultValue: '\\ - Not modified' },
  { isSelect: false, interactor: TextField('Ctry'), defaultValue: '\\\\\\' },
  { isSelect: true, interactor: Select('GPub'), defaultValue: '\\ - Not a government publication' },
  { isSelect: true, interactor: Select('LitF'), defaultValue: 'i - Letters' },
  { isSelect: true, interactor: Select('Indx'), defaultValue: '1 - Index present' },
  { isSelect: true, interactor: Select('Fest'), defaultValue: '1 - Festschrift' },
  { isSelect: true, interactor: Select('DtSt'), defaultValue: 'm - Multiple dates' },
  { isSelect: false, interactor: TextField('Date 1'), defaultValue: '\\\\\\\\' },
  { isSelect: false, interactor: TextField('Date 2'), defaultValue: '\\\\\\\\' },
  {
    isSelect: true,
    interactor: Select('Ills', { name: including('Ills[0]') }),
    defaultValue: '\\ - No illustrations',
  },
  {
    isSelect: true,
    interactor: Select('Ills', { name: including('Ills[1]') }),
    defaultValue: '\\ - No illustrations',
  },
  {
    isSelect: true,
    interactor: Select('Ills', { name: including('Ills[2]') }),
    defaultValue: '\\ - No illustrations',
  },
  {
    isSelect: true,
    interactor: Select('Ills', { name: including('Ills[3]') }),
    defaultValue: '\\ - No illustrations',
  },
  {
    isSelect: true,
    interactor: Select('Cont', { name: including('Cont[0]') }),
    defaultValue: '\\ - No specified nature of contents',
  },
  {
    isSelect: true,
    interactor: Select('Cont', { name: including('Cont[1]') }),
    defaultValue: '\\ - No specified nature of contents',
  },
  {
    isSelect: true,
    interactor: Select('Cont', { name: including('Cont[2]') }),
    defaultValue: '\\ - No specified nature of contents',
  },
  {
    isSelect: true,
    interactor: Select('Cont', { name: including('Cont[3]') }),
    defaultValue: '\\ - No specified nature of contents',
  },
];

const defaultFieldValues = {
  content: 'qwe',
  subfieldPrefixInEditor: '$',
  subfieldPrefixInSource: '$',
  // just enumerate a few free to use tags  which can be applyied in test one by one with small reserve
  freeTags: ['996', '997', '998'],
  existingLocation: '$b E',
};
defaultFieldValues.initialSubField = `${defaultFieldValues.subfieldPrefixInEditor}a `;
defaultFieldValues.contentWithSubfield = `${defaultFieldValues.initialSubField}${defaultFieldValues.content}`;
defaultFieldValues.getSourceContent = (contentInQuickMarcEditor) => contentInQuickMarcEditor.replace(
  defaultFieldValues.subfieldPrefixInEditor,
  defaultFieldValues.subfieldPrefixInSource,
);

const requiredRowsTags = ['LDR', '001', '005', '008', '999'];
const readOnlyAuthorityTags = ['LDR', '001', '005', '999'];
const readOnlyHoldingsTags = ['001', '004', '005', '999'];

const getRowInteractorByRowNumber = (specialRowNumber) => QuickMarcEditor().find(QuickMarcEditorRow({ index: specialRowNumber }));
const getRowInteractorByTagName = (tagName) => QuickMarcEditor().find(QuickMarcEditorRow({ tagValue: tagName }));

const tag008DefaultValuesHoldings = [
  { interactor: TextField('AcqStatus'), defaultValue: '\\' },
  { interactor: TextField('AcqMethod'), defaultValue: '\\' },
  { interactor: TextField('AcqEndDate'), defaultValue: '\\\\\\\\' },
  { interactor: TextField('Gen ret'), defaultValue: '\\' },
  {
    interactor: TextField('Spec ret', { name: 'records[4].content.Spec ret[0]' }),
    defaultValue: '\\',
  },
  {
    interactor: TextField('Spec ret', { name: 'records[4].content.Spec ret[1]' }),
    defaultValue: '\\',
  },
  {
    interactor: TextField('Spec ret', { name: 'records[4].content.Spec ret[2]' }),
    defaultValue: '\\',
  },
  { interactor: TextField('Compl'), defaultValue: '\\' },
  { interactor: TextField('Copies'), defaultValue: '\\\\\\' },
  { interactor: TextField('Lend'), defaultValue: '\\' },
  { interactor: TextField('Repro'), defaultValue: '\\' },
  { interactor: TextField('Lang'), defaultValue: '\\\\\\' },
  { interactor: TextField('Sep/comp'), defaultValue: '\\' },
  { interactor: TextField('Rept date'), defaultValue: '\\\\\\\\\\\\' },
];

const tagBox = TextField({ name: including('.tag') });
const firstIndicatorBox = TextField({ name: including('.indicators[0]') });
const secondIndicatorBox = TextField({ name: including('.indicators[1]') });
const fourthBox = TextArea({ name: including('.content') });
const fourthBoxInLinkedField = TextArea({ name: including('.subfieldGroups.controlled') });
const fifthBoxInLinkedField = TextArea({ name: including('.subfieldGroups.uncontrolledAlpha') });
const sixthBoxInLinkedField = TextArea({ name: including('.subfieldGroups.zeroSubfield') });
const seventhBoxInLinkedField = TextArea({ name: including('.subfieldGroups.uncontrolledNumber') });

const default008BoxesHoldings = [
  TextField('AcqStatus'),
  TextField('AcqMethod'),
  TextField('AcqEndDate'),
  TextField('Gen ret'),
  TextField('Spec ret', { name: including('Spec ret[0]') }),
  TextField('Spec ret', { name: including('Spec ret[1]') }),
  TextField('Spec ret', { name: including('Spec ret[2]') }),
  TextField('Compl'),
  TextField('Copies'),
  TextField('Lend'),
  TextField('Repro'),
  TextField('Lang'),
  TextField('Sep/comp'),
  TextField('Rept date'),
];

const holdingsLocationLink = Button('Permanent location look-up');
const holdingsLocationModal = Modal('Select permanent location');
const holdingsLocationInstitutionSelect = holdingsLocationModal.find(Select('Institution'));
const holdingsLocationCampusSelect = holdingsLocationModal.find(Select('Campus'));
const holdingsLocationLibrarySelect = holdingsLocationModal.find(Select('Library'));
const holdingsLocationSelect = holdingsLocationModal.find(
  Button({ name: 'locationId', disabled: false }),
);
const holdingsLocationOption = '[data-test-selection-option-segment="true"]';
const holdingsLocationSelectDisabled = holdingsLocationModal.find(
  Button({ name: 'locationId', disabled: true }),
);
const holdingsLocationSaveButton = holdingsLocationModal.find(Button('Save & close'));
const defaultValidLdr = '00000naa\\a2200000uu\\4500';
const defaultValidHoldingsLdr = '00000nu\\\\\\2200000un\\4500';
const defaultValid008Values = {
  Type: '\\',
  BLvl: '\\',
  DtSt: '\\',
  Date1: '\\\\\\\\',
  Date2: '\\\\\\\\',
  Ctry: '\\\\\\',
  Lang: '\\\\\\',
  MRec: '\\',
  Srce: '\\',
  Ills: ['\\', '\\', '\\', '\\'],
  Audn: '\\',
  Form: '\\',
  Cont: ['\\', '\\', '\\', '\\'],
  GPub: '\\',
  Conf: '\\',
  Fest: '\\',
  Indx: '\\',
  LitF: '\\',
  Biog: '\\',
};
const valid008ValuesInstance = {
  ...defaultValid008Values,
  Type: 'a',
  DtSt: 'm',
  Conf: '1',
  Fest: '1',
  Indx: '1',
  LitF: 'i',
};
const defaultValid008HoldingsValues = {
  AcqEndDate: '\\\\\\\\',
  AcqMethod: '\\',
  AcqStatus: '\\',
  Compl: '\\',
  Copies: '\\\\\\',
  'Gen ret': '\\',
  Lang: '\\\\\\',
  Lend: '\\',
  Repro: '\\',
  'Rept date': '\\\\\\\\\\\\',
  'Sep/comp': '\\',
  'Spec ret': ['\\', '\\', '\\'],
};
const fieldLDR = QuickMarcEditorRow({ tagValue: 'LDR' });
const ldrFields = [
  { label: 'Status', type: 'select', name: 'records[0].content.Status' },
  { label: 'Ctrl', type: 'select', name: 'records[0].content.Ctrl' },
  { label: 'ELvl', type: 'input', name: 'records[0].content.ELvl' },
  { label: 'Desc', type: 'select', name: 'records[0].content.Desc' },
  { label: 'MultiLvl', type: 'select', name: 'records[0].content.MultiLvl' },
];
const authoritySubfieldsDefault = [
  {
    ruleId: '8',
    ruleSubfields: [
      'a',
      'b',
      'c',
      'd',
      'g',
      'j',
      'q',
      'f',
      'h',
      'k',
      'l',
      'm',
      'n',
      'o',
      'p',
      'r',
      's',
      't',
    ],
  },
  {
    ruleId: '9',
    ruleSubfields: ['a', 'b', 'c', 'd', 'g', 'f', 'h', 'k', 'l', 'm', 'n', 'o', 'p', 'r', 's', 't'],
  },
  {
    ruleId: '10',
    ruleSubfields: ['a', 'c', 'e', 'q', 'f', 'h', 'k', 'l', 'p', 's', 't', 'd', 'g', 'n'],
  },
  {
    ruleId: '11',
    ruleSubfields: ['a', 'd', 'f', 'g', 'h', 'k', 'l', 'm', 'n', 'o', 'p', 'r', 's', 't'],
  },
  {
    ruleId: '12',
    ruleSubfields: ['a', 'b', 'g'],
  },
  {
    ruleId: '13',
    ruleSubfields: ['a', 'g'],
  },
  {
    ruleId: '14',
    ruleSubfields: ['a'],
  },
];

export default {
  defaultValidLdr,
  defaultValidHoldingsLdr,
  defaultValid008Values,
  valid008ValuesInstance,
  defaultValid008HoldingsValues,
  getTag008BoxErrorText,
  tagLengthNumbersOnlyInlineErrorText,
  tag1XXNonRepeatableRequiredCalloutText,
  getSubfieldNonRepeatableInlineErrorText,
  tagLengthInlineErrorText,
  invalidTagInlineErrorText,

  getInitialRowsCount() {
    return validRecord.lastRowNumber;
  },

  addNewField(
    tag = defaultFieldValues.freeTags[0],
    fieldContent = defaultFieldValues.content,
    rowNumber,
  ) {
    this.addRow(rowNumber);
    return this.fillAllAvailableValues(fieldContent, tag, rowNumber);
  },

  addNewFieldWithSubField(tag) {
    return this.addNewField(tag, defaultFieldValues.contentWithSubfield);
  },

  addEmptyFields(rowIndex) {
    cy.do(QuickMarcEditorRow({ index: rowIndex }).find(addFieldButton).click());
  },

  addValuesToExistingField(rowIndex, tag, content, indicator0 = '\\', indicator1 = '\\') {
    cy.do([
      QuickMarcEditorRow({ index: rowIndex + 1 })
        .find(TextField({ name: `records[${rowIndex + 1}].tag` }))
        .fillIn(tag),
      QuickMarcEditorRow({ index: rowIndex + 1 })
        .find(TextField({ name: `records[${rowIndex + 1}].indicators[0]` }))
        .fillIn(indicator0),
      QuickMarcEditorRow({ index: rowIndex + 1 })
        .find(TextField({ name: `records[${rowIndex + 1}].indicators[1]` }))
        .fillIn(indicator1),
      QuickMarcEditorRow({ index: rowIndex + 1 })
        .find(TextArea({ name: `records[${rowIndex + 1}].content` }))
        .fillIn(content),
    ]);
  },

  fillInFieldValues(rowIndex, tag, content, indicator0, indicator1) {
    cy.get(`textarea[name="records[${rowIndex}].content"]`).clear().type(content);
    cy.get(`input[name="records[${rowIndex}].indicators[1]"]`).type(indicator1);
    cy.get(`input[name="records[${rowIndex}].indicators[0]"]`).type(indicator0);
    cy.get(`input[name="records[${rowIndex}].tag"]`).type(tag);
  },

  deletePenaltField() {
    const shouldBeRemovedRowNumber = 16;
    cy.expect(getRowInteractorByRowNumber(shouldBeRemovedRowNumber).exists());
    cy.then(() => QuickMarcEditor().presentedRowsProperties()).then((presentedRowsProperties) => {
      const shouldBeDeletedRowTag = presentedRowsProperties[shouldBeRemovedRowNumber].tag;
      cy.do(getRowInteractorByRowNumber(shouldBeRemovedRowNumber).find(deleteFieldButton).click());
      cy.wrap(shouldBeDeletedRowTag).as('specialTag');
    });
    return cy.get('@specialTag');
  },

  cancelDeletingField: () => {
    cy.do(deleteFieldsModal.find(cancelButtonInDeleteFieldsModal).click());
    cy.expect(deleteFieldsModal.absent());
  },

  checkDeletingFieldsModal: () => {
    cy.expect([
      deleteFieldsModal.exists(),
      deleteFieldsModal.find(cancelButtonInDeleteFieldsModal).exists(),
      deleteFieldsModal.find(confirmButtonInDeleteFieldsModal).exists(),
    ]);
  },

  pressSaveAndClose() {
    cy.do(saveAndCloseButton.click());
  },

  saveAndCloseWithValidationWarnings({
    acceptLinkedBibModal = false,
    acceptDeleteModal = false,
  } = {}) {
    cy.intercept('POST', '/records-editor/validate').as('validateRequest');
    cy.do(saveAndCloseButton.click());
    cy.wait('@validateRequest', { timeout: 10_000 }).its('response.statusCode').should('eq', 200);

    this.closeAllCallouts();
    cy.expect(saveAndCloseButton.is({ disabled: false }));

    cy.intercept({ method: /PUT|POST/, url: /\/records-editor\/records(\/.*)?$/ }).as(
      'saveRecordRequest',
    );
    cy.wait(1000);
    cy.do(saveAndCloseButton.click());

    if (acceptLinkedBibModal) {
      cy.expect([updateLinkedBibFieldsModal.exists(), saveButton.exists()]);
      cy.do(saveButton.click());
    }
    if (acceptDeleteModal) {
      this.deleteConfirmationPresented();
      this.confirmDelete();
    }

    cy.wait('@saveRecordRequest', { timeout: 13_000 })
      .its('response.statusCode')
      .should('be.oneOf', [201, 202]);
  },

  saveAndKeepEditingWithValidationWarnings() {
    cy.intercept('POST', '/records-editor/validate').as('validateRequest');
    cy.do(saveAndKeepEditingBtn.click());
    cy.wait('@validateRequest', { timeout: 5_000 }).its('response.statusCode').should('eq', 200);
    this.closeAllCallouts();
    cy.expect(saveAndKeepEditingBtn.is({ disabled: false }));
    cy.do(saveAndKeepEditingBtn.click());
  },

  saveAndCloseAfterFieldDelete() {
    cy.intercept('POST', '/records-editor/validate').as('validateRequest');
    cy.do(saveAndCloseButton.click());
    cy.wait('@validateRequest', { timeout: 5_000 }).its('response.statusCode').should('eq', 200);
    this.closeAllCallouts();
    cy.wait(1000);
    cy.do([saveAndCloseButton.click(), continueWithSaveButton.click()]);
  },

  pressSaveAndKeepEditing(calloutMsg) {
    cy.do(saveAndKeepEditingBtn.click());
    cy.expect(Callout(including(calloutMsg)).exists());
  },

  verifyAreYouSureModal(content) {
    cy.expect(
      updateLinkedBibFieldsModal.has({
        content: including('Are you sure?'),
      }),
      updateLinkedBibFieldsModal.has({
        content: including(content),
      }),
    );
  },

  restoreDeletedFields: () => {
    cy.do(deleteFieldsModal.find(cancelButtonInDeleteFieldsModal).click());
  },

  confirmDeletingFields: () => {
    cy.do(deleteFieldsModal.find(confirmButtonInDeleteFieldsModal).click());
  },

  pressCancel() {
    cy.do(cancelButton.click());
  },

  clickSaveAndCloseThenCheck(records) {
    cy.wait(1000);
    cy.do(saveAndCloseButton.click());
    cy.expect([
      confirmationModal.exists(),
      confirmationModal.has({
        content: including(
          `By selecting Continue with save, then ${records} field(s) will be deleted and this record will be updated. Are you sure you want to continue?`,
        ),
      }),
      continueWithSaveButton.exists(),
      restoreDeletedFieldsBtn.exists(),
    ]);
  },

  clickRestoreDeletedField() {
    cy.do(restoreDeletedFieldsBtn.click());
  },

  clickLinkIconInTagField(rowIndex) {
    cy.do(QuickMarcEditorRow({ index: rowIndex }).find(linkToMarcRecordButton).click());
  },

  clickLinkIconInTagFieldByTag(tag) {
    cy.do(QuickMarcEditorRow({ tagValue: tag }).find(linkToMarcRecordButton).click());
  },

  clickLinkHeadingsButton() {
    cy.do(paneHeader.find(linkHeadingsButton).click());
  },

  checkLinkHeadingsButton() {
    cy.expect(paneHeader.find(linkHeadingsButton).exists());
  },

  verifyEnabledLinkHeadingsButton() {
    cy.expect(paneHeader.find(linkHeadingsButton).has({ disabled: false }));
  },

  verifyOnlyOne001FieldAreDisplayed() {
    cy.expect(TextField({ name: 'records[2].tag' })).not.equal('001');
  },

  verifyDisabledLinkHeadingsButton() {
    cy.expect(paneHeader.find(linkHeadingsButton).has({ disabled: true }));
  },

  clickArrowDownButton(rowIndex) {
    cy.do(QuickMarcEditorRow({ index: rowIndex }).find(arrowDownButton).click());
  },

  moveFieldDownWithEnter(rowNumber) {
    cy.get(`button[aria-labelledby="moving-row-move-down-${rowNumber}-text"]`)
      .blur()
      .type('{enter}');
  },

  verifyAfterMovingFieldDown(newRowNumber, tag, content) {
    cy.expect(QuickMarcEditorRow({ index: newRowNumber }).find(TextArea()).has({ value: content }));
    cy.expect(QuickMarcEditorRow({ index: newRowNumber }).find(tagBox).has({ value: tag }));
    cy.expect(Tooltip().has({ text: 'Move field down a row' }));
    cy.expect(
      QuickMarcEditorRow({ index: newRowNumber }).find(arrowDownButton).has({ focused: true }),
    );
  },

  verifyAfterMovingFieldDownLastEditableRow(newRowNumber, tag, content) {
    cy.expect(QuickMarcEditorRow({ index: newRowNumber }).find(TextArea()).has({ value: content }));
    cy.expect(QuickMarcEditorRow({ index: newRowNumber }).find(tagBox).has({ value: tag }));
    cy.expect(Tooltip().has({ text: 'Move field up a row' }));
    cy.expect(QuickMarcEditorRow({ index: newRowNumber }).find(arrowDownButton).absent());
    cy.expect(
      QuickMarcEditorRow({ index: newRowNumber }).find(arrowUpButton).has({ focused: true }),
    );
  },

  moveCursorToTagBox(rowNumber) {
    cy.do(QuickMarcEditorRow({ index: rowNumber }).find(tagBox).focus());
    cy.expect(QuickMarcEditorRow({ index: rowNumber }).find(tagBox).has({ focused: true }));
  },

  verifyTagBoxIsFocused(rowNumber) {
    cy.expect(QuickMarcEditorRow({ index: rowNumber }).find(tagBox).has({ focused: true }));
  },

  verifyDeleteButtonInFocus(rowNumber) {
    cy.expect(
      QuickMarcEditorRow({ index: rowNumber }).find(deleteFieldButton).has({ focused: true }),
    );
  },

  verifyContentBoxIsFocused(tag) {
    cy.expect(QuickMarcEditorRow({ tagValue: tag }).find(fourthBox).has({ focused: true }));
  },

  movetoFourthBoxUsingTab(rowNumber) {
    cy.get(`[name="records[${rowNumber}].tag"]`).tab().tab().tab();
    cy.expect(QuickMarcEditorRow({ index: rowNumber }).find(fourthBox).has({ focused: true }));
  },

  setRulesForField(tag, isEnabled) {
    cy.getAllRulesViaApi()
      .then((body) => {
        const ruleIds = [];
        body.filter((rule) => {
          return rule.bibField === `${tag}` && ruleIds.push(rule.id);
        });
        return ruleIds;
      })
      .then((ruleIds) => {
        ruleIds.forEach((ruleId) => {
          cy.setRulesForFieldViaApi(ruleId, isEnabled);
        });
        return cy.wrap(ruleIds);
      })
      .then((ruleIds) => {
        recurse(
          () => {
            return cy.getAllRulesViaApi();
          },
          (body) => {
            const currentStatuses = body
              .filter((rule) => ruleIds.includes(rule.id))
              .map((rule) => rule.autoLinkingEnabled);
            return currentStatuses.every((status) => status === isEnabled);
          },
          {
            timeout: 30 * 1000,
            delay: 1000,
          },
        );
      });
  },

  setAuthoritySubfieldsViaApi(ruleId, ruleSubfields) {
    cy.setAuthoritySubfieldsViaApi(ruleId, ruleSubfields);
  },

  setAuthoritySubfieldsDefault() {
    authoritySubfieldsDefault.forEach((tag) => {
      cy.setAuthoritySubfieldsViaApi(tag.ruleId, tag.ruleSubfields);
    });
  },

  checkAbsenceOfLinkHeadingsButton() {
    cy.expect(paneHeader.find(linkHeadingsButton).absent());
  },

  clickUnlinkIconInTagField(rowIndex) {
    cy.do(QuickMarcEditorRow({ index: rowIndex }).find(unlinkIconButton).click());
    cy.expect(unlinkModal.exists());
  },
  clickUnlinkIconInFieldByTag(tag) {
    cy.do(QuickMarcEditorRow({ tagValue: tag }).find(unlinkIconButton).click());
    cy.expect(unlinkModal.exists());
  },
  clickViewMarcAuthorityIconInTagField(rowIndex) {
    cy.get(`div[class*=quickMarcEditorRow][data-row="record-row[${rowIndex}]"]`)
      .find('a')
      .invoke('removeAttr', 'target')
      .click();
    cy.wait(2000);
    cy.expect(Pane({ id: 'marc-view-pane' }).exists());
  },

  confirmUnlinkingField() {
    cy.do(unlinkModal.find(unlinkButtonInsideModal).click());
    cy.expect(Spinner().absent());
  },

  cancelUnlinkingField() {
    cy.do(unlinkModal.find(cancelUnlinkButtonInsideModal).click());
  },

  checkUnlinkModal(tag) {
    cy.expect([
      unlinkModal.exists(),
      unlinkButtonInsideModal.exists(),
      cancelUnlinkButtonInsideModal.exists(),
      unlinkModal.has({
        message: `By selecting Unlink, then field ${tag} will be unlinked from the MARC authority record. Are you sure you want to continue?`,
      }),
    ]);
  },

  cancelEditConfirmationPresented(isPresented = true) {
    if (isPresented) {
      cy.expect([
        cancelEditConformModel.exists(),
        closeWithoutSavingBtn.exists(),
        cancelEditConfirmBtn.exists(),
      ]);
    } else cy.expect(cancelEditConformModel.absent());
  },

  confirmEditCancel() {
    cy.do(cancelEditConfirmBtn.click());
  },

  cancelEditConformation() {
    cy.expect(cancelEditConformModel.exists());
    cy.do(cancelEditConfirmBtn.click());
  },

  closeWithoutSavingInEditConformation() {
    cy.expect(cancelEditConformModel.exists());
    cy.do(closeWithoutSavingBtn.click());
  },

  deleteConfirmationPresented() {
    cy.expect(confirmationModal.exists());
  },

  confirmDelete() {
    cy.do(continueWithSaveButton.click());
  },

  constinueWithSaveAndCheck() {
    cy.do(continueWithSaveButton.click());
    cy.expect([calloutUpdatedRecord.exists(), rootSection.absent(), viewMarcSection.exists()]);
  },

  constinueWithSaveAndCheckInstanceRecord() {
    cy.do(continueWithSaveButton.click());
    cy.expect([
      calloutAfterSaveAndClose.exists(),
      rootSection.absent(),
      instanceDetailsPane.exists(),
    ]);
  },

  continueWithSaveAndCheckNewInstanceCreated() {
    cy.do(continueWithSaveButton.click());
    cy.expect([
      calloutOnDeriveFirst.exists(),
      calloutOnDeriveSecond.exists(),
      rootSection.absent(),
    ]);
  },

  saveAndCloseUpdatedLinkedBibField() {
    cy.do(saveAndCloseButton.click());
    cy.expect([updateLinkedBibFieldsModal.exists(), saveButton.exists()]);
  },

  saveAndCheck() {
    cy.do(saveButton.click());
    cy.expect([
      calloutUpdatedLinkedBibRecord.exists(),
      rootSection.absent(),
      viewMarcSection.exists(),
    ]);
  },

  simulateSlowNetwork(urlPattern, delayMs = 5000) {
    cy.intercept('POST', urlPattern, (req) => {
      req.reply((res) => {
        return new Promise((resolve) => setTimeout(() => resolve(res), delayMs));
      });
    }).as('slowNetworkRequest');
  },

  closeEditorPane() {
    cy.do(PaneHeader().find(closeButton).click());
    cy.expect([rootSection.absent(), instanceDetailsPane.exists()]);
  },

  closeAuthorityEditorPane() {
    cy.do(PaneHeader().find(closeButton).click());
    cy.expect([rootSection.absent(), viewMarcSection.exists()]);
  },

  checkFieldAbsense(tag) {
    cy.expect(PaneContent({ id: 'marc-view-pane-content', text: including(tag) }).absent());
  },

  addRow(rowNumber) {
    cy.do(
      getRowInteractorByRowNumber(rowNumber ?? this.getInitialRowsCount())
        .find(addFieldButton)
        .click(),
    );
  },

  clickSaveAndKeepEditing() {
    cy.do(saveAndKeepEditingBtn.click());
    cy.expect(calloutAfterSaveAndClose.exists());
    cy.expect(rootSection.exists());
  },

  deleteFieldAndCheck(rowIndex, tag) {
    cy.do(QuickMarcEditorRow({ index: rowIndex }).find(deleteFieldButton).click());
    cy.expect(QuickMarcEditorRow({ tagValue: tag }).absent());
  },

  deleteField(rowIndex) {
    cy.do(QuickMarcEditorRow({ index: rowIndex }).find(deleteFieldButton).click());
  },

  deleteFieldByTagAndCheck: (tag) => {
    cy.do(QuickMarcEditorRow({ tagValue: tag }).find(deleteFieldButton).click());
    cy.expect(QuickMarcEditorRow({ tagValue: tag }).absent());
  },

  verifySaveAndCloseButtonEnabled(isEnabled = true) {
    cy.expect(saveAndCloseButton.is({ disabled: !isEnabled }));
  },

  verifySaveAndCloseButtonDisabled() {
    cy.expect(saveAndCloseButton.is({ disabled: true }));
  },

  verifySaveAndKeepEditingButtonEnabled() {
    cy.expect(saveAndKeepEditingBtn.is({ disabled: false }));
  },

  verifySaveAndKeepEditingButtonDisabled() {
    cy.expect(saveAndKeepEditingBtn.is({ disabled: true }));
  },

  deleteFieldWithEnter(rowNumber) {
    cy.get(`button[aria-labelledby="actions-delete-field-${rowNumber}-text"]`)
      .blur()
      .type('{enter}');
  },

  checkAfterDeleteField(tag) {
    cy.expect(QuickMarcEditorRow({ tagValue: tag }).absent());
    cy.expect(Tooltip().has({ text: 'Delete this field' }));
  },

  checkDeleteThisFieldHoverText() {
    cy.expect(Tooltip().has({ text: 'Delete this field' }));
  },

  checkAfterDeleteLastEditableField(tag) {
    cy.expect(QuickMarcEditorRow({ tagValue: tag }).absent());
    cy.expect(Tooltip().has({ text: 'Move field up a row' }));
  },

  afterDeleteNotification(tag) {
    if (tag) {
      cy.expect(
        rootSection
          .find(HTML(including(`Field ${tag} has been deleted from this MARC record.`)))
          .exists(),
      );
    } else {
      cy.expect(
        rootSection.find(HTML(including('Field has been deleted from this MARC record.'))).exists(),
      );
    }
    cy.get('[class^=deletedRowPlaceholder-]').contains('span', 'Undo');
  },

  undoDelete() {
    cy.get('[class^=deletedRowPlaceholder-]').each(($placeholder) => {
      cy.wrap($placeholder).within(() => {
        cy.contains('span', 'Undo').click();
      });
    });
  },

  checkUndoDeleteAbsent() {
    cy.get('#quick-marc-editor-pane').find('[class^=deletedRowPlaceholder-]').should('not.exist');
  },

  afterDeleteNotificationNoTag() {
    cy.get('[class^=deletedRowPlaceholder-]').should(
      'include.text',
      'Field has been deleted from this MARC record',
    );
    cy.get('[class^=deletedRowPlaceholder-]').contains('span', 'Undo');
  },

  checkButtonsEnabled() {
    cy.expect([saveAndCloseButtonEnabled.exists(), saveAndKeepEditingBtnEnabled.exists()]);
  },

  checkButtonsDisabled() {
    cy.expect([saveAndCloseButtonDisabled.exists(), saveAndKeepEditingBtnDisabled.exists()]);
  },

  checkAfterSaveAndClose() {
    cy.expect([calloutAfterSaveAndClose.exists(), instanceDetailsPane.exists()]);
  },
  checkAfterSaveAndCloseAndReturnHoldingsDetailsPage() {
    cy.expect(calloutAfterSaveAndClose.exists());
    Button({ icon: 'times' }).click();
    cy.expect([holdingsRecordViewSection.exists(), actionsButton.exists()]);
  },
  verifyAfterDerivedMarcBibSave() {
    cy.expect([
      calloutOnDeriveFirst.exists(),
      calloutOnDeriveSecond.exists(),
      instanceDetailsPane.exists(),
      rootSection.absent(),
    ]);
  },

  verifyDerivedMarcBibSave() {
    cy.expect(calloutOnDeriveFirst.exists());
  },

  verifyConfirmModal() {
    cy.expect(confirmationModal.exists());
    cy.expect(
      confirmationModal.has({
        content: including(
          'By selecting Continue with save, then 1 field(s) will be deleted and this record will be updated. Are you sure you want to continue?',
        ),
      }),
    );
    cy.expect(continueWithSaveButton.exists());
    cy.expect(restoreDeletedFieldsBtn.exists());
  },

  checkInitialContent(rowNumber) {
    cy.expect(
      getRowInteractorByRowNumber(rowNumber ?? this.getInitialRowsCount() + 1)
        .find(TextArea({ name: `records[${rowNumber ?? this.getInitialRowsCount() + 1}].content` }))
        .has({ value: defaultFieldValues.initialSubField }),
    );
  },

  checkContent(content, rowNumber) {
    cy.expect(
      getRowInteractorByRowNumber(rowNumber ?? this.getInitialRowsCount() + 1)
        .find(TextArea({ name: `records[${rowNumber ?? this.getInitialRowsCount() + 1}].content` }))
        .has({ value: content ?? defaultFieldValues.contentWithSubfield }),
    );
  },

  checkContentByTag1(content, tag) {
    cy.expect(
      QuickMarcEditorRow({ tagValue: tag })
        .find(TextArea())
        .has({ value: content ?? defaultFieldValues.contentWithSubfield }),
    );
  },

  checkContentByTag(tagName, content) {
    cy.expect(
      getRowInteractorByTagName(tagName)
        .find(TextArea({ name: including('.content') }))
        .has({ value: content }),
    );
  },

  verifyEditableFieldIcons(
    rowNumber,
    isArrowUpButtonShown,
    isArrowDownButtonShown,
    isDeleteFieldButtonShown = true,
    isAddFieldButtonShown = true,
  ) {
    if (isArrowUpButtonShown) {
      cy.expect(QuickMarcEditorRow({ index: rowNumber }).find(arrowUpButton).exists());
    } else {
      cy.expect(QuickMarcEditorRow({ index: rowNumber }).find(arrowUpButton).absent());
    }
    if (isArrowDownButtonShown) {
      cy.expect(QuickMarcEditorRow({ index: rowNumber }).find(arrowDownButton).exists());
    } else {
      cy.expect(QuickMarcEditorRow({ index: rowNumber }).find(arrowDownButton).absent());
    }
    if (isAddFieldButtonShown) {
      cy.expect(QuickMarcEditorRow({ index: rowNumber }).find(addFieldButton).exists());
    } else {
      cy.expect(QuickMarcEditorRow({ index: rowNumber }).find(addFieldButton).absent());
    }
    if (isDeleteFieldButtonShown) {
      cy.expect(QuickMarcEditorRow({ index: rowNumber }).find(deleteFieldButton).exists());
    } else {
      cy.expect(QuickMarcEditorRow({ index: rowNumber }).find(deleteFieldButton).absent());
    }
  },

  moveFieldUp(rowNumber) {
    cy.do(QuickMarcEditorRow({ index: rowNumber }).find(arrowUpButton).click());
  },

  moveFieldDown(rowNumber) {
    cy.do(QuickMarcEditorRow({ index: rowNumber }).find(arrowDownButton).click());
  },

  moveFieldUpWithEnter(rowNumber) {
    cy.get(`button[aria-labelledby="moving-row-move-up-${rowNumber}-text"]`).blur().type('{enter}');
  },

  verifyAfterMovingFieldUp(newRowNumber, tag, content) {
    cy.expect(QuickMarcEditorRow({ index: newRowNumber }).find(TextArea()).has({ value: content }));
    cy.expect(QuickMarcEditorRow({ index: newRowNumber }).find(tagBox).has({ value: tag }));
    cy.expect(Tooltip().has({ text: 'Move field up a row' }));
    cy.expect(
      QuickMarcEditorRow({ index: newRowNumber }).find(arrowUpButton).has({ focused: true }),
    );
  },

  verifyAfterMovingFieldUpFirstEditableRow(newRowNumber, tag, content) {
    cy.expect(QuickMarcEditorRow({ index: newRowNumber }).find(TextArea()).has({ value: content }));
    cy.expect(QuickMarcEditorRow({ index: newRowNumber }).find(tagBox).has({ value: tag }));
    cy.expect(Tooltip().has({ text: 'Move field down a row' }));
    cy.expect(QuickMarcEditorRow({ index: newRowNumber }).find(arrowUpButton).absent());
    cy.expect(
      QuickMarcEditorRow({ index: newRowNumber }).find(arrowDownButton).has({ focused: true }),
    );
  },

  checkFieldContentMatch(selector, regExp) {
    cy.get(selector)
      .invoke('val')
      .then((text) => {
        expect(text).to.match(regExp);
      });
  },

  checkFieldContentToEqual(selector, fieldContent) {
    cy.get(selector)
      .invoke('val')
      .then((text) => {
        expect(text).to.equal(fieldContent);
      });
  },

  checkEmptyContent(tagName) {
    cy.expect(getRowInteractorByTagName(tagName).find(quickMarcEditorRowContent).exists());
    cy.expect(
      getRowInteractorByTagName(tagName).find(quickMarcEditorRowContent).find(TextField()).absent(),
    );
  },

  verifyAfterLinkingAuthority(tag) {
    cy.expect([
      Callout(`Field ${tag} has been linked to a MARC authority record.`).exists(),
      QuickMarcEditorRow({ tagValue: tag }).find(unlinkIconButton).exists(),
      QuickMarcEditorRow({ tagValue: tag }).find(viewAuthorityIconButton).exists(),
    ]);
  },

  verifyAfterLinkingUsingRowIndex(tag, rowIndex) {
    cy.expect([
      Callout(`Field ${tag} has been linked to a MARC authority record.`).exists(),
      QuickMarcEditorRow({ index: rowIndex }).find(unlinkIconButton).exists(),
      QuickMarcEditorRow({ index: rowIndex }).find(viewAuthorityIconButton).exists(),
    ]);
  },

  verifyUnlinkAndViewAuthorityButtons(rowIndex) {
    cy.expect([
      QuickMarcEditorRow({ index: rowIndex }).find(unlinkIconButton).exists(),
      QuickMarcEditorRow({ index: rowIndex }).find(viewAuthorityIconButton).exists(),
    ]);
  },

  verifyUnlinkAndViewAuthorityButtonsinFieldByTag(tag) {
    cy.expect([
      QuickMarcEditorRow({ tagValue: tag }).find(unlinkIconButton).exists(),
      QuickMarcEditorRow({ tagValue: tag }).find(viewAuthorityIconButton).exists(),
    ]);
  },

  verifyRowLinked(rowIndex, isLinked = true) {
    if (isLinked) {
      cy.expect([
        QuickMarcEditorRow({ index: rowIndex })
          .find(TextArea({ name: `records[${rowIndex}].content` }))
          .absent(),
        QuickMarcEditorRow({ index: rowIndex })
          .find(TextArea({ name: `records[${rowIndex}].subfieldGroups.controlled` }))
          .exists(),
        QuickMarcEditorRow({ index: rowIndex })
          .find(TextArea({ name: `records[${rowIndex}].subfieldGroups.uncontrolledAlpha` }))
          .exists(),
        QuickMarcEditorRow({ index: rowIndex })
          .find(TextArea({ name: `records[${rowIndex}].subfieldGroups.zeroSubfield` }))
          .exists(),
        QuickMarcEditorRow({ index: rowIndex })
          .find(TextArea({ name: `records[${rowIndex}].subfieldGroups.uncontrolledNumber` }))
          .exists(),
        QuickMarcEditorRow({ index: rowIndex }).find(unlinkIconButton).exists(),
        QuickMarcEditorRow({ index: rowIndex }).find(viewAuthorityIconButton).exists(),
        QuickMarcEditorRow({ index: rowIndex }).find(linkToMarcRecordButton).absent(),
        cy.expect(Spinner().absent()),
      ]);
    } else {
      cy.expect([
        QuickMarcEditorRow({ index: rowIndex })
          .find(TextArea({ name: `records[${rowIndex}].content` }))
          .exists(),
        QuickMarcEditorRow({ index: rowIndex })
          .find(TextArea({ name: `records[${rowIndex}].subfieldGroups.controlled` }))
          .absent(),
        QuickMarcEditorRow({ index: rowIndex })
          .find(TextArea({ name: `records[${rowIndex}].subfieldGroups.uncontrolledAlpha` }))
          .absent(),
        QuickMarcEditorRow({ index: rowIndex })
          .find(TextArea({ name: `records[${rowIndex}].subfieldGroups.zeroSubfield` }))
          .absent(),
        QuickMarcEditorRow({ index: rowIndex })
          .find(TextArea({ name: `records[${rowIndex}].subfieldGroups.uncontrolledNumber` }))
          .absent(),
        QuickMarcEditorRow({ index: rowIndex }).find(unlinkIconButton).absent(),
        QuickMarcEditorRow({ index: rowIndex }).find(viewAuthorityIconButton).absent(),
        QuickMarcEditorRow({ index: rowIndex }).find(linkToMarcRecordButton).exists(),
        cy.expect(Spinner().absent()),
      ]);
    }
  },

  verifyTagFieldAfterLinking(
    rowIndex,
    tag,
    secondBox,
    thirdBox,
    content,
    eSubfield,
    zeroSubfield,
    seventhBox,
  ) {
    cy.expect([
      QuickMarcEditorRow({ index: rowIndex })
        .find(TextField({ name: `records[${rowIndex}].tag` }))
        .has({ disabled: true, value: tag }),
      QuickMarcEditorRow({ index: rowIndex })
        .find(TextField({ name: `records[${rowIndex}].indicators[0]` }))
        .has({ disabled: true, value: secondBox }),
      QuickMarcEditorRow({ index: rowIndex })
        .find(TextField({ name: `records[${rowIndex}].indicators[1]` }))
        .has({ disabled: true, value: thirdBox }),
      QuickMarcEditorRow({ index: rowIndex })
        .find(TextArea({ name: `records[${rowIndex}].subfieldGroups.controlled` }))
        .has({ disabled: true, value: content }),
      QuickMarcEditorRow({ index: rowIndex })
        .find(TextArea({ name: `records[${rowIndex}].subfieldGroups.uncontrolledAlpha` }))
        .has({ disabled: false, value: eSubfield }),
      QuickMarcEditorRow({ index: rowIndex })
        .find(TextArea({ name: `records[${rowIndex}].subfieldGroups.zeroSubfield` }))
        .has({ disabled: true, value: zeroSubfield }),
      QuickMarcEditorRow({ index: rowIndex })
        .find(TextArea({ name: `records[${rowIndex}].subfieldGroups.uncontrolledNumber` }))
        .has({ disabled: false, value: seventhBox }),
      QuickMarcEditorRow({ index: rowIndex })
        .find(TextArea({ value: '$9' }))
        .absent(),
    ]);
  },

  verifyTagFieldAfterLinkingByTag(
    tag,
    secondBox,
    thirdBox,
    content,
    eSubfield,
    zeroSubfield,
    seventhBox,
  ) {
    cy.expect([
      QuickMarcEditorRow({ tagValue: tag }).find(tagBox).has({ disabled: true, value: tag }),
      QuickMarcEditorRow({ tagValue: tag })
        .find(firstIndicatorBox)
        .has({ disabled: true, value: secondBox }),
      QuickMarcEditorRow({ tagValue: tag })
        .find(secondIndicatorBox)
        .has({ disabled: true, value: thirdBox }),
      QuickMarcEditorRow({ tagValue: tag })
        .find(fourthBoxInLinkedField)
        .has({ disabled: true, value: content }),
      QuickMarcEditorRow({ tagValue: tag })
        .find(fifthBoxInLinkedField)
        .has({ disabled: false, value: eSubfield }),
      QuickMarcEditorRow({ tagValue: tag })
        .find(sixthBoxInLinkedField)
        .has({ disabled: true, value: zeroSubfield }),
      QuickMarcEditorRow({ tagValue: tag })
        .find(seventhBoxInLinkedField)
        .has({ disabled: false, value: seventhBox }),
      QuickMarcEditorRow({ tagValue: tag })
        .find(TextArea({ value: '$9' }))
        .absent(),
    ]);
  },

  verifyTagFieldAfterUnlinking(rowIndex, tag, secondBox, thirdBox, content) {
    cy.expect([
      QuickMarcEditorRow({ index: rowIndex })
        .find(TextField({ name: `records[${rowIndex}].tag` }))
        .has({ value: tag }),
      QuickMarcEditorRow({ index: rowIndex })
        .find(TextField({ name: `records[${rowIndex}].indicators[0]` }))
        .has({ value: secondBox }),
      QuickMarcEditorRow({ index: rowIndex })
        .find(TextField({ name: `records[${rowIndex}].indicators[1]` }))
        .has({ value: thirdBox }),
      QuickMarcEditorRow({ index: rowIndex })
        .find(TextArea({ name: `records[${rowIndex}].content` }))
        .has({ value: content }),
    ]);
  },

  verifyTagFieldAfterUnlinkingByTag(tag, secondBox, thirdBox, content) {
    cy.expect([
      QuickMarcEditorRow({ tagValue: tag }).find(tagBox).has({ value: tag }),
      QuickMarcEditorRow({ tagValue: tag }).find(firstIndicatorBox).has({ value: secondBox }),
      QuickMarcEditorRow({ tagValue: tag }).find(secondIndicatorBox).has({ value: thirdBox }),
      QuickMarcEditorRow({ tagValue: tag }).find(fourthBox).has({ value: content }),
    ]);
  },

  verifyTagFieldNotLinked(rowIndex, tag, secondBox, thirdBox, content) {
    cy.expect([
      QuickMarcEditorRow({ index: rowIndex })
        .find(TextField({ name: `records[${rowIndex}].tag` }))
        .has({ value: tag }),
      QuickMarcEditorRow({ index: rowIndex })
        .find(TextField({ name: `records[${rowIndex}].indicators[0]` }))
        .has({ value: secondBox }),
      QuickMarcEditorRow({ index: rowIndex })
        .find(TextField({ name: `records[${rowIndex}].indicators[1]` }))
        .has({ value: thirdBox }),
      QuickMarcEditorRow({ index: rowIndex })
        .find(TextArea({ name: `records[${rowIndex}].content` }))
        .has({ value: including(content) }),
      QuickMarcEditorRow({ index: rowIndex })
        .find(TextArea({ name: `records[${rowIndex}].subfieldGroups.controlled` }))
        .absent(),
      QuickMarcEditorRow({ index: rowIndex })
        .find(TextArea({ name: `records[${rowIndex}].subfieldGroups.uncontrolledAlpha` }))
        .absent(),
      QuickMarcEditorRow({ index: rowIndex })
        .find(TextArea({ name: `records[${rowIndex}].subfieldGroups.zeroSubfield` }))
        .absent(),
      QuickMarcEditorRow({ index: rowIndex })
        .find(TextArea({ name: `records[${rowIndex}].subfieldGroups.uncontrolledNumber` }))
        .absent(),
      QuickMarcEditorRow({ index: rowIndex }).find(linkToMarcRecordButton).exists(),
    ]);
  },

  verifyTagField(rowIndex, tag, secondBox, thirdBox, subfieldS, subfieldI) {
    cy.expect([
      QuickMarcEditorRow({ index: rowIndex })
        .find(TextField({ name: `records[${rowIndex}].tag` }))
        .has({ value: tag }),
      QuickMarcEditorRow({ index: rowIndex })
        .find(TextField({ name: `records[${rowIndex}].indicators[0]` }))
        .has({ value: secondBox }),
      QuickMarcEditorRow({ index: rowIndex })
        .find(TextField({ name: `records[${rowIndex}].indicators[1]` }))
        .has({ value: thirdBox }),
      QuickMarcEditorRow({ index: rowIndex })
        .find(TextArea({ name: `records[${rowIndex}].content` }))
        .has({ value: including(subfieldS) }),
      QuickMarcEditorRow({ index: rowIndex })
        .find(TextArea({ name: `records[${rowIndex}].content` }))
        .has({ value: including(subfieldI) }),
    ]);
  },

  updateLinkedFifthBox(rowIndex, updatedValue) {
    cy.do([
      QuickMarcEditorRow({ index: rowIndex })
        .find(TextArea({ name: `records[${rowIndex}].subfieldGroups.uncontrolledAlpha` }))
        .fillIn(`${updatedValue}`),
    ]);
  },

  fillAllAvailableValues(fieldContent, tag, initialRowsCount = validRecord.lastRowNumber) {
    const contentTextArea = TextArea({ name: `records[${initialRowsCount + 1}].content` });
    const tagTextField = TextField({ name: `records[${initialRowsCount + 1}].tag` });
    const separator = '\t   \t';
    const tagValue = tag ?? defaultFieldValues.freeTags[0];
    const content = fieldContent ?? defaultFieldValues.content;

    cy.do(
      getRowInteractorByRowNumber(initialRowsCount + 1)
        .find(contentTextArea)
        .fillIn(content),
    );
    cy.do(
      getRowInteractorByRowNumber(initialRowsCount + 1)
        .find(tagTextField)
        .fillIn(tagValue),
    );

    if (!content.match(/^\$\w/)) {
      return `${tagValue}${separator}${defaultFieldValues.getSourceContent(
        `${defaultFieldValues.initialSubField}${content}`,
      )}`;
    } else {
      return `${tagValue}${separator}${defaultFieldValues.getSourceContent(content)}`;
    }
  },

  checkRequiredFields() {
    cy.expect(
      QuickMarcEditor().has({
        presentedFieldsTags: and(...requiredRowsTags.map((field) => some(field))),
      }),
    );
    cy.then(() => QuickMarcEditor().presentedRowsProperties()).then((presentedRowsProperties) => {
      // TODO: move comparing logic into custome interactors matcher
      if (
        !requiredRowsTags.every((tag) => presentedRowsProperties.find(
          (rowProperties) => rowProperties.tag === tag && !rowProperties.isDeleteButtonExist,
        ))
      ) {
        assert.fail('Button Delete is presented into required row');
      }
    });
  },

  updateExistingField(
    tag = validRecord.existingTag,
    newContent = `newContent${getRandomPostfix()}`,
  ) {
    cy.do(QuickMarcEditorRow({ tagValue: tag }).find(TextArea()).fillIn(newContent));
    return newContent;
  },

  updateLDR06And07Positions() {
    this.selectFieldsDropdownOption('LDR', 'Type', INVENTORY_LDR_FIELD_TYPE_DROPDOWN.A);
    this.selectFieldsDropdownOption('LDR', 'BLvl', INVENTORY_LDR_FIELD_BLVL_DROPDOWN.A);
    this.selectFieldsDropdownOption('008', 'DtSt', INVENTORY_008_FIELD_DTST_DROPDOWN.M);
    this.selectFieldsDropdownOption('008', 'Conf', INVENTORY_008_FIELD_CONF_DROPDOWN.ONE);
    this.selectFieldsDropdownOption('008', 'Fest', INVENTORY_008_FIELD_FEST_DROPDOWN.ONE);
    this.selectFieldsDropdownOption('008', 'Indx', INVENTORY_008_FIELD_INDX_DROPDOWN.ONE);
    this.selectFieldsDropdownOption('008', 'LitF', INVENTORY_008_FIELD_LITF_DROPDOWN.I);
  },

  update008TextFields(dropdownLabel, value, typeSlowly = false) {
    if (typeSlowly) {
      cy.expect(QuickMarcEditorRow({ tagValue: '008' }).find(TextField(dropdownLabel)).exists());
      cy.get(`input[aria-label="${dropdownLabel}"][data-testid="fixed-field-String"]`)
        .clear()
        .type(value, { delay: 50 });
    } else cy.do(QuickMarcEditorRow({ tagValue: '008' }).find(TextField(dropdownLabel)).fillIn(value));
  },

  verify008TextFields(dropdownLabel, value) {
    cy.expect(
      QuickMarcEditorRow({ tagValue: '008' }).find(TextField(dropdownLabel)).has({ value }),
    );
  },

  selectFieldsDropdownOption(tag, dropdownLabel, option, row = null) {
    const targetRow =
      row === null ? getRowInteractorByTagName(tag) : getRowInteractorByRowNumber(row);
    cy.do(
      targetRow
        .find(Select({ label: matching(new RegExp(`^${dropdownLabel}\\**$`)) }))
        .choose(option),
    );
    cy.wait(500);
  },

  verifyFieldsDropdownOption(tag, dropdownLabel, option, row = null) {
    const targetRow =
      row === null ? getRowInteractorByTagName(tag) : getRowInteractorByRowNumber(row);
    cy.expect(
      targetRow
        .find(Select({ label: matching(new RegExp(`^${dropdownLabel}\\**$`)) }))
        .has({ content: including(option) }),
    );
  },

  verifyDropdownOptionChecked(tag, dropdownLabel, option, row = null) {
    const targetRow =
      row === null ? getRowInteractorByTagName(tag) : getRowInteractorByRowNumber(row);
    cy.expect(
      targetRow
        .find(Select({ label: including(dropdownLabel) }))
        .has({ checkedOptionText: option }),
    );
  },

  verifyDropdownHoverText(id, hoverText) {
    cy.get(`span[id="${id}"]`).should('contain.text', hoverText);
  },

  verifyLDRDropdownsHoverTexts() {
    this.verifyDropdownHoverText('ui-quick-marc.record.fixedField-Status-text', 'Record status');
    this.verifyDropdownHoverText('ui-quick-marc.record.fixedField-Type-text', 'Type of record');
    this.verifyDropdownHoverText('ui-quick-marc.record.fixedField-ELvl-text', 'Encoding level');
    this.verifyDropdownHoverText(
      'ui-quick-marc.record.fixedField-Punct-text',
      'Punctuation policy',
    );
  },

  verifyMarcHoldingLDRDropdownsHoverTexts() {
    this.verifyDropdownHoverText('ui-quick-marc.record.fixedField-Status-text', 'Record status');
    this.verifyDropdownHoverText('ui-quick-marc.record.fixedField-Type-text', 'Type of record');
    this.verifyDropdownHoverText('ui-quick-marc.record.fixedField-ELvl-text', 'Encoding level');
    this.verifyDropdownHoverText(
      'ui-quick-marc.record.fixedField-Item-text',
      'Item information in record',
    );
  },

  verifyMarcBibLDRDropdownsHoverTexts() {
    this.verifyDropdownHoverText('ui-quick-marc.record.fixedField-Status-text', 'Record status');
    this.verifyDropdownHoverText('ui-quick-marc.record.fixedField-Type-text', 'Type of record');
    this.verifyDropdownHoverText(
      'ui-quick-marc.record.fixedField-BLvl-text',
      'Bibliographic level',
    );
    this.verifyDropdownHoverText('ui-quick-marc.record.fixedField-Ctrl-text', 'Type of control');
    this.verifyDropdownHoverText('ui-quick-marc.record.fixedField-ELvl-text', 'Encoding level');
    this.verifyDropdownHoverText(
      'ui-quick-marc.record.fixedField-Desc-text',
      'Descriptive cataloging form',
    );
    this.verifyDropdownHoverText(
      'ui-quick-marc.record.fixedField-MultiLvl-text',
      'Multipart resource record level',
    );
  },

  verifyMarcAuth008DropdownsHoverTexts() {
    this.verifyDropdownHoverText(
      'ui-quick-marc.record.fixedField-Geo Subd-text',
      'Direct or indirect geographic subdivision',
    );
    this.verifyDropdownHoverText(
      'ui-quick-marc.record.fixedField-Roman-text',
      'Romanization scheme',
    );
    this.verifyDropdownHoverText(
      'ui-quick-marc.record.fixedField-Lang-text',
      'Language of catalog',
    );
    this.verifyDropdownHoverText('ui-quick-marc.record.fixedField-Kind rec-text', 'Kind of record');
    this.verifyDropdownHoverText(
      'ui-quick-marc.record.fixedField-Cat Rules-text',
      'Descriptive cataloging rules',
    );
    this.verifyDropdownHoverText(
      'ui-quick-marc.record.fixedField-SH Sys-text',
      'Subject heading system/thesaurus',
    );
    this.verifyDropdownHoverText('ui-quick-marc.record.fixedField-Series-text', 'Type of series');
    this.verifyDropdownHoverText(
      'ui-quick-marc.record.fixedField-Numb Series-text',
      'Numbered or unnumbered series',
    );
    this.verifyDropdownHoverText(
      'ui-quick-marc.record.fixedField-Main use-text',
      'Heading use – main or added entry',
    );
    this.verifyDropdownHoverText(
      'ui-quick-marc.record.fixedField-Subj use-text',
      'Heading use – subject added entry',
    );
    this.verifyDropdownHoverText(
      'ui-quick-marc.record.fixedField-Series use-text',
      'Heading use – series added entry',
    );
    this.verifyDropdownHoverText(
      'ui-quick-marc.record.fixedField-Type Subd-text',
      'Type of subject subdivision',
    );
    this.verifyDropdownHoverText(
      'ui-quick-marc.record.fixedField-Govt Ag-text',
      'Type of government agency',
    );
    this.verifyDropdownHoverText(
      'ui-quick-marc.record.fixedField-RefEval-text',
      'Reference evaluation',
    );
    this.verifyDropdownHoverText(
      'ui-quick-marc.record.fixedField-RecUpd-text',
      'Record update in process',
    );
    this.verifyDropdownHoverText(
      'ui-quick-marc.record.fixedField-Pers Name-text',
      'Undifferentiated personal name',
    );
    this.verifyDropdownHoverText(
      'ui-quick-marc.record.fixedField-Level Est-text',
      'Level of establishment',
    );
    this.verifyDropdownHoverText(
      'ui-quick-marc.record.fixedField-Mod Rec Est-text',
      'Modified record',
    );
    this.verifyDropdownHoverText(
      'ui-quick-marc.record.fixedField-Source-text',
      'Cataloging source',
    );
  },

  verifyLDRPositionsDefaultValues(fieldName, fieldvalue, isDisabled = true) {
    cy.expect(
      QuickMarcEditorRow({ index: 0 })
        .find(TextField({ name: fieldName }))
        .has({ disabled: isDisabled, value: fieldvalue }),
    );
  },

  updateExistingTagName(currentTagName = validRecord.existingTag, newTagName) {
    cy.then(() => QuickMarcEditorRow({ tagValue: currentTagName }).index()).then((index) => {
      cy.do(
        QuickMarcEditorRow({ index })
          .find(TextField({ name: including('.tag') }))
          .fillIn(newTagName),
      );
    });
  },

  updateExistingFieldContent(rowIndex, newContent = `newContent${getRandomPostfix()}`) {
    cy.do(QuickMarcEditorRow({ index: rowIndex }).find(TextArea()).fillIn(newContent));
  },

  fillEmptyTextAreaOfField(rowIndex, fieldName, content) {
    cy.do(
      QuickMarcEditorRow({ index: rowIndex })
        .find(TextArea({ name: fieldName }))
        .fillIn(content),
    );
  },

  fillEmptyTextFieldOfField(rowIndex, fieldName, content) {
    cy.do(
      QuickMarcEditorRow({ index: rowIndex })
        .find(TextField({ name: fieldName }))
        .fillIn(content),
    );
  },

  updateExistingTagValue(rowIndex, newTagValue) {
    cy.do(
      QuickMarcEditorRow({ index: rowIndex })
        .find(TextField({ name: including('.tag') }))
        .fillIn(newTagValue),
    );
  },

  updateLDRvalueByPosition(position, value) {
    const initialValue = '00000nci\\a2200000uu\\4500';
    const updatedValue = `${initialValue.substring(0, position)}${value}${initialValue.substring(
      position + 1,
      initialValue.length,
    )}`;
    this.updateExistingField('LDR', updatedValue);
  },

  waitLoading() {
    cy.expect([
      Pane({ id: 'quick-marc-editor-pane' }).exists(),
      QuickMarcEditorRow({ tagValue: '999' }).exists(),
      cancelButton.exists(),
    ]);
  },

  getExistingLocation() {
    return defaultFieldValues.existingLocation;
  },

  getFreeTags() {
    return defaultFieldValues.freeTags;
  },

  checkInitial008TagValueFromHoldings() {
    tag008HoldingsBytesProperties.getAllProperties().forEach((specialByte) => {
      cy.expect(specialByte.interactor.has({ value: specialByte.defaultValue }));
    });
  },

  // should be used only with default value of tag 008
  checkNotExpectedByteLabelsInTag008Holdings() {
    cy.then(() => QuickMarcEditor().presentedRowsProperties()).then((rowsProperties) => {
      let actualJoinedFieldNames = rowsProperties
        .filter((rowProperty) => rowProperty.tag === '008')
        .map((rowProperty) => rowProperty.content)[0]
        .toLowerCase();

      Object.keys(tag008HoldingsBytesProperties).forEach((fieldName) => {
        switch (fieldName) {
          case 'specRet0':
          case 'specRet1':
          case 'specRet2': {
            actualJoinedFieldNames = actualJoinedFieldNames.replace('spec ret', '');
            break;
          }
          case 'genRet': {
            actualJoinedFieldNames = actualJoinedFieldNames.replace('gen ret', '');
            break;
          }
          case 'sepComp': {
            actualJoinedFieldNames = actualJoinedFieldNames.replace('sep/comp', '');
            break;
          }
          case 'reptDate': {
            actualJoinedFieldNames = actualJoinedFieldNames.replace('rept date', '');
            break;
          }
          default: {
            actualJoinedFieldNames = actualJoinedFieldNames.replace(fieldName.toLowerCase(), '');
          }
        }
      });
    });
  },

  // TODO: redesign. move tag008HoldingsBytesProperties to InventoryInstance.validOCLC
  updateAllDefaultValuesIn008TagInHoldings() {
    tag008HoldingsBytesProperties.getUsualProperties().forEach((byteProperty) => {
      cy.do(
        QuickMarcEditorRow({ tagValue: '008' })
          .find(byteProperty.interactor)
          .fillIn(byteProperty.newValue),
      );
    });
    // additional steps related with Spec ret
    specRetInputNamesHoldings008.forEach((name) => {
      // TODO: redesign to interactors
      cy.get(`input[name="${name}"]`).click();
      cy.get(`input[name="${name}"]`).type(
        `{backspace}{backspace}${tag008HoldingsBytesProperties.specRet0.newValue}`,
      );
    });
    this.pressSaveAndClose();
    return tag008HoldingsBytesProperties
      .getAllProperties()
      .map((property) => property.newValue)
      .join('');
  },

  clearTag008Holdings() {
    tag008HoldingsBytesProperties.getUsualProperties().forEach((byteProperty) => {
      cy.do(
        QuickMarcEditorRow({ tagValue: '008' })
          .find(byteProperty.interactor)
          .fillIn(byteProperty.voidValue),
      );
    });
    this.pressSaveAndClose();
    return tag008HoldingsBytesProperties
      .getAllProperties()
      .map((property) => property.voidValue)
      .join('');
  },

  check008FieldLabels(labels) {
    if (Array.isArray(labels)) {
      labels.forEach((label) => {
        cy.expect(QuickMarcEditorRow({ tagValue: '008', text: including(label) }).exists());
      });
    } else {
      cy.expect(QuickMarcEditorRow({ tagValue: '008', text: including(labels) }).exists());
    }
  },

  checkReplacedVoidValuesInTag008Holdings() {
    tag008HoldingsBytesProperties.getAllProperties().forEach((byteProperty) => {
      cy.expect(
        QuickMarcEditorRow({ tagValue: '008' })
          .find(byteProperty.interactor)
          .has({ value: byteProperty.replacedVoidValue }),
      );
    });
  },

  check008FieldContent() {
    tag008DefaultValues.forEach((field) => {
      if (field.isSelect === true) {
        cy.expect(field.interactor.has({ checkedOptionText: field.defaultValue }));
      } else {
        cy.expect(field.interactor.has({ value: field.defaultValue }));
      }
    });
  },

  getRegularTagContent(tag) {
    cy.then(() => QuickMarcEditorRow({ tagValue: tag }).find(TextArea()).textContent()).then(
      (content) => cy.wrap(content).as('tagContent'),
    );
    return cy.get('@tagContent');
  },

  fillLDRFields(fieldValues) {
    const actions = [];
    ldrFields.forEach(({ label, type, name }) => {
      const value = fieldValues[label];

      if (type === 'select') {
        actions.push(cy.get(`select[name="${name}"]`).select(value));
      } else if (type === 'input') {
        actions.push(cy.get(`input[name="${name}"]`).clear().type(value));
      }
    });

    return cy.do(...actions);
  },

  deleteTag(rowIndex) {
    cy.do([
      QuickMarcEditorRow({ index: rowIndex })
        .find(TextField({ name: including('.tag') }))
        .fillIn(''),
      QuickMarcEditorRow({ index: rowIndex }).find(deleteFieldButton).click(),
    ]);
  },

  closeWithoutSaving() {
    cy.do(cancelButton.click());
  },

  closeUsingCrossButton() {
    cy.do(xButton.click());
  },

  closeWithoutSavingAfterChange() {
    cy.do(cancelButton.click());
    cy.expect(closeWithoutSavingBtn.exists());
    cy.do(closeWithoutSavingBtn.click());
  },

  getSourceContent(quickmarcTagValue) {
    return defaultFieldValues.getSourceContent(quickmarcTagValue);
  },

  checkNotDeletableTags(...tags) {
    cy.then(() => QuickMarcEditor().presentedRowsProperties()).then((presentedRowsProperties) => presentedRowsProperties
      .filter((rowProperties) => tags.includes(rowProperties.tag))
      .forEach(
        (specialRowsProperties) => cy.expect(specialRowsProperties.isDeleteButtonExist).to.be.false,
      ));
  },

  checkInitialInstance008Content() {
    Object.values(validRecord.tag008BytesProperties).forEach((property) => cy.expect(property.interactor.has({ value: property.defaultValue })));
  },

  check008FieldsAbsent(...subfieldNames) {
    subfieldNames.forEach((subfieldName) => cy.expect(
      getRowInteractorByTagName('008')
        .find(quickMarcEditorRowContent)
        .find(TextField(subfieldName))
        .absent(),
    ));
  },

  checkSubfieldsPresenceInTag008() {
    cy.expect(
      getRowInteractorByTagName('008')
        .find(quickMarcEditorRowContent)
        .find(HTML({ className: including('bytesFieldRow-') }))
        .exists(),
    );
  },

  checkHeaderFirstLine({ headingTypeFrom1XX, headingType, status }, userName) {
    cy.expect(
      Pane(matching(new RegExp(`Edit .*MARC authority record - ${headingTypeFrom1XX}`))).exists(),
    );
    cy.then(() => Pane(matching(new RegExp(`Edit .*MARC authority record - ${headingTypeFrom1XX}`))).subtitle()).then((subtitle) => {
      cy.expect(
        Pane({
          subtitle: and(
            including('Status:'),
            including(status),
            including(headingType),
            including('Last updated:'),
            including(`Source: ${userName}`),
          ),
        }).exists(),
      );
      const stringDate = `${subtitle.split('Last updated: ')[1].split(' •')[0]} UTC`;
      dateTools.verifyDate(Date.parse(stringDate), 120_000);
    });
  },

  checkReadOnlyTags() {
    readOnlyAuthorityTags.forEach((readOnlyTag) => {
      cy.expect(
        getRowInteractorByTagName(readOnlyTag).find(TextField('Field')).has({ disabled: true }),
      );
      if (readOnlyTag !== 'LDR') {
        cy.expect(
          getRowInteractorByTagName(readOnlyTag)
            .find(TextArea({ ariaLabel: 'Subfield' }))
            .has({ disabled: true }),
        );
      }
      if (readOnlyTag === '999') {
        cy.expect(
          getRowInteractorByTagName(readOnlyTag)
            .find(TextField('Indicator', { name: including('.indicators[0]') }))
            .has({ disabled: true }),
        );
        cy.expect(
          getRowInteractorByTagName(readOnlyTag)
            .find(TextField('Indicator', { name: including('.indicators[1]') }))
            .has({ disabled: true }),
        );
      }
    });
  },

  verifyAllBoxesInARowAreEditable(tag) {
    cy.expect([
      getRowInteractorByTagName(tag).find(TextField('Field')).has({ disabled: false }),
      getRowInteractorByTagName(tag)
        .find(TextArea({ ariaLabel: 'Subfield' }))
        .has({ disabled: false }),
      getRowInteractorByTagName(tag)
        .find(TextField('Indicator', { name: including('.indicators[0]') }))
        .has({ disabled: false }),
      getRowInteractorByTagName(tag)
        .find(TextField('Indicator', { name: including('.indicators[1]') }))
        .has({ disabled: false }),
    ]);
  },

  checkLinkButtonExist(tag) {
    cy.expect(getRowInteractorByTagName(tag).find(linkToMarcRecordButton).exists());
  },

  checkLinkButtonDontExist(tag) {
    cy.expect(getRowInteractorByTagName(tag).find(linkToMarcRecordButton).absent());
  },

  checkLinkButtonToolTipText(text) {
    cy.do(getRowInteractorByTagName('100').find(linkToMarcRecordButton).hoverMouse());
    cy.expect(Tooltip().has({ text }));
  },
  checkLinkButtonToolTipTextByIndex(rowIndex) {
    cy.do(QuickMarcEditorRow({ index: rowIndex }).find(linkToMarcRecordButton).hoverMouse());
    cy.expect(Tooltip().has({ text: 'Link to MARC Authority record' }));
  },
  checkUnlinkTooltipText(rowIndex, text) {
    cy.do(QuickMarcEditorRow({ index: rowIndex }).find(unlinkIconButton).hoverMouse());
    cy.expect(Tooltip().has({ text }));
  },
  checkUnlinkTooltipTextInFieldByTag(tag, text) {
    cy.do(QuickMarcEditorRow({ tagValue: tag }).find(unlinkIconButton).hoverMouse());
    cy.expect(Tooltip().has({ text }));
  },
  checkViewMarcAuthorityTooltipText(rowIndex) {
    cy.do(
      QuickMarcEditor()
        .find(QuickMarcEditorRow({ index: rowIndex }))
        .find(Button({ icon: 'eye-open' }))
        .hoverMouse(),
    );
    cy.expect(Tooltip({ text: 'View MARC authority record' }).exists());
  },

  checkLinkButtonExistByRowIndex(rowIndex) {
    cy.expect(QuickMarcEditorRow({ index: rowIndex }).find(linkToMarcRecordButton).exists());
  },

  checkButtonSaveAndCloseEnable() {
    cy.expect(saveAndCloseButtonEnabled.exists());
  },

  checkDeleteButtonExist(rowIndex) {
    cy.expect(QuickMarcEditorRow({ index: rowIndex }).find(deleteFieldButton).exists());
  },

  checkDeleteButtonNotExist(rowIndex) {
    cy.expect(QuickMarcEditorRow({ index: rowIndex }).find(deleteFieldButton).absent());
  },

  checkCallout(callout) {
    cy.expect(Callout(callout).exists());
  },

  checkErrorMessage(rowIndex, errorMessage, isShown = true) {
    const errorElement = QuickMarcEditorRow({ index: rowIndex }).find(
      HTML(including(errorMessage)),
    );
    cy.wait(1000);
    cy.expect(errorElement[isShown ? 'exists' : 'absent']());
  },

  checkErrorMessageForField(index, errorMessage) {
    cy.expect(
      QuickMarcEditorRow({ index })
        .find(TextArea({ error: errorMessage }))
        .exists(),
    );
  },

  checkWarningMessageForField(index, errorMessage) {
    cy.expect(
      QuickMarcEditorRow({ index })
        .find(TextArea({ warning: errorMessage }))
        .exists(),
    );
  },

  checkNonEditableLdrCalloutBib() {
    cy.expect([calloutNonEditableLdrBib.exists(), calloutNonEditableLdrBib.has({ type: 'error' })]);
    cy.do(calloutNonEditableLdrBib.dismiss());
    cy.expect(calloutNonEditableLdrBib.absent());
  },

  clearCertain008Boxes(...boxNames) {
    boxNames.forEach((boxName) => {
      cy.do([QuickMarcEditorRow({ tagValue: '008' }).find(TextField(boxName)).fillIn('')]);
    });
  },

  checkAfterSaveHoldings() {
    cy.expect([calloutAfterSaveAndClose.exists(), Button('Actions').exists()]);
  },

  checkDelete008Callout() {
    cy.expect(calloutDelete008Error.exists());
    cy.do(calloutDelete008Error.dismiss());
    cy.expect(calloutDelete008Error.absent());
  },

  check008FieldsEmptyHoldings() {
    tag008DefaultValuesHoldings.forEach((field) => {
      cy.expect(field.interactor.has({ value: field.defaultValue }));
    });
  },

  checkSubfieldsAbsenceInTag008() {
    cy.expect(
      getRowInteractorByTagName('008')
        .find(quickMarcEditorRowContent)
        .find(HTML({ className: including('bytesFieldRow-') }))
        .absent(),
    );
  },

  saveInstanceIdToArrayInQuickMarc(IdArray) {
    cy.url().then((url) => {
      const instanceId = IdArray.push(url.split('/')[6].split('?')[0]);
      cy.wrap(instanceId).as('instanceId');
    });
    return cy.get('@instanceId');
  },

  checkFieldsExist(tags) {
    tags.forEach((tag) => {
      cy.expect(getRowInteractorByTagName(tag).exists());
    });
  },

  checkFieldsCount(expectedCount) {
    cy.expect(QuickMarcEditor().has({ rowsCount: expectedCount }));
  },

  checkAfterSaveAndCloseDerive() {
    cy.expect([calloutAfterSaveAndCloseNewRecord.exists(), instanceDetailsPane.exists()]);
  },

  checkAfterSaveAndKeepEditingDerive() {
    cy.expect([calloutAfterSaveAndCloseNewRecord.exists(), rootSection.exists()]);
  },

  verifyAndDismissRecordUpdatedCallout() {
    cy.expect(calloutAfterSaveAndClose.exists());
    cy.do(calloutAfterSaveAndClose.dismiss());
    cy.expect(calloutAfterSaveAndClose.absent());
  },

  checkFourthBoxEditable(rowIndex, isEditable = true) {
    if (isEditable) {
      cy.expect(
        getRowInteractorByRowNumber(rowIndex)
          .find(TextArea({ ariaLabel: 'Subfield' }))
          .has({ disabled: !isEditable }),
      );
    } else {
      cy.expect(
        getRowInteractorByRowNumber(rowIndex)
          .find(TextArea({ ariaLabel: 'Subfield' }))
          .has({ disabled: !isEditable }),
      );
    }
  },

  verifyNoFieldWithContent(content) {
    cy.expect(TextArea({ ariaLabel: 'Subfield', textContent: including(content) }).absent());
  },

  verifyTagWithNaturalIdExistance(
    rowIndex,
    tag,
    naturalId,
    nameLocator = `records[${rowIndex}].subfieldGroups.zeroSubfield`,
  ) {
    cy.expect([
      QuickMarcEditorRow({ index: rowIndex })
        .find(TextField({ name: `records[${rowIndex}].tag` }))
        .has({ value: tag }),
      QuickMarcEditorRow({ index: rowIndex })
        .find(TextArea({ name: nameLocator }))
        .has({ value: including(naturalId) }),
    ]);
  },

  updateTagNameToLockedTag(rowIndex, newTagName) {
    cy.get(`input[name="records[${rowIndex}].tag"`).type(newTagName, { delay: 200 });
  },

  checkEmptyFieldAdded(rowIndex, defaultContent = '$a ') {
    cy.expect([
      QuickMarcEditorRow({ index: rowIndex }).find(quickMarcEditorRowContent).exists(),
      QuickMarcEditorRow({ index: rowIndex })
        .find(TextField({ name: including('.tag') }))
        .has({ value: '' }),
      QuickMarcEditorRow({ index: rowIndex })
        .find(TextArea({ ariaLabel: 'Subfield' }))
        .has({ textContent: defaultContent }),
    ]);
  },

  confirmUpdateLinkedBibs(linkedRecordsNumber) {
    cy.do(saveButton.click());
    cy.expect([
      Callout(
        `This record has successfully saved and is in process. ${linkedRecordsNumber} linked bibliographic record(s) updates have begun.`,
      ).exists(),
      rootSection.absent(),
      viewMarcSection.exists(),
    ]);
  },

  cancelUpdateLinkedBibs() {
    cy.do(keepEditingButton.click());
    cy.expect([
      Modal({ id: 'quick-marc-update-linked-bib-fields' }).absent(),
      rootSection.exists(),
    ]);
  },

  checkPaneheaderContains(text) {
    if (text instanceof RegExp) cy.expect(PaneHeader({ text: matching(text) }).exists());
    else cy.expect(PaneHeader({ text: including(text) }).exists());
  },

  checkRecordStatusNew() {
    cy.expect(
      Pane(matching(/Create a new .*MARC authority record/)).has({ subtitle: 'Status:New' }),
    );
  },

  verifyPaneheaderWithContentAbsent(text) {
    if (text instanceof RegExp) cy.expect(PaneHeader({ text: matching(text) }).absent());
    else cy.expect(PaneHeader({ text: including(text) }).absent());
  },

  checkUpdateLinkedBibModalAbsent() {
    cy.expect(updateLinkedBibFieldsModal.absent());
  },

  checkDeleteModal(fieldsCount) {
    cy.expect([
      confirmationModal.exists(),
      confirmationModal.has({
        content: including(
          `By selecting Continue with save, then ${fieldsCount} field(s) will be deleted and this record will be updated. Are you sure you want to continue?`,
        ),
      }),
      continueWithSaveButton.exists(),
      restoreDeletedFieldsBtn.exists(),
    ]);
  },

  checkDeleteModalClosed() {
    cy.expect(confirmationModal.absent());
  },

  clickSaveAndKeepEditingButton() {
    cy.do(saveAndKeepEditingBtn.click());
  },

  waitAndCheckFirstBibRecordCreated(
    marcBibTitle = `Test_Bib_Creation_${getRandomPostfix()}`,
    timeOutSeconds = 120,
  ) {
    let timeCounter = 0;
    function checkBib() {
      cy.okapiRequest({
        path: 'instance-storage/instances',
        searchParams: { query: `(title all "${marcBibTitle}")` },
        isDefaultSearchParamsRequired: false,
      }).then(({ body }) => {
        if (body.instances[0] || timeCounter >= timeOutSeconds) {
          cy.expect(body.instances[0].title).equals(marcBibTitle);
        } else {
          // wait 1 second before retrying request
          cy.wait(1000);
          checkBib();
          timeCounter++;
        }
      });
    }
    InventoryInstance.newMarcBibRecord();
    this.updateExistingField('245', `$a ${marcBibTitle}`);
    this.updateLDR06And07Positions();
    this.pressSaveAndClose();
    cy.expect(calloutAfterSaveAndClose.exists());
    checkBib();
  },

  fillLinkedFieldBox(rowIndex, boxNumber = 4, value) {
    const boxes = [
      tagBox,
      firstIndicatorBox,
      secondIndicatorBox,
      fourthBoxInLinkedField,
      fifthBoxInLinkedField,
      sixthBoxInLinkedField,
      seventhBoxInLinkedField,
    ];
    cy.do(
      QuickMarcEditorRow({ index: rowIndex })
        .find(boxes[boxNumber - 1])
        .fillIn(value),
    );
    // if other action performed immediately after input, it might not be registered
    cy.wait(1000);
    cy.expect(
      QuickMarcEditorRow({ index: rowIndex })
        .find(boxes[boxNumber - 1])
        .has({ value }),
    );
  },

  verifyAfterLinkingAuthorityByIndex(rowIndex, tag) {
    cy.expect([
      Callout(`Field ${tag} has been linked to a MARC authority record.`).exists(),
      QuickMarcEditorRow({ index: rowIndex }).find(unlinkIconButton).exists(),
      QuickMarcEditorRow({ index: rowIndex }).find(viewAuthorityIconButton).exists(),
    ]);
  },

  verifyZeroSubfieldInUnlinkedField(rowIndex, content) {
    cy.expect(
      QuickMarcEditorRow({ index: rowIndex })
        .find(TextArea({ name: `records[${rowIndex}].content` }))
        .has({ value: including(`$0 ${content}`) }),
    );
  },

  verifyRemoveLinkingModal() {
    cy.expect([
      removeLinkingModal.exists(),
      removeLinkingModal.find(removeLinkingButton).exists(),
      removeLinkingModal.find(keepLinkingButton).exists(),
      removeLinkingModal.has({
        content: including(
          'Do you want to remove authority linking for this new bibliographic record?',
        ),
      }),
    ]);
  },

  verifyRemoveLinkingModalAbsence() {
    cy.expect([removeLinkingModal.absent()]);
  },

  confirmRemoveAuthorityLinking() {
    cy.do(removeLinkingModal.find(removeLinkingButton).click());
    cy.expect([removeLinkingModal.absent(), rootSection.exists()]);
  },

  clickKeepLinkingButton() {
    cy.do(removeLinkingModal.find(keepLinkingButton).click());
  },

  verifyAndDismissWrongTagLengthCallout() {
    cy.expect(calloutMarcTagWrongLength.exists());
    cy.do(calloutMarcTagWrongLength.dismiss());
    cy.expect(calloutMarcTagWrongLength.absent());
  },

  verifyTagValue(rowIndex, tagValue) {
    cy.expect(
      QuickMarcEditorRow({ index: rowIndex })
        .find(TextField({ name: including('.tag') }))
        .has({ value: tagValue }),
    );
  },

  verifyInvalidTagCallout() {
    cy.expect(calloutInvalidMarcTag.exists());
  },

  verifyNo245TagCallout() {
    cy.expect(calloutNo245MarcTag.exists());
  },

  verifyMultiple245TagCallout() {
    cy.expect(calloutMultiple245MarcTags.exists());
  },

  verifyMultipleTagCallout(tagNumber) {
    cy.expect(Callout(`Record cannot be saved with more than one ${tagNumber} field`).exists());
  },

  verifyRecordCanNotBeSavedCalloutLDR() {
    cy.expect(
      Callout(
        'Record cannot be saved. The Leader must contain 24 characters, including null spaces.',
      ).exists(),
    );
  },

  verifyMultiple001TagCallout() {
    cy.expect(calloutMultiple001MarcTags.exists());
  },
  verifyMarcTagThreeCharacterCallout() {
    cy.expect(calloutThreeCharacterMarcTag.exists());
  },
  verifyAndDismissMultiple010TagCallout() {
    cy.expect(calloutMultiple010MarcTags.exists());
    cy.do(calloutMultiple010MarcTags.dismiss());
    cy.expect(calloutMultiple010MarcTags.absent());
    cy.expect(rootSection.exists());
  },

  verifyAndDismissMultiple010SubfieldsCallout() {
    cy.expect(calloutMultiple010Subfields.exists());
    cy.do(calloutMultiple010Subfields.dismiss());
    cy.expect([calloutMultiple010Subfields.absent(), rootSection.exists()]);
  },

  verifyInvalidLDRValueError(positions) {
    let positionsArray = positions;
    if (!Array.isArray(positions)) {
      positionsArray = [positions];
    }

    const leaders = positionsArray
      .map((pos, index) => {
        const leaderText = `Leader ${String(pos).padStart(2, '0')}`;
        if (positionsArray.length > 1) {
          if (index === positionsArray.length - 1) {
            return `and ${leaderText}`;
          } else if (index === positionsArray.length - 2) {
            return `${leaderText}`;
          } else {
            return `${leaderText},`;
          }
        }
        return leaderText;
      })
      .join(' ');
    const errorText = `Fail: Record cannot be saved. Please enter a valid ${leaders}. Valid values are listed at https://loc.gov/marc/bibliographic/bdleader.html`;
    const errorElement = getRowInteractorByTagName('LDR').find(HTML(including(errorText)));
    cy.expect(errorElement.exists());
  },

  closeCallout(text) {
    if (text) cy.do(Callout(text).find(closeButton).click());
    else cy.do(Callout().find(closeButton).click());
    if (text) cy.expect(Callout(text).absent());
    else cy.expect(Callout().absent());
  },

  closeAllCallouts() {
    cy.get('[class^=calloutBase-]').each((callout) => {
      const calloutId = callout.attr('id');
      if (calloutId) {
        cy.do(Callout({ id: calloutId }).dismiss());
      }
    });
    cy.expect(Callout().absent());
  },

  verifyInvalidLDRCalloutLink() {
    cy.do(
      calloutInvalidLDRValue
        .find(Link({ href: including('https://loc.gov/marc/bibliographic/bdleader.html') }))
        .perform((elem) => {
          const targetValue = elem.getAttribute('target');
          expect(targetValue).to.equal('_blank');
        }),
    );
  },

  checkUserNameInHeader(firstName, lastName) {
    if (!firstName) {
      cy.expect(
        PaneHeader()
          .find(HTML(matching(new RegExp(`Source: ${lastName}$`))))
          .exists(),
      );
    } else {
      cy.expect(
        PaneHeader()
          .find(HTML(including(`Source: ${lastName}, ${firstName}`)))
          .exists(),
      );
    }
  },

  updateIndicatorValue(tag, newValue, indicatorIndex = 0) {
    const indicator = indicatorIndex ? secondIndicatorBox : firstIndicatorBox;
    cy.do(getRowInteractorByTagName(tag).find(indicator).fillIn(newValue));
    cy.expect(getRowInteractorByTagName(tag).find(indicator).has({ value: newValue }));
  },

  verifyIndicatorValue(tag, indicatorValue, indicatorIndex = 0) {
    const indicator = indicatorIndex ? secondIndicatorBox : firstIndicatorBox;
    cy.expect(getRowInteractorByTagName(tag).find(indicator).has({ value: indicatorValue }));
  },

  updateValuesIn008Boxes(valuesArray) {
    valuesArray.forEach((value, index) => {
      cy.do(tag008DefaultValues[index].interactor.fillIn(value));
    });
    valuesArray.forEach((value, index) => {
      cy.expect(tag008DefaultValues[index].interactor.has({ value }));
    });
  },

  updateValueOf008BoxByBoxName(boxName, updatedValue) {
    cy.do(TextField(`${boxName}`).fillIn(updatedValue));
  },

  deleteValuesIn008Boxes() {
    tag008DefaultValues.forEach((index) => {
      if (index.isSelect === false) {
        cy.do(index.interactor.fillIn(''));
      }
    });
  },

  checkValuesIn008Boxes(valuesArray) {
    valuesArray.forEach((value, index) => {
      cy.expect(tag008DefaultValues[index].interactor.has({ value }));
    });
  },

  checkReadOnlyHoldingsTags() {
    readOnlyHoldingsTags.forEach((readOnlyTag) => {
      cy.expect([
        getRowInteractorByTagName(readOnlyTag).find(TextField('Field')).has({ disabled: true }),
        getRowInteractorByTagName(readOnlyTag)
          .find(TextArea({ ariaLabel: 'Subfield' }))
          .has({ disabled: true }),
      ]);
      if (readOnlyTag === '999') {
        cy.expect(
          getRowInteractorByTagName(readOnlyTag)
            .find(TextField('Indicator', { name: including('.indicators[0]') }))
            .has({ disabled: true }),
        );
        cy.expect(
          getRowInteractorByTagName(readOnlyTag)
            .find(TextField('Indicator', { name: including('.indicators[1]') }))
            .has({ disabled: true }),
        );
      }
    });
  },

  verifyHoldingsDefault008BoxesValues(expectedValues) {
    default008BoxesHoldings.forEach((box, index) => {
      cy.expect(box.has({ value: expectedValues[index] }));
    });
  },

  saveAndKeepEditingUpdatedLinkedBibField() {
    cy.do(saveAndKeepEditingBtn.click());
    cy.expect([updateLinkedBibFieldsModal.exists(), saveButton.exists()]);
  },

  verifyUpdateLinkedBibsKeepEditingModal(linkedRecordsNumber) {
    cy.expect(updateLinkedBibFieldsModal.exists());
    if (linkedRecordsNumber === 1) {
      cy.expect(
        updateLinkedBibFieldsModal.has({
          content: including(
            `${linkedRecordsNumber} bibliographic record is linked to this authority record and will be updated by clicking the Save button.`,
          ),
        }),
      );
    } else {
      cy.expect(
        updateLinkedBibFieldsModal.has({
          content: including(
            `${linkedRecordsNumber} bibliographic records are linked to this authority record and will be updated by clicking the Save button.`,
          ),
        }),
      );
    }

    cy.expect(saveButton.exists());
    cy.expect(keepEditingButton.exists());
  },

  confirmUpdateLinkedBibsKeepEditing(linkedRecordsNumber) {
    cy.do(saveButton.click());
    cy.expect([
      Callout(
        `This record has successfully saved and is in process. ${linkedRecordsNumber} linked bibliographic record(s) updates have begun.`,
      ).exists(),
      updateLinkedBibFieldsModal.absent(),
    ]);
  },
  confirmDeletingRecord() {
    cy.do(confirmDeleteButton.click());
    cy.expect([confirmDeletingRecordModal.absent()]);
  },
  checkAfterSaveAndCloseAuthority() {
    cy.expect([calloutAfterSaveAndClose.exists(), rootSection.absent(), viewMarcSection.exists()]);
  },

  checkNoDeletePlaceholder() {
    cy.expect(
      rootSection.find(HTML(including('has been deleted from this MARC record.'))).absent(),
    );
  },

  verifyIconsAfterUnlinking(rowIndex) {
    cy.expect([
      QuickMarcEditorRow({ index: rowIndex }).find(unlinkIconButton).absent(),
      QuickMarcEditorRow({ index: rowIndex }).find(viewAuthorityIconButton).absent(),
      QuickMarcEditorRow({ index: rowIndex }).find(linkToMarcRecordButton).exists(),
    ]);
  },

  selectExistingHoldingsLocation(locationObject) {
    Institutions.getInstitutionByIdViaApi(locationObject.institutionId).then((institution) => {
      const institutionName = institution.name;
      cy.do(holdingsLocationLink.click());
      cy.expect(holdingsLocationModal.exists());
      cy.do(holdingsLocationInstitutionSelect.choose(institutionName));
      // wait until values applied in dropdowns
      cy.wait(3000);
      cy.expect([
        holdingsLocationInstitutionSelect.has({ value: locationObject.institutionId }),
        holdingsLocationCampusSelect.has({ value: locationObject.campusId }),
        holdingsLocationLibrarySelect.has({ value: locationObject.libraryId }),
        holdingsLocationSelectDisabled
          .find(HTML(including(`${locationObject.name} (${locationObject.code})`)))
          .exists(),
        holdingsLocationSaveButton.has({ disabled: false }),
      ]);
      cy.do(holdingsLocationSaveButton.click());
      cy.expect(holdingsLocationModal.absent());
    });
  },

  fillInHoldingsLocationForm(locationObject, campusName, locationName) {
    Institutions.getInstitutionByIdViaApi(locationObject.institutionId).then((institution) => {
      const institutionName = institution.name;
      cy.do(holdingsLocationLink.click());
      cy.expect(holdingsLocationModal.exists());
      cy.do(holdingsLocationInstitutionSelect.choose(institutionName));
      // wait until values applied in dropdowns
      cy.wait(3000);
      if (campusName) {
        cy.do(holdingsLocationCampusSelect.choose(campusName));
        cy.wait(3000);
        cy.expect(holdingsLocationSelect.exists());
      }

      if (locationName) {
        cy.do(holdingsLocationSelect.click());
        cy.wait(1000);
        cy.get(holdingsLocationOption).contains(locationName).click();
        cy.wait(1000);
      }
      cy.do(holdingsLocationSaveButton.click());
      cy.wait(1000);
      cy.do(holdingsLocationSaveButton.click());
      cy.expect(holdingsLocationModal.absent());
    });
  },

  checkOnlyBackslashesIn008Boxes() {
    cy.get('input[name^="records"][name$=".tag"][value="008"]')
      .parents('[data-testid="quick-marc-editorid"]')
      .find('[data-testid="bytes-field-col"] input')
      .then((inputs) => {
        const values = Array.from(inputs, (el) => el.value);
        expect(values.join('')).to.match(/^\\+$/);
      });
  },

  check008BoxesCount(count) {
    cy.get('input[value="008"]')
      .parents('[data-testid="quick-marc-editorid"]')
      .find('div[data-testid="bytes-field-col"]')
      .should('have.length', count);
  },

  checkTagAbsent(tag) {
    cy.expect(getRowInteractorByTagName(tag).absent());
  },

  checkValueAbsent(rowIndex, valueToCheck) {
    cy.expect(
      QuickMarcEditorRow({ index: rowIndex })
        .find(TextArea({ value: including(valueToCheck) }))
        .absent(),
    );
  },

  checkValueExist(rowIndex, valueToCheck) {
    cy.expect(
      QuickMarcEditorRow({ index: rowIndex })
        .find(TextArea({ value: including(valueToCheck) }))
        .exists(),
    );
  },

  checkLinkingAuthorityByTag: (tag) => {
    cy.expect(buttonLink.exists());
    cy.expect(Callout(`Field ${tag} has been linked to a MARC authority record.`).exists());
  },

  clickUnlinkButton: () => {
    cy.do(buttonLink.click());
  },

  checkDefaultContent() {
    this.checkEmptyContent('001');
    this.checkEmptyContent('005');
    this.checkEmptyContent('999');
    this.checkEmptyContent('008');
    this.verifyLDRPositionsDefaultValues('records[0].content.Record length', '00000');
    this.verifyDropdownOptionChecked('LDR', 'Status', 'n - New');
    this.verifyDropdownOptionChecked('LDR', 'Type', '\\ - invalid value');
    this.verifyDropdownOptionChecked('LDR', 'BLvl', '\\ - invalid value');
    this.verifyDropdownOptionChecked('LDR', 'Ctrl', '\\ - No specified type');
    this.verifyLDRPositionsDefaultValues('records[0].content.9-16 positions', 'a2200000');
    this.verifyLDRPositionsDefaultValues('records[0].content.ELvl', 'u', false);
    this.verifyDropdownOptionChecked('LDR', 'Desc', 'u - Unknown');
    this.verifyDropdownOptionChecked('LDR', 'MultiLvl', '\\ - Not specified or not applicable');
    this.verifyLDRPositionsDefaultValues('records[0].content.20-23 positions', '4500');
    this.verifyTagField(4, '245', '\\', '\\', '$a ', '');
    this.checkInitialContent(4);
    this.verifyDropdownHoverText('ui-quick-marc.record.fixedField-Status-text', 'Record status');
    this.verifyDropdownHoverText('ui-quick-marc.record.fixedField-Type-text', 'Type of record');
    this.verifyDropdownHoverText(
      'ui-quick-marc.record.fixedField-BLvl-text',
      'Bibliographic level',
    );
    this.verifyDropdownHoverText('ui-quick-marc.record.fixedField-Ctrl-text', 'Type of control');
    this.verifyDropdownHoverText('ui-quick-marc.record.fixedField-ELvl-text', 'Encoding level');
    this.verifyDropdownHoverText(
      'ui-quick-marc.record.fixedField-Desc-text',
      'Descriptive cataloging form',
    );
    this.verifyDropdownHoverText(
      'ui-quick-marc.record.fixedField-MultiLvl-text',
      'Multipart resource record level',
    );
  },

  checkDefaultFieldsInOrder() {
    cy.expect(
      QuickMarcEditorRow({ index: 0 })
        .find(TextField('Field'))
        .has({ value: 'LDR', disabled: true }),
    );
    cy.expect(
      QuickMarcEditorRow({ index: 1 })
        .find(TextField('Field'))
        .has({ value: '001', disabled: true }),
    );
    this.checkEmptyContent('001');
    cy.expect(
      QuickMarcEditorRow({ index: 2 })
        .find(TextField('Field'))
        .has({ value: '005', disabled: true }),
    );
    this.checkEmptyContent('005');
    cy.expect(
      QuickMarcEditorRow({ index: 3 })
        .find(TextField('Field'))
        .has({ value: '008', disabled: false }),
    );
    this.checkOnlyBackslashesIn008Boxes();
    cy.expect(
      QuickMarcEditorRow({ index: 4 })
        .find(TextField('Field'))
        .has({ value: '999', disabled: true }),
    );
    this.verifyTagField(4, '999', 'f', 'f', '', '');
    this.verifyAllBoxesInARowAreDisabled(4);
  },

  checkEditableQuickMarcFormIsOpened: () => {
    cy.expect(Pane({ id: 'quick-marc-editor-pane' }).exists());
  },

  verifyNoDuplicatedFieldsWithTag: (tag) => {
    cy.get(`input[name*=".tag"][value="${tag}"]`).then((elements) => elements.length === 1);
  },
  verifyNumOfFieldsWithTag: (tag, numOfFields) => {
    cy.get(`input[name*=".tag"][value="${tag}"]`).then(
      (elements) => elements.length === numOfFields,
    );
  },

  openLinkingAuthorityByIndex(rowIndex) {
    cy.do(
      QuickMarcEditorRow({ index: rowIndex })
        .find(Link())
        .perform((element) => {
          element.removeAttribute('target');
          element.click();
        }),
    );
  },

  checkSourceValue(firstName, lastName) {
    cy.expect(
      PaneHeader({ id: 'paneHeaderquick-marc-editor-pane' })
        .find(HTML(including(`Source: ${lastName}, ${firstName}`)))
        .exists(),
    );
  },

  checkAfterSaveAndKeepEditing() {
    cy.expect(calloutAfterSaveAndClose.exists());
    cy.expect(rootSection.exists());
  },

  getCreatedMarcBib(marcBibTitle, timeOutSeconds = 120) {
    let timeCounter = 0;
    function checkBib() {
      cy.okapiRequest({
        path: 'instance-storage/instances',
        searchParams: { query: `(title all "${marcBibTitle}")` },
        isDefaultSearchParamsRequired: false,
      }).then(({ body }) => {
        if (body.instances[0] || timeCounter >= timeOutSeconds) {
          cy.expect(body.instances[0].title).equals(marcBibTitle);
          cy.wrap(body.instances[0]).as('bib');
        } else {
          cy.wait(1000);
          checkBib();
          timeCounter++;
        }
      });
    }
    checkBib();
    return cy.get('@bib');
  },

  getCreatedMarcHoldings(marcBibId, holdingsNote, timeOutSeconds = 120) {
    let timeCounter = 0;
    function checkHoldings() {
      cy.okapiRequest({
        path: 'holdings-storage/holdings',
        searchParams: { query: `(notes="${holdingsNote}" and instanceId=="${marcBibId}")` },
        isDefaultSearchParamsRequired: false,
      }).then(({ body }) => {
        if (body.holdingsRecords[0] || timeCounter >= timeOutSeconds) {
          cy.expect(body.holdingsRecords[0].instanceId).equals(marcBibId);
          cy.wrap(body.holdingsRecords[0]).as('holdings');
        } else {
          cy.wait(1000);
          checkHoldings();
          timeCounter++;
        }
      });
    }
    checkHoldings();
    return cy.get('@holdings');
  },

  verifyDropdownValueOfLDRIsValid(dropdownLabel, isValid = true) {
    cy.expect(
      QuickMarcEditorRow({ tagValue: 'LDR' })
        .find(Select({ label: including(dropdownLabel) }))
        .has({ valid: isValid }),
    );
  },

  verifyBoxLabelsInLDRFieldInMarcAuthorityRecord() {
    cy.expect([
      fieldLDR
        .find(TextField({ name: including('records[0].content.Record length') }))
        .has({ disabled: true }),
      fieldLDR.find(Select({ label: AUTHORITY_LDR_FIELD_DROPDOWNS_NAMES.STATUS })).exists(),
      fieldLDR.find(Select({ label: AUTHORITY_LDR_FIELD_DROPDOWNS_NAMES.TYPE })).exists(),
      fieldLDR
        .find(TextField({ name: including('records[0].content.7-16 positions') }))
        .has({ disabled: true }),
      fieldLDR.find(Select({ label: AUTHORITY_LDR_FIELD_DROPDOWNS_NAMES.ELVL })).exists(),
      fieldLDR.find(Select({ label: AUTHORITY_LDR_FIELD_DROPDOWNS_NAMES.PUNCT })).exists(),
      fieldLDR
        .find(TextField({ name: including('records[0].content.19-23 positions') }))
        .has({ disabled: true }),
    ]);
  },

  verifyBoxLabelsInLDRFieldInMarcHoldingRecord() {
    cy.expect([
      fieldLDR
        .find(TextField({ name: including('records[0].content.Record length') }))
        .has({ disabled: true }),
      fieldLDR.find(Select({ label: MARC_HOLDING_LDR_FIELD_DROPDOWNS_NAMES.STATUS })).exists(),
      fieldLDR.find(Select({ label: MARC_HOLDING_LDR_FIELD_DROPDOWNS_NAMES.TYPE })).exists(),
      fieldLDR
        .find(TextField({ name: including('records[0].content.7-16 positions') }))
        .has({ disabled: true }),
      fieldLDR.find(Select({ label: MARC_HOLDING_LDR_FIELD_DROPDOWNS_NAMES.ELVL })).exists(),
      fieldLDR.find(Select({ label: MARC_HOLDING_LDR_FIELD_DROPDOWNS_NAMES.ITEM })).exists(),
      fieldLDR
        .find(TextField({ name: including('records[0].content.19-23 positions') }))
        .has({ disabled: true, value: '\\4500' }),
    ]);
  },

  verifyBoxLabelsInLDRFieldInMarcBibRecord() {
    cy.expect([
      fieldLDR
        .find(TextField({ name: including('records[0].content.Record length') }))
        .has({ disabled: true }),
      fieldLDR.find(Select({ label: INVENTORY_LDR_FIELD_DROPDOWNS_NAMES.STATUS })).exists(),
      fieldLDR.find(Select({ label: INVENTORY_LDR_FIELD_DROPDOWNS_NAMES.TYPE })).exists(),
      fieldLDR.find(Select({ label: INVENTORY_LDR_FIELD_DROPDOWNS_NAMES.BLVL })).exists(),
      fieldLDR.find(Select({ label: INVENTORY_LDR_FIELD_DROPDOWNS_NAMES.CTRL })).exists(),
      fieldLDR
        .find(TextField({ name: including('records[0].content.9-16 positions') }))
        .has({ disabled: true }),

      fieldLDR.find(TextField('ELvl')).exists(),
      fieldLDR.find(TextField('ELvl')).has({ readOnly: false }),

      fieldLDR.find(Select({ label: INVENTORY_LDR_FIELD_DROPDOWNS_NAMES.DESC })).exists(),
      fieldLDR.find(Select({ label: INVENTORY_LDR_FIELD_DROPDOWNS_NAMES.MULTILVL })).exists(),
      fieldLDR
        .find(TextField({ name: including('records[0].content.20-23 positions') }))
        .has({ disabled: true, value: '4500' }),
    ]);
  },

  verifyInitialLDRFieldsValuesInMarcHoldingRecord() {
    cy.expect([
      fieldLDR
        .find(TextField({ name: including('records[0].content.Record length') }))
        .has({ disabled: true, value: '00000' }),
      fieldLDR.find(Select({ label: MARC_HOLDING_LDR_FIELD_DROPDOWNS_NAMES.STATUS })).exists(),
      fieldLDR
        .find(Select({ label: MARC_HOLDING_LDR_FIELD_DROPDOWNS_NAMES.STATUS }))
        .has({ checkedOptionText: MARC_HOLDING_LDR_FIELD_STATUS_DROPDOWN.N }),
      fieldLDR.find(Select({ label: MARC_HOLDING_LDR_FIELD_DROPDOWNS_NAMES.TYPE })).exists(),
      fieldLDR
        .find(Select({ label: MARC_HOLDING_LDR_FIELD_DROPDOWNS_NAMES.TYPE }))
        .has({ checkedOptionText: MARC_HOLDING_LDR_FIELD_TYPE_DROPDOWN.U }),
      fieldLDR
        .find(TextField({ name: including('records[0].content.7-16 positions') }))
        .has({ disabled: true, value: '\\\\\\2200000' }),
      fieldLDR.find(Select({ label: MARC_HOLDING_LDR_FIELD_DROPDOWNS_NAMES.ELVL })).exists(),
      fieldLDR
        .find(Select({ label: MARC_HOLDING_LDR_FIELD_DROPDOWNS_NAMES.ELVL }))
        .has({ checkedOptionText: MARC_HOLDING_LDR_FIELD_ELVL_DROPDOWN.U }),
      fieldLDR.find(Select({ label: MARC_HOLDING_LDR_FIELD_DROPDOWNS_NAMES.ITEM })).exists(),
      fieldLDR
        .find(Select({ label: MARC_HOLDING_LDR_FIELD_DROPDOWNS_NAMES.ITEM }))
        .has({ checkedOptionText: MARC_HOLDING_LDR_FIELD_ITEM_DROPDOWN.N }),
      fieldLDR
        .find(TextField({ name: including('records[0].content.19-23 positions') }))
        .has({ disabled: true, value: '\\4500' }),
    ]);
  },

  verifyBoxValuesInLDRFieldInMarcAuthorityRecord(
    field0to4value,
    statusOption,
    typeOption,
    field7to16value,
    elvlOption,
    punctOption,
    field19to23value,
  ) {
    cy.expect([
      fieldLDR
        .find(TextField({ name: including('records[0].content.Record length') }))
        .has({ disabled: true, value: field0to4value }),
      fieldLDR
        .find(Select({ label: AUTHORITY_LDR_FIELD_DROPDOWNS_NAMES.STATUS }))
        .has({ checkedOptionText: statusOption }),
      fieldLDR
        .find(Select({ label: AUTHORITY_LDR_FIELD_DROPDOWNS_NAMES.TYPE }))
        .has({ checkedOptionText: typeOption }),
      fieldLDR
        .find(TextField({ name: including('records[0].content.7-16 positions') }))
        .has({ disabled: true, value: field7to16value }),
      fieldLDR
        .find(Select({ label: AUTHORITY_LDR_FIELD_DROPDOWNS_NAMES.ELVL }))
        .has({ checkedOptionText: elvlOption }),
      fieldLDR
        .find(Select({ label: AUTHORITY_LDR_FIELD_DROPDOWNS_NAMES.PUNCT }))
        .has({ checkedOptionText: punctOption }),
      fieldLDR
        .find(TextField({ name: including('records[0].content.19-23 positions') }))
        .has({ disabled: true, value: field19to23value }),
    ]);
  },

  fillInElvlBoxInLDRField(value) {
    cy.do(
      fieldLDR
        .find(TextField({ label: MARC_HOLDING_LDR_FIELD_DROPDOWNS_NAMES.ELVL }))
        .fillIn(value),
    );
  },

  verifyValueInElvlBoxInLDRField(boxValue) {
    cy.expect(
      fieldLDR
        .find(TextField({ label: MARC_HOLDING_LDR_FIELD_DROPDOWNS_NAMES.ELVL }))
        .has({ value: boxValue }),
    );
  },

  selectValidOptionsFor008FieldWhenUpdatingTypeDropdownInLDRField(selectedDropdownTypeOption) {
    switch (selectedDropdownTypeOption) {
      case INVENTORY_LDR_FIELD_TYPE_DROPDOWN.C:
      case INVENTORY_LDR_FIELD_TYPE_DROPDOWN.D:
      case INVENTORY_LDR_FIELD_TYPE_DROPDOWN.I:
        this.selectFieldsDropdownOption('008', 'Comp', 'an - Anthems');
        cy.wait(1000);
        this.selectFieldsDropdownOption('008', 'FMus', 'a - Full score');
        cy.wait(1000);
        break;

      case INVENTORY_LDR_FIELD_TYPE_DROPDOWN.E:
      case INVENTORY_LDR_FIELD_TYPE_DROPDOWN.F:
        cy.wait(1000);
        this.selectFieldsDropdownOption('008', 'CrTp', 'a - Single map');
        cy.wait(1000);
        this.selectFieldsDropdownOption('008', 'Indx', '0 - No index');
        cy.wait(1000);
        break;

      case INVENTORY_LDR_FIELD_TYPE_DROPDOWN.G:
      case INVENTORY_LDR_FIELD_TYPE_DROPDOWN.K:
      case INVENTORY_LDR_FIELD_TYPE_DROPDOWN.O:
      case INVENTORY_LDR_FIELD_TYPE_DROPDOWN.R:
        cy.wait(1000);
        this.selectFieldsDropdownOption('008', 'TMat', 'a - Art original');
        cy.wait(1000);
        this.selectFieldsDropdownOption('008', 'Tech', 'a - Animation');
        cy.wait(1000);
        break;

      case INVENTORY_LDR_FIELD_TYPE_DROPDOWN.M:
        cy.wait(1000);
        this.selectFieldsDropdownOption('008', 'File', 'a - Numeric data');
        break;

      case INVENTORY_LDR_FIELD_TYPE_DROPDOWN.T:
        cy.wait(1000);
        this.selectFieldsDropdownOption('008', 'Conf', '0 - Not a conference publication');
        cy.wait(1000);
        this.selectFieldsDropdownOption('008', 'Fest', '0 - Not a festschrift');
        cy.wait(1000);
        this.selectFieldsDropdownOption('008', 'Indx', '0 - No index');
        cy.wait(1000);
        this.selectFieldsDropdownOption('008', 'LitF', '0 - Not fiction (not further specified)');
        cy.wait(1000);
        break;

      default:
        break;
    }
  },

  check008FieldBoxesAbsent(...boxesNames) {
    boxesNames.forEach((boxName) => {
      cy.expect(
        getRowInteractorByTagName('008')
          .find(quickMarcEditorRowContent)
          .find(Label(boxName))
          .absent(),
      );
    });
  },

  verifyAllBoxesInARowAreDisabled(rowNumber, isDisabled = true, indicatorsShown = true) {
    cy.expect([
      getRowInteractorByRowNumber(rowNumber).find(TextField('Field')).has({ disabled: isDisabled }),
      getRowInteractorByRowNumber(rowNumber)
        .find(TextArea({ ariaLabel: 'Subfield' }))
        .has({ disabled: isDisabled }),
    ]);
    if (indicatorsShown) {
      cy.expect([
        getRowInteractorByRowNumber(rowNumber)
          .find(TextField('Indicator', { name: including('.indicators[0]') }))
          .has({ disabled: isDisabled }),
        getRowInteractorByRowNumber(rowNumber)
          .find(TextField('Indicator', { name: including('.indicators[1]') }))
          .has({ disabled: isDisabled }),
      ]);
    } else {
      cy.expect([getRowInteractorByRowNumber(rowNumber).find(TextField('Indicator')).absent()]);
    }
  },

  selectOptionsIn008FieldRelfDropdowns(...options) {
    options.forEach((option, index) => {
      cy.do(
        QuickMarcEditorRow({ tagValue: '008' })
          .find(Select({ name: including(`records[3].content.Relf[${index}]`) }))
          .choose(option),
      );
    });
  },

  checkOptionsSelectedIn008FieldRelfDropdowns(...options) {
    options.forEach((option, index) => {
      cy.expect(
        QuickMarcEditorRow({ tagValue: '008' })
          .find(Select({ name: including(`records[3].content.Relf[${index}]`) }))
          .has({ checkedOptionText: option }),
      );
    });
  },

  checkDropdownMarkedAsInvalid(tag, dropdownLabel, isMarked = true) {
    cy.expect(
      QuickMarcEditorRow({ tagValue: tag })
        .find(Select({ label: including(dropdownLabel), valid: !isMarked }))
        .exists(),
    );
  },

  checkFieldContainsValueByIndex(rowIndex, value, tag) {
    const targetRow = QuickMarcEditorRow({ index: rowIndex });
    cy.expect(
      targetRow
        .find(TextArea({ name: `records[${rowIndex}].content` }))
        .has({ value: including(value) }),
    );
    if (tag) {
      cy.expect(
        targetRow.find(TextField({ name: `records[${rowIndex}].tag` })).has({ value: tag }),
      );
    }
  },

  checkLinkedFieldContainsControlledValueByIndex(rowIndex, value, tag) {
    const targetRow = QuickMarcEditorRow({ index: rowIndex });
    cy.expect(
      targetRow
        .find(TextArea({ name: `records[${rowIndex}].subfieldGroups.controlled` }))
        .has({ value: including(value) }),
    );
    if (tag) {
      cy.expect(
        targetRow.find(TextField({ name: `records[${rowIndex}].tag` })).has({ value: tag }),
      );
    }
  },

  closeModalWithEscapeKey() {
    cy.get('[class^="modal-"]').type('{esc}');
    cy.expect(Modal().absent());
  },

  verifySlowInternetConnectionModal() {
    cy.expect(slowInternetConnectionModal.exists());
    cy.expect(Spinner().exists());
  },

  discardChangesWithEscapeKey(index) {
    this.moveCursorToTagBox(index);
    cy.get(`[data-row="record-row[${index}]"]`).type('{esc}');
  },

  verifyValidationCallout(warningCount, failCount = 0) {
    const matchers = [including(validationCalloutMainText)];
    if (warningCount) {
      matchers.push(including(`Warn errors: ${warningCount}`));
    }
    if (failCount) {
      matchers.push(including(`Fail errors: ${failCount}`));
      matchers.push(including(validationFailErrorMessage));
    }
    cy.expect(Callout(and(...matchers)).exists());
  },

  checkErrorMessageForFieldByTag(tagValue, errorMessage) {
    cy.expect(
      QuickMarcEditorRow({ tagValue })
        .find(TextArea({ error: errorMessage }))
        .exists(),
    );
  },

  checkWarningMessageForFieldByTag(tagValue, warningMessage) {
    cy.expect(
      QuickMarcEditorRow({ tagValue })
        .find(TextArea({ warning: warningMessage }))
        .exists(),
    );
  },

  checkDerivePaneheader() {
    this.checkPaneheaderContains(derivePaneHeaderText);
  },

  fillInTextBoxInField(tag, boxLabel, value, row = null) {
    const targetRow =
      row === null ? getRowInteractorByTagName(tag) : getRowInteractorByRowNumber(row);
    cy.do(targetRow.find(TextField({ label: boxLabel })).fillIn(value));
    cy.wait(500);
  },

  verifyTextBoxValueInField(tag, boxLabel, value, row = null) {
    const targetRow =
      row === null ? getRowInteractorByTagName(tag) : getRowInteractorByRowNumber(row);
    cy.expect(targetRow.find(TextField({ label: boxLabel })).has({ value }));
  },

  verifyDropdownsShownInField(rowIndex, isShown = true) {
    if (isShown) cy.expect(QuickMarcEditorRow({ index: rowIndex }).find(Select()).exists());
    else cy.expect(QuickMarcEditorRow({ index: rowIndex }).find(Select()).absent());
  },

  checkSearchButtonShownIn010Field({ checkHoverText = false } = {}) {
    cy.expect(getRowInteractorByTagName('010').find(searchButtonIn010Field).exists());
    if (checkHoverText) {
      cy.do(getRowInteractorByTagName('010').find(searchButtonIn010Field).hoverMouse());
      cy.expect(Tooltip().has({ text: 'Search for records by 010 value(s)' }));
    }
  },

  checkAddButtonShownInField(tag, isShown = true) {
    const targetButton = getRowInteractorByTagName(tag).find(addFieldButton);
    if (isShown) cy.expect(targetButton.exists());
    else cy.expect(targetButton.absent());
  },

  clickSearchButtonIn010Field() {
    cy.do(
      getRowInteractorByTagName('010')
        .find(searchButtonIn010Field)
        .perform((element) => {
          if (element.hasAttribute('target') && element.getAttribute('target') === '_blank') {
            element.removeAttribute('target');
          }
          element.click();
        }),
    );
    cy.url().should('include', 'advancedSearch');
  },

  verifyFieldDropdownFocused(tag, dropdownLabel, isFocused = true, row = null) {
    const targetRow =
      row === null ? getRowInteractorByTagName(tag) : getRowInteractorByRowNumber(row);
    cy.expect(
      targetRow
        .find(Select({ label: matching(new RegExp(`^${dropdownLabel}\\**$`)) }))
        .has({ focused: isFocused }),
    );
  },

  verifyIndicatorBoxIsFocused(tag, indicatorIndex, row = null) {
    const targetRow =
      row === null ? getRowInteractorByTagName(tag) : getRowInteractorByRowNumber(row);
    const indicator = indicatorIndex ? secondIndicatorBox : firstIndicatorBox;
    cy.expect(targetRow.find(indicator).has({ focused: true }));
  },

  focusOnFieldsDropdown(tag, dropdownLabel, row = null) {
    const targetRow =
      row === null ? getRowInteractorByTagName(tag) : getRowInteractorByRowNumber(row);
    cy.do(
      targetRow.find(Select({ label: matching(new RegExp(`^${dropdownLabel}\\**$`)) })).focus(),
    );
    cy.wait(500);
  },

  close() {
    cy.do(QuickMarcEditor().find(PaneHeader()).find(closeButton).click());
  },

  verifyFieldBoxFocused(tag, boxLabel, isFocused = true, row = null) {
    const targetRow =
      row === null ? getRowInteractorByTagName(tag) : getRowInteractorByRowNumber(row);
    cy.expect(
      targetRow
        .find(TextField(matching(new RegExp(`^${boxLabel}\\**$`))))
        .has({ focused: isFocused }),
    );
  },

  focusOnFieldBox(tag, boxLabel, row = null) {
    const targetRow =
      row === null ? getRowInteractorByTagName(tag) : getRowInteractorByRowNumber(row);
    cy.do(targetRow.find(TextField(matching(new RegExp(`^${boxLabel}\\**$`)))).focus());
    cy.wait(500);
  },

  checkSomeDropdownsMarkedAsInvalid(tag, someInvalid = true) {
    const invalidDropdown = getRowInteractorByTagName(tag).find(Select({ valid: false }));
    if (someInvalid) cy.expect(invalidDropdown.exists());
    else cy.expect(invalidDropdown.absent());
  },

  checkUnlinkButtonShown(tag, isShown = true, rowIndex = null) {
    const targetButton =
      rowIndex === null
        ? getRowInteractorByTagName(tag).find(unlinkIconButton)
        : getRowInteractorByRowNumber(rowIndex).find(unlinkIconButton);
    if (isShown) cy.expect(targetButton.exists());
    else cy.expect(targetButton.absent());
  },

  /**
    A method for linking MARC bibliographic and authority records via API.
    `bibFieldIndexes` to be used in case of multiple bib fields with the same tag
  */
  linkMarcRecordsViaApi({
    bibId,
    authorityIds,
    bibFieldTags,
    authorityFieldTags,
    finalBibFieldContents,
    bibFieldIndexes = null,
  } = {}) {
    let relatedRecordVersion;
    const linkingRuleIds = [];
    const authorityNaturalIds = [];
    const sourceFileIds = [];
    const sourceFileUrls = [];

    cy.then(() => {
      cy.getAllRulesViaApi().then((rules) => {
        bibFieldTags.forEach((bibFieldTag, index) => {
          linkingRuleIds.push(
            rules
              .filter((rule) => rule.bibField === bibFieldTag)
              .find((rule) => rule.authorityField === authorityFieldTags[index]).id,
          );
        });
      });
      cy.getInstanceAuditDataViaAPI(bibId).then((auditData) => {
        relatedRecordVersion = `${auditData.totalRecords}`;
      });
      authorityIds.forEach((authorityId) => {
        cy.okapiRequest({
          path: 'search/authorities',
          searchParams: { query: `id=="${authorityId}"` },
          isDefaultSearchParamsRequired: false,
        }).then((res) => {
          authorityNaturalIds.push(res.body.authorities[0].naturalId);
          const sourceFileId = res.body.authorities[0].sourceFileId;
          sourceFileIds.push(sourceFileId);

          if (sourceFileId && sourceFileId !== 'NULL') {
            cy.getAuthoritySourceFileDataByIdViaAPI(sourceFileId).then((sourceFileData) => {
              sourceFileUrls.push(sourceFileData.baseUrl);
            });
          } else sourceFileUrls.push('');
        });
      });
    }).then(() => {
      cy.getMarcRecordDataViaAPI(bibId).then((marcData) => {
        const updatedMarcData = { ...marcData };
        bibFieldTags.forEach((bibFieldTag, index) => {
          const targetFieldIndex =
            bibFieldIndexes !== null
              ? bibFieldIndexes[index] - 1
              : updatedMarcData.fields.findIndex((field) => field.tag === bibFieldTag);
          updatedMarcData.fields[targetFieldIndex].content =
            `${finalBibFieldContents[index]} $0 ${sourceFileUrls[index]}${authorityNaturalIds[index]} $9 ${authorityIds[index]}`;
          updatedMarcData.fields[targetFieldIndex].linkDetails = {
            authorityId: authorityIds[index],
            authorityNaturalId: authorityNaturalIds[index],
            linkingRuleId: linkingRuleIds[index],
            status: 'NEW',
          };
        });
        updatedMarcData.relatedRecordVersion = relatedRecordVersion;

        cy.updateMarcRecordDataViaAPI(marcData.parsedRecordId, updatedMarcData);
        cy.recurse(
          () => cy.getMarcRecordDataViaAPI(bibId),
          (marcBibData) => {
            return bibFieldTags.every((bibFieldTag, index) => {
              const targetFieldIndex =
                bibFieldIndexes !== null
                  ? bibFieldIndexes[index] - 1
                  : marcBibData.fields.findIndex((field) => field.tag === bibFieldTag);
              return (
                marcBibData.fields[targetFieldIndex].linkDetails?.authorityId ===
                authorityIds[index]
              );
            });
          },
          {
            limit: 20,
            timeout: 40000,
            delay: 1000,
          },
        );
      });
    });
  },

  verifyValuesInLdrNonEditableBoxes({
    positions0to4BoxValues,
    positions9to16BoxValues,
    positions20to23BoxValues,
  } = {}) {
    const positions0to4Box = TextField({ name: 'records[0].content.Record length' });
    const positions9to16Box = TextField({ name: 'records[0].content.9-16 positions' });
    const positions20to23Box = TextField({ name: 'records[0].content.20-23 positions' });
    if (positions0to4BoxValues) cy.expect(positions0to4Box.has({ value: positions0to4BoxValues, disabled: true }));
    if (positions9to16BoxValues) cy.expect(positions9to16Box.has({ value: positions9to16BoxValues, disabled: true }));
    if (positions20to23BoxValues) cy.expect(positions20to23Box.has({ value: positions20to23BoxValues, disabled: true }));
  },

  checkMarcBibHeader({ instanceTitle, status }, userName) {
    const dateMatchers = [];
    for (let i = -2; i <= 2; i++) {
      dateMatchers.push(
        including(`Last updated: ${moment.utc().add(i, 'minutes').format(paneheaderDateFormat)}`),
      );
    }
    const targetPane = Pane(matching(new RegExp(`Edit .*MARC record - ${instanceTitle}`)));
    cy.expect(targetPane.exists());
    cy.expect(
      targetPane.has({
        subtitle: and(
          including('Status:'),
          including(status),
          including('Last updated:'),
          including(`Source: ${userName}`),
        ),
      }),
    );
    cy.expect(targetPane.has({ subtitle: or(...dateMatchers) }));
  },

  verifyBoxIsFocusedInLinkedField(tag, boxNumber) {
    const boxes = [
      tagBox,
      firstIndicatorBox,
      secondIndicatorBox,
      fourthBoxInLinkedField,
      fifthBoxInLinkedField,
      sixthBoxInLinkedField,
      seventhBoxInLinkedField,
    ];
    cy.expect(
      getRowInteractorByTagName(tag)
        .find(boxes[boxNumber - 1])
        .has({ focused: true }),
    );
  },

  verifyFieldTextBoxFocused(tag, boxLabel, isFocused = true, row = null) {
    const targetRow =
      row === null ? getRowInteractorByTagName(tag) : getRowInteractorByRowNumber(row);
    cy.expect(targetRow.find(TextField({ label: boxLabel })).has({ focused: isFocused }));
  },

  verifyRowOrderByTags(expectedTagsOrder) {
    expectedTagsOrder.forEach((tag, index) => {
      cy.expect(
        QuickMarcEditorRow({ index })
          .find(TextField({ name: `records[${index}].tag` }))
          .has({ value: tag }),
      );
    });
  },
};
