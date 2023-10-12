import {
  QuickMarcEditor,
  QuickMarcEditorRow,
  TextArea,
  Section,
  Button,
  Modal,
  Callout,
  TextField,
  and,
  some,
  Pane,
  HTML,
  including,
  PaneContent,
  PaneHeader,
  Tooltip,
  Select,
} from '../../../interactors';
import dateTools from '../utils/dateTools';
import getRandomPostfix from '../utils/stringTools';
import InventoryInstance from './inventory/inventoryInstance';
import Institutions from './settings/tenant/location-setup/institutions';

const rootSection = Section({ id: 'quick-marc-editor-pane' });
const viewMarcSection = Section({ id: 'marc-view-pane' });
const cancelButton = Button('Cancel');
const closeWithoutSavingBtn = Button('Close without saving');
const xButton = Button({ ariaLabel: 'Close ' });
const addFieldButton = Button({ ariaLabel: 'plus-sign' });
const deleteFieldButton = Button({ ariaLabel: 'trash' });
const linkToMarcRecordButton = Button({ ariaLabel: 'link' });
const unlinkIconButton = Button({ ariaLabel: 'unlink' });
const viewAuthorutyIconButton = Button({ ariaLabel: 'eye-open' });
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
const saveButton = Modal().find(
  Button({ id: 'clickable-quick-marc-update-linked-bib-fields-confirm' }),
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
const calloutNo245MarcTag = Callout('Record cannot be saved without field 245.');
const calloutMultiple245MarcTags = Callout('Record cannot be saved with more than one field 245.');
const calloutMultiple001MarcTags = Callout('Record cannot be saved. Can only have one MARC 001.');

const closeButton = Button({ icon: 'times' });
const validRecord = InventoryInstance.validOCLC;
const validNewMarBibLDR = '00000naa\\a2200000uu\\4500';
const specRetInputNamesHoldings008 = [
  'records[3].content.Spec ret[0]',
  'records[3].content.Spec ret[1]',
  'records[3].content.Spec ret[2]',
];

const paneHeader = PaneHeader({ id: 'paneHeaderquick-marc-editor-pane' });
const linkHeadingsButton = Button('Link headings');
const arrowDownButton = Button({ icon: 'arrow-down' });
const buttonLink = Button({ icon: 'unlink' });

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
  { interactor: TextField('Srce'), defaultValue: '\\' },
  { interactor: TextField('Audn'), defaultValue: '\\' },
  { interactor: TextField('Lang'), defaultValue: '\\\\\\' },
  { interactor: TextField('Form'), defaultValue: '\\' },
  { interactor: TextField('Conf'), defaultValue: '\\' },
  { interactor: TextField('Biog'), defaultValue: '\\' },
  { interactor: TextField('MRec'), defaultValue: '\\' },
  { interactor: TextField('Ctry'), defaultValue: '\\\\\\' },
  { interactor: TextField('GPub'), defaultValue: '\\' },
  { interactor: TextField('LitF'), defaultValue: '\\' },
  { interactor: TextField('Indx'), defaultValue: '\\' },
  { interactor: TextField('Fest'), defaultValue: '\\' },
  { interactor: TextField('DtSt'), defaultValue: '\\' },
  { interactor: TextField('Start date'), defaultValue: '\\\\\\\\' },
  { interactor: TextField('End date'), defaultValue: '\\\\\\\\' },
];

const defaultFieldValues = {
  content: 'qwe',
  subfieldPrefixInEditor: '$',
  subfieldPrefixInSource: '‡',
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
    interactor: TextField('Spec ret', { name: 'records[3].content.Spec ret[0]' }),
    defaultValue: '\\',
  },
  {
    interactor: TextField('Spec ret', { name: 'records[3].content.Spec ret[1]' }),
    defaultValue: '\\',
  },
  {
    interactor: TextField('Spec ret', { name: 'records[3].content.Spec ret[2]' }),
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
const secondIndicatorBox = TextField({ name: including('.indicators[0]') });
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
const holdingsLocationSelectDisabled = holdingsLocationModal.find(
  Button({ name: 'locationId', disabled: true }),
);
const holdingsLocationSaveButton = holdingsLocationModal.find(Button('Save and close'));

export default {
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

  deletePenaltField() {
    const shouldBeRemovedRowNumber = this.getInitialRowsCount() - 1;
    cy.expect(getRowInteractorByRowNumber(shouldBeRemovedRowNumber).exists());
    cy.then(() => QuickMarcEditor().presentedRowsProperties()).then((presentedRowsProperties) => {
      const shouldBeDeletedRowTag = presentedRowsProperties[shouldBeRemovedRowNumber].tag;
      cy.do(getRowInteractorByRowNumber(shouldBeRemovedRowNumber).find(deleteFieldButton).click());
      cy.wrap(shouldBeDeletedRowTag).as('specialTag');
    });
    return cy.get('@specialTag');
  },

  pressSaveAndClose() {
    cy.do(saveAndCloseButton.click());
  },

  pressSaveAndKeepEditing(calloutMsg) {
    cy.do(saveAndKeepEditingBtn.click());
    cy.expect(Callout(calloutMsg).exists());
  },

  pressCancel() {
    cy.do(cancelButton.click());
  },

  clickSaveAndCloseThenCheck(records) {
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

  clickLinkHeadingsButton() {
    cy.do(paneHeader.find(linkHeadingsButton).click());
  },

  checkLinkHeadingsButton() {
    cy.expect(paneHeader.find(linkHeadingsButton).exists());
  },

  verifyEnabledLinkHeadingsButton() {
    cy.expect(paneHeader.find(linkHeadingsButton).has({ disabled: false }));
  },

  verifyDisabledLinkHeadingsButton() {
    cy.expect(paneHeader.find(linkHeadingsButton).has({ disabled: true }));
  },

  clickArrowDownButton(rowIndex) {
    cy.do(QuickMarcEditorRow({ index: rowIndex }).find(arrowDownButton).click());
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
      });
  },

  checkAbsenceOfLinkHeadingsButton() {
    cy.expect(paneHeader.find(linkHeadingsButton).absent());
  },

  clickUnlinkIconInTagField(rowIndex) {
    cy.do(QuickMarcEditorRow({ index: rowIndex }).find(unlinkIconButton).click());
    cy.expect(unlinkModal.exists());
    cy.do(unlinkModal.find(unlinkButtonInsideModal).click());
  },

  checkUnlinkModal(rowIndex, text) {
    cy.do(QuickMarcEditorRow({ index: rowIndex }).find(unlinkIconButton).click());
    cy.expect([
      unlinkModal.exists(),
      unlinkButtonInsideModal.exists(),
      cancelUnlinkButtonInsideModal.exists(),
      unlinkModal.has({ content: including(text) }),
    ]);
    cy.do(unlinkModal.find(unlinkButtonInsideModal).click());
  },

  cancelEditConfirmationPresented() {
    cy.expect(cancelEditConformModel.exists());
  },

  confirmEditCancel() {
    cy.do(cancelEditConfirmBtn.click());
  },

  cancelEditConformation() {
    cy.expect(cancelEditConformModel.exists());
    cy.do(cancelEditConfirmBtn.click());
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

  closeEditorPane() {
    cy.do(PaneHeader().find(closeButton).click());
    cy.expect([rootSection.absent(), instanceDetailsPane.exists()]);
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

  afterDeleteNotification(tag) {
    cy.get('[class^=deletedRowPlaceholder-]').should(
      'include.text',
      `Field ${tag} has been deleted from this MARC record.`,
    );
    cy.get('[class^=deletedRowPlaceholder-]').contains('span', 'Undo');
  },

  undoDelete() {
    cy.get('[class^=deletedRowPlaceholder-]').contains('span', 'Undo').click();
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

  moveFieldUp(rowNumber) {
    cy.do(QuickMarcEditorRow({ index: rowNumber }).find(arrowUpButton).click());
  },

  checkFieldContentMatch(selector, regExp) {
    cy.get(selector)
      .invoke('val')
      .then((text) => {
        expect(text).to.match(regExp);
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
      QuickMarcEditorRow({ tagValue: tag }).find(viewAuthorutyIconButton).exists(),
    ]);
  },

  verifyAfterLinkingUsingRowIndex(tag, rowIndex) {
    cy.expect([
      Callout(`Field ${tag} has been linked to a MARC authority record.`).exists(),
      QuickMarcEditorRow({ index: rowIndex }).find(unlinkIconButton).exists(),
      QuickMarcEditorRow({ index: rowIndex }).find(viewAuthorutyIconButton).exists(),
    ]);
  },

  verifyUnlinkAndViewAuthorityButtons(rowIndex) {
    cy.expect([
      QuickMarcEditorRow({ index: rowIndex }).find(unlinkIconButton).exists(),
      QuickMarcEditorRow({ index: rowIndex }).find(viewAuthorutyIconButton).exists(),
    ]);
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

  updateExistingTagValue(rowIndex, newTagValue) {
    cy.do(
      QuickMarcEditorRow({ index: rowIndex })
        .find(TextField({ name: including('.tag') }))
        .fillIn(newTagValue),
    );
  },

  waitLoading() {
    cy.expect([
      Pane({ id: 'quick-marc-editor-pane' }).exists(),
      QuickMarcEditorRow({ tagValue: '999' }).exists(),
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

      // eslint-disable-next-line no-unused-expressions
      expect(actualJoinedFieldNames).to.be.empty;
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

  updateAllDefaultValuesIn008TagInAuthority() {
    validRecord.tag008AuthorityBytesProperties.getAllProperties().forEach((byteProperty) => {
      cy.do(
        QuickMarcEditorRow({ tagValue: '008' })
          .find(byteProperty.interactor)
          .fillIn(byteProperty.newValue),
      );
    });
    QuickMarcEditor.pressSaveAndClose();
    return validRecord.tag008AuthorityBytesProperties.getNewValueSourceLine();
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
    labels.forEach((label) => {
      cy.expect(TextField(label).exists());
    });
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
      cy.expect(field.interactor.has({ value: field.defaultValue }));
    });
  },

  getRegularTagContent(tag) {
    cy.then(() => QuickMarcEditorRow({ tagValue: tag }).find(TextArea()).textContent()).then(
      (content) => cy.wrap(content).as('tagContent'),
    );
    return cy.get('@tagContent');
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

  checkHeaderFirstLine(
    { headingReference: headingTypeFrom1XX, headingType, status },
    { firstName, name },
  ) {
    cy.expect(Pane(`Edit MARC authority record - ${headingTypeFrom1XX}`).exists());
    cy.then(() => Pane(`Edit MARC authority record - ${headingTypeFrom1XX}`).subtitle()).then(
      (subtitle) => {
        cy.expect(
          Pane({
            subtitle: and(
              including(`Status: ${status}`),
              including(headingType),
              including('Record last updated:'),
              including(`Source: ${firstName}, ${name}`),
            ),
          }),
        );
        const stringDate = `${subtitle.split('Last updated: ')[1].split(' •')[0]} UTC`;
        dateTools.verifyDate(Date.parse(stringDate), 120_000);
      },
    );
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

  checkLDRValue(ldrValue = validRecord.ldrValue) {
    cy.expect(
      getRowInteractorByTagName('LDR')
        .find(TextArea({ ariaLabel: 'Subfield' }))
        .has({ textContent: ldrValue }),
    );
  },

  checkAuthority008SubfieldsLength() {
    validRecord.tag008AuthorityBytesProperties
      .getAllProperties()
      .map((property) => property.interactor)
      .forEach((subfield) => {
        cy.expect(
          getRowInteractorByTagName('008').find(subfield).has({ maxLength: (1).toString() }),
        );
      });
  },

  checkLinkButtonExist(tag) {
    cy.expect(getRowInteractorByTagName(tag).find(linkToMarcRecordButton).exists());
  },

  checkLinkButtonToolTipText(text) {
    cy.do(getRowInteractorByTagName('100').find(linkToMarcRecordButton).hoverMouse());
    cy.expect(Tooltip().has({ text }));
  },
  checkUnlinkTooltipText(tag, text) {
    cy.do(getRowInteractorByTagName(tag).find(unlinkIconButton).hoverMouse());
    cy.expect(Tooltip().has({ text }));
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
    cy.then(() => QuickMarcEditor().rowsCount()).then((FieldsCount) => {
      cy.expect(FieldsCount).equal(expectedCount);
    });
  },

  checkAfterSaveAndCloseDerive() {
    cy.expect([calloutAfterSaveAndCloseNewRecord.exists(), instanceDetailsPane.exists()]);
  },

  verifyAndDismissRecordUpdatedCallout() {
    cy.expect(calloutAfterSaveAndClose.exists());
    cy.do(calloutAfterSaveAndClose.dismiss());
    cy.expect(calloutAfterSaveAndClose.absent());
  },

  checkFourthBoxDisabled(rowIndex) {
    cy.expect(
      getRowInteractorByRowNumber(rowIndex)
        .find(TextArea({ ariaLabel: 'Subfield' }))
        .has({ disabled: true }),
    );
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

  checkPaneheaderContains(text) {
    cy.expect(PaneHeader({ text: including(text) }).exists());
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
    this.updateExistingField('LDR', validNewMarBibLDR);
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

  verifyCalloutControlledFields(tags) {
    let tagsText = `MARC ${tags[0]}`;
    if (tags.length === 2) tagsText += ` and MARC ${tags[1]}`;
    else if (tags.length > 2) {
      for (let i = 1; i <= tags.length - 2; i++) {
        tagsText += `, MARC ${tags[i]}`;
      }
      tagsText += `, and MARC ${tags[tags.length - 1]}`;
    }
    cy.expect(
      Callout(
        tagsText +
          ' has a subfield(s) that cannot be saved because the fields are controlled by authority records.',
      ).exists(),
    );
  },

  verifyAfterLinkingAuthorityByIndex(rowIndex, tag) {
    cy.expect([
      Callout(`Field ${tag} has been linked to a MARC authority record.`).exists(),
      QuickMarcEditorRow({ index: rowIndex }).find(unlinkIconButton).exists(),
      QuickMarcEditorRow({ index: rowIndex }).find(viewAuthorutyIconButton).exists(),
    ]);
  },

  verifyRemoveLinkingModal(contentText) {
    cy.expect([
      removeLinkingModal.exists(),
      removeLinkingModal.find(removeLinkingButton).exists(),
      removeLinkingModal.find(keepLinkingButton).exists(),
      removeLinkingModal.has({ content: including(contentText) }),
    ]);
  },

  clickKeepLinkingButton() {
    cy.do(keepLinkingButton.click());
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

  verifyMultiple001TagCallout() {
    cy.expect(calloutMultiple001MarcTags.exists());
  },

  checkUserNameInHeader(firstName, lastName) {
    cy.expect(
      PaneHeader()
        .find(HTML(including(`Source: ${lastName}, ${firstName}`)))
        .exists(),
    );
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

  confirmUpdateLinkedBibsKeepEditing(linkedRecordsNumber) {
    cy.do(saveButton.click());
    cy.expect([
      Callout(
        `This record has successfully saved and is in process. ${linkedRecordsNumber} linked bibliographic record(s) updates have begun.`,
      ).exists(),
      updateLinkedBibFieldsModal.absent(),
      rootSection.exists(),
    ]);
  },

  checkAfterSaveAndCloseAuthority() {
    cy.expect([calloutAfterSaveAndClose.exists(), viewMarcSection.exists()]);
  },

  checkNoDeletePlaceholder() {
    cy.expect(
      rootSection.find(HTML(including('has been deleted from this MARC record.'))).absent(),
    );
  },

  verifyIconsAfterUnlinking(rowIndex) {
    cy.expect([
      QuickMarcEditorRow({ index: rowIndex }).find(unlinkIconButton).absent(),
      QuickMarcEditorRow({ index: rowIndex }).find(viewAuthorutyIconButton).absent(),
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

  checkOnlyBackslashesIn008Boxes() {
    cy.get('div[data-testid="bytes-field-col"]')
      .find('input')
      .then((fields) => {
        const fieldValues = Array.from(fields, (field) => field.getAttribute('value'));
        expect(fieldValues.join('')).to.match(/^\\+$/);
      });
  },

  check008BoxesCount(count) {
    cy.get('div[data-testid="bytes-field-col"]').should('have.length', count);
  },

  checkTagAbsent(tag) {
    cy.expect(getRowInteractorByTagName(tag).absent());
  },

  checkLinkingAuthorityByTag: (tag) => {
    cy.expect(buttonLink.exists());
    cy.expect(Callout(`Field ${tag} has been linked to a MARC authority record.`).exists());
  },

  clickUnlinkButton: () => {
    cy.do(buttonLink.click());
  },
};
