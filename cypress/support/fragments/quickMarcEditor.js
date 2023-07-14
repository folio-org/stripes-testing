import { QuickMarcEditor, QuickMarcEditorRow, TextArea, Section, Button, Modal, Callout, TextField, and, some, Pane, HTML, including, PaneContent, PaneHeader } from '../../../interactors';
import dateTools from '../utils/dateTools';
import getRandomPostfix from '../utils/stringTools';
import InventoryInstance from './inventory/inventoryInstance';

const rootSection = Section({ id: 'quick-marc-editor-pane' });
const viewMarcSection = Section({ id: 'marc-view-pane' });
const cancelButton = Button('Cancel');
const closeWithoutSavingBtn = Button('Close without saving');
const addFieldButton = Button({ ariaLabel : 'plus-sign' });
const deleteFieldButton = Button({ ariaLabel : 'trash' });
const linkToMarcRecordButton = Button({ ariaLabel : 'link' });
const unlinkIconButton = Button({ ariaLabel: 'unlink' });
const viewAuthorutyIconButton = Button({ ariaLabel: 'eye-open' });
const saveAndCloseButton = Button({ id:'quick-marc-record-save' });
const saveAndKeepEditingBtn = Button({ id: 'quick-marc-record-save-edit' });
const saveAndCloseButtonEnabled = Button({ id:'quick-marc-record-save', disabled: false });
const saveAndKeepEditingBtnEnabled = Button({ id: 'quick-marc-record-save-edit', disabled: false });
const saveAndCloseButtonDisabled = Button({ id:'quick-marc-record-save', disabled: true });
const saveAndKeepEditingBtnDisabled = Button({ id: 'quick-marc-record-save-edit', disabled: true });
const confirmationModal = Modal({ id: 'quick-marc-confirm-modal' });
const cancelEditConformModel = Modal({ id: 'cancel-editing-confirmation' });
const cancelEditConfirmBtn = Button('Keep editing');
const updateLinkedBibFieldsModal = Modal({ id: 'quick-marc-update-linked-bib-fields' });
const saveButton = Modal().find(Button({ id: 'clickable-quick-marc-update-linked-bib-fields-confirm' }));
const continueWithSaveButton = Modal().find(Button({ id: 'clickable-quick-marc-confirm-modal-confirm' }));
const restoreDeletedFieldsBtn = Modal().find(Button({ id: 'clickable-quick-marc-confirm-modal-cancel' }));
const quickMarcEditorRowContent = HTML({ className: including('quickMarcEditorRowContent') });
const instanceDetailsPane = Pane({ id:'pane-instancedetails' });
const unlinkModal = Modal({ id: 'quick-marc-confirm-unlink-modal' });
const unlinkButtonInsideModal = Button({ id: 'clickable-quick-marc-confirm-unlink-modal-confirm' });
const calloutAfterSaveAndClose = Callout('This record has successfully saved and is in process. Changes may not appear immediately.');
const calloutUpdatedRecord = Callout('Record has been updated.');
const calloutUpdatedLinkedBibRecord = Callout('Record has been updated. 2 linked bibliographic record(s) updates have begun.');
const calloutDelete008Error = Callout('Record cannot be saved without 008 field');
const closeButton = Button({ icon: 'times' });
const validRecord = InventoryInstance.validOCLC;
const specRetInputNamesHoldings008 = ['records[3].content.Spec ret[0]',
  'records[3].content.Spec ret[1]',
  'records[3].content.Spec ret[2]'];

const tag008HoldingsBytesProperties = {
  acqStatus : { interactor:TextField('AcqStatus'), defaultValue:'\\', newValue:'v', voidValue:' ', replacedVoidValue:'\\' },
  acqMethod :{ interactor:TextField('AcqMethod'), defaultValue:'\\', newValue:'v', voidValue:' ', replacedVoidValue:'\\' },
  acqEndDate :{ interactor:TextField('AcqEndDate'), defaultValue:'\\\\\\\\', newValue:'vvvv', voidValue:'    ', replacedVoidValue:'\\\\\\\\' },
  genRet : { interactor:TextField('Gen ret'), defaultValue:'\\', newValue:'v', voidValue:'v', replacedVoidValue:'v' },
  specRet0: { interactor:TextField('Spec ret', { name:specRetInputNamesHoldings008[0] }), defaultValue:'u', newValue:'v', voidValue:'v', replacedVoidValue:'v' },
  specRet1: { interactor:TextField('Spec ret', { name:specRetInputNamesHoldings008[1] }), defaultValue:'u', newValue:'v', voidValue:'v', replacedVoidValue:'v' },
  specRet2: { interactor:TextField('Spec ret', { name:specRetInputNamesHoldings008[2] }), defaultValue:'e', newValue:'v', voidValue:'v', replacedVoidValue:'v' },
  compl : { interactor:TextField('Compl'), defaultValue:'n', newValue:'9', voidValue:'9', replacedVoidValue:'9' },
  copies :{ interactor:TextField('Copies'), defaultValue:'g\\\\', newValue:'vvv', voidValue:'vvv', replacedVoidValue:'vvv' },
  lend : { interactor:TextField('Lend'), defaultValue:'\\', newValue:'v', voidValue:'v', replacedVoidValue:'v' },
  repro : { interactor:TextField('Repro'), defaultValue:'\\', newValue:'v', voidValue:'v', replacedVoidValue:'v' },
  lang : { interactor:TextField('Lang'), defaultValue:'\\\\\\', newValue:'vvv', voidValue:'vvv', replacedVoidValue:'vvv' },
  sepComp : { interactor:TextField('Sep/comp'), defaultValue:'\\', newValue:'v', voidValue:'v', replacedVoidValue:'v' },
  reptDate :{ interactor:TextField('Rept date'), defaultValue:'\\\\\\\\\\\\', newValue:'vvvvvv', voidValue:'vvvvvv', replacedVoidValue:'vvvvvv' },
  getUsualProperties:() => {
    return [tag008HoldingsBytesProperties.acqStatus,
      tag008HoldingsBytesProperties.acqMethod,
      tag008HoldingsBytesProperties.acqEndDate,
      tag008HoldingsBytesProperties.genRet,
      tag008HoldingsBytesProperties.compl,
      tag008HoldingsBytesProperties.copies,
      tag008HoldingsBytesProperties.lend,
      tag008HoldingsBytesProperties.repro,
      tag008HoldingsBytesProperties.lang,
      tag008HoldingsBytesProperties.sepComp,
      tag008HoldingsBytesProperties.reptDate];
  },
  getAllProperties:() => {
    return Object.values(tag008HoldingsBytesProperties).filter(objectProperty => typeof objectProperty !== 'function');
  }
};

const tag008DefaultValues = [
    { interactor:TextField('Srce'), defaultValue:'\\' },
    { interactor:TextField('Audn'), defaultValue:'\\' },
    { interactor:TextField('Lang'), defaultValue:'\\\\\\' },
    { interactor:TextField('Form'), defaultValue:'\\' },
    { interactor:TextField('Conf'), defaultValue:'\\' },
    { interactor:TextField('Biog'), defaultValue:'\\' },
    { interactor:TextField('MRec'), defaultValue:'\\' },
    { interactor:TextField('Ctry'), defaultValue:'\\\\\\' },
    { interactor:TextField('GPub'), defaultValue:'\\' },
    { interactor:TextField('LitF'), defaultValue:'\\' },
    { interactor:TextField('Indx'), defaultValue:'\\' },
    { interactor:TextField('Fest'), defaultValue:'\\' },
    { interactor:TextField('DtSt'), defaultValue:'\\' },
    { interactor:TextField('Start date'), defaultValue:'\\\\\\\\' },
    { interactor:TextField('End date'), defaultValue:'\\\\\\\\' }
];

const defaultFieldValues = {
  content:'qwe',
  subfieldPrefixInEditor: '$',
  subfieldPrefixInSource: '‡',
  // just enumerate a few free to use tags  which can be applyied in test one by one with small reserve
  freeTags: ['996', '997', '998'],
  existingLocation: '$b E'
};
defaultFieldValues.initialSubField = `${defaultFieldValues.subfieldPrefixInEditor}a `;
defaultFieldValues.contentWithSubfield = `${defaultFieldValues.initialSubField}${defaultFieldValues.content}`;
defaultFieldValues.getSourceContent = (contentInQuickMarcEditor) => contentInQuickMarcEditor.replace(defaultFieldValues.subfieldPrefixInEditor, defaultFieldValues.subfieldPrefixInSource);

const requiredRowsTags = ['LDR', '001', '005', '008', '999'];
const readOnlyAuthorityTags = ['LDR', '001', '005', '999'];

const getRowInteractorByRowNumber = (specialRowNumber) => QuickMarcEditor()
  .find(QuickMarcEditorRow({ index: specialRowNumber }));
const getRowInteractorByTagName = (tagName) => QuickMarcEditor()
  .find(QuickMarcEditorRow({ tagValue: tagName }));

const tag008DefaultValuesHoldings = [
  { interactor:TextField('AcqStatus'), defaultValue:'\\' },
  { interactor:TextField('AcqMethod'), defaultValue:'\\' },
  { interactor:TextField('AcqEndDate'), defaultValue:'\\\\\\\\' },
  { interactor:TextField('Gen ret'), defaultValue:'\\' },
  { interactor:TextField('Spec ret', { name: 'records[3].content.Spec ret[0]' }), defaultValue:'\\' },
  { interactor:TextField('Spec ret', { name: 'records[3].content.Spec ret[1]' }), defaultValue:'\\' },
  { interactor:TextField('Spec ret', { name: 'records[3].content.Spec ret[2]' }), defaultValue:'\\' },
  { interactor:TextField('Compl'), defaultValue:'\\' },
  { interactor:TextField('Copies'), defaultValue:'\\\\\\' },
  { interactor:TextField('Lend'), defaultValue:'\\' },
  { interactor:TextField('Repro'), defaultValue:'\\' },
  { interactor:TextField('Lang'), defaultValue:'\\\\\\' },
  { interactor:TextField('Sep/comp'), defaultValue:'\\' },
  { interactor:TextField('Rept date'), defaultValue:'\\\\\\\\\\\\' }
];

export default {

  getInitialRowsCount() { return validRecord.lastRowNumber; },

  addNewField(tag = defaultFieldValues.freeTags[0], fieldContent = defaultFieldValues.content) {
    this.addRow();
    return this.fillAllAvailableValues(fieldContent, tag);
  },

  addNewFieldWithSubField(tag) {
    return this.addNewField(tag, defaultFieldValues.contentWithSubfield);
  },

  addEmptyFields(rowIndex) {
    cy.do(QuickMarcEditorRow({ index: rowIndex }).find(addFieldButton).click());
  },

  addValuesToExistingField(rowIndex, tag, content, indicator0 = '\\', indicator1 = '\\') {
    cy.do([
      QuickMarcEditorRow({ index: rowIndex + 1 }).find(TextField({ name: `records[${rowIndex + 1}].tag` })).fillIn(tag),
      QuickMarcEditorRow({ index: rowIndex + 1 }).find(TextField({ name: `records[${rowIndex + 1}].indicators[0]` })).fillIn(indicator0),
      QuickMarcEditorRow({ index: rowIndex + 1 }).find(TextField({ name: `records[${rowIndex + 1}].indicators[1]` })).fillIn(indicator1),
      QuickMarcEditorRow({ index: rowIndex + 1 }).find(TextArea({ name: `records[${rowIndex + 1}].content` })).fillIn(content),
    ]);
  },

  deletePenaltField() {
    const shouldBeRemovedRowNumber = this.getInitialRowsCount() - 1;
    cy.expect(getRowInteractorByRowNumber(shouldBeRemovedRowNumber).exists());
    cy.then(() => QuickMarcEditor().presentedRowsProperties())
      .then(presentedRowsProperties => {
        const shouldBeDeletedRowTag = presentedRowsProperties[shouldBeRemovedRowNumber].tag;
        cy.do(getRowInteractorByRowNumber(shouldBeRemovedRowNumber).find(deleteFieldButton).click());
        cy.wrap(shouldBeDeletedRowTag).as('specialTag');
      });
    return cy.get('@specialTag');
  },

  pressSaveAndClose() { cy.do(saveAndCloseButton.click()); },

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
      confirmationModal.has({ content: including(`By selecting Continue with save, then ${records} field(s) will be deleted and this record will be updated. Are you sure you want to continue?`) }),
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

  clickUnlinkIconInTagField(rowIndex) {
    cy.do(QuickMarcEditorRow({ index: rowIndex }).find(unlinkIconButton).click());
    cy.expect(unlinkModal.exists());
    cy.do(unlinkModal.find(unlinkButtonInsideModal).click());
  },

  cancelEditConfirmationPresented() { cy.expect(cancelEditConformModel.exists()); },

  confirmEditCancel() { cy.do(cancelEditConfirmBtn.click()); },

  cancelEditConformation() {
    cy.expect(cancelEditConformModel.exists());
    cy.do(cancelEditConfirmBtn.click());
  },

  deleteConfirmationPresented() { cy.expect(confirmationModal.exists()); },

  confirmDelete() { cy.do(continueWithSaveButton.click()); },

  constinueWithSaveAndCheck() {
    cy.do(continueWithSaveButton.click());
    cy.expect([
      calloutUpdatedRecord.exists(),
      rootSection.absent(),
      viewMarcSection.exists(),
    ]);
  },

  constinueWithSaveAndCheckInstanceRecord() {
    cy.do(continueWithSaveButton.click());
    cy.expect([
      calloutAfterSaveAndClose.exists(),
      rootSection.absent(),
      instanceDetailsPane.exists(),
    ]);
  },

  saveAndCloseUpdatedLinkedBibField() {
    cy.do(saveAndCloseButton.click());
    cy.expect([
      updateLinkedBibFieldsModal.exists(),
      saveButton.exists(),
    ]);
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
    cy.expect([
      rootSection.absent(),
      instanceDetailsPane.exists(),
    ]);
  },

  checkFieldAbsense(tag) {
    cy.expect(PaneContent({ id: 'marc-view-pane-content', text: (including(tag)) }).absent());
  },

  addRow(rowNumber) {
    cy.do(getRowInteractorByRowNumber(rowNumber ?? this.getInitialRowsCount()).find(addFieldButton).click());
  },

  clickSaveAndKeepEditing() {
    cy.do(saveAndKeepEditingBtn.click());
    cy.expect(calloutUpdatedRecord.exists());
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
    cy.get('[class^=deletedRowPlaceholder-]').should('include.text', `Field ${tag} has been deleted from this MARC record.`);
    cy.get('[class^=deletedRowPlaceholder-]').contains('span', 'Undo');
  },

  undoDelete() {
    cy.get('[class^=deletedRowPlaceholder-]').contains('span', 'Undo').click();
  },

  afterDeleteNotificationNoTag() {
    cy.get('[class^=deletedRowPlaceholder-]').should('include.text', 'Field has been deleted from this MARC record');
    cy.get('[class^=deletedRowPlaceholder-]').contains('span', 'Undo');
  },

  checkButtonsEnabled() {
    cy.expect([
      saveAndCloseButtonEnabled.exists(),
      saveAndKeepEditingBtnEnabled.exists(),
    ]);
  },

  checkButtonsDisabled() {
    cy.expect([
      saveAndCloseButtonDisabled.exists(),
      saveAndKeepEditingBtnDisabled.exists(),
    ]);
  },

  checkAfterSaveAndClose() {
    cy.expect([
      calloutAfterSaveAndClose.exists(),
      instanceDetailsPane.exists(),
    ]);
  },

  verifyConfirmModal() {
    cy.expect(confirmationModal.exists());
    cy.expect(confirmationModal.has({ content: including('By selecting Continue with save, then 1 field(s) will be deleted and this record will be updated. Are you sure you want to continue?') }));
    cy.expect(continueWithSaveButton.exists());
    cy.expect(restoreDeletedFieldsBtn.exists());
  },

  checkInitialContent(rowNumber) {
    cy.expect(getRowInteractorByRowNumber(rowNumber ?? this.getInitialRowsCount() + 1)
      .find(TextArea({ name: `records[${rowNumber ?? this.getInitialRowsCount() + 1}].content` }))
      .has({ value: defaultFieldValues.initialSubField }));
  },

  checkContent(content, rowNumber) {
    cy.expect(getRowInteractorByRowNumber(rowNumber ?? this.getInitialRowsCount() + 1)
      .find(TextArea({ name: `records[${rowNumber ?? this.getInitialRowsCount() + 1}].content` }))
      .has({ value: content ?? defaultFieldValues.contentWithSubfield }));
  },

  checkFieldContentMatch(selector, regExp) {
   cy.get(selector).invoke('val').then(text => {
    expect(text).to.match(regExp);
   });
  },

  checkEmptyContent(tagName) {
    cy.expect(getRowInteractorByTagName(tagName).find(quickMarcEditorRowContent).exists());
    cy.expect(getRowInteractorByTagName(tagName).find(quickMarcEditorRowContent).find(TextField()).absent());
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

  verifyTagFieldAfterLinking(rowIndex, tag, secondBox, thirdBox, content, eSubfield, zeroSubfield, seventhBox) {
    cy.expect([
      QuickMarcEditorRow({ index: rowIndex }).find(TextField({ name: `records[${rowIndex}].tag` })).has({disabled: true, value: tag}),
      QuickMarcEditorRow({ index: rowIndex }).find(TextField({ name: `records[${rowIndex}].indicators[0]` })).has({disabled: true, value: secondBox}),
      QuickMarcEditorRow({ index: rowIndex }).find(TextField({ name: `records[${rowIndex}].indicators[1]` })).has({disabled: true, value: thirdBox}),
      QuickMarcEditorRow({ index: rowIndex }).find(TextArea({ name: `records[${rowIndex}].subfieldGroups.controlled` })).has({disabled: true, value: content}),
      QuickMarcEditorRow({ index: rowIndex }).find(TextArea({ name: `records[${rowIndex}].subfieldGroups.uncontrolledAlpha` })).has({disabled: false, value: eSubfield}),
      QuickMarcEditorRow({ index: rowIndex }).find(TextArea({ name: `records[${rowIndex}].subfieldGroups.zeroSubfield` })).has({disabled: true, value: zeroSubfield}),
      QuickMarcEditorRow({ index: rowIndex }).find(TextArea({ name: `records[${rowIndex}].subfieldGroups.uncontrolledNumber` })).has({disabled: false, value: seventhBox}),
      QuickMarcEditorRow({ index: rowIndex }).find(TextArea({ value: '$9' })).absent(),
    ]);
  },

  verifyTagFieldAfterUnlinking(rowIndex, tag, secondBox, thirdBox, content) {
    cy.expect([
      QuickMarcEditorRow({ index: rowIndex }).find(TextField({ name: `records[${rowIndex}].tag` })).has({value: tag}),
      QuickMarcEditorRow({ index: rowIndex }).find(TextField({ name: `records[${rowIndex}].indicators[0]` })).has({value: secondBox}),
      QuickMarcEditorRow({ index: rowIndex }).find(TextField({ name: `records[${rowIndex}].indicators[1]` })).has({value: thirdBox}),
      QuickMarcEditorRow({ index: rowIndex }).find(TextArea({ name: `records[${rowIndex}].content` })).has({value: content}),
    ]);
  },

  verifyTagField(rowIndex, tag, secondBox, thirdBox, subfieldS, subfieldI) {
    cy.expect([
      QuickMarcEditorRow({ index: rowIndex }).find(TextField({ name: `records[${rowIndex}].tag` })).has({value: tag}),
      QuickMarcEditorRow({ index: rowIndex }).find(TextField({ name: `records[${rowIndex}].indicators[0]` })).has({value: secondBox}),
      QuickMarcEditorRow({ index: rowIndex }).find(TextField({ name: `records[${rowIndex}].indicators[1]` })).has({value: thirdBox}),
      QuickMarcEditorRow({ index: rowIndex }).find(TextArea({ name: `records[${rowIndex}].content` })).has({value: including(subfieldS) }),
      QuickMarcEditorRow({ index: rowIndex }).find(TextArea({ name: `records[${rowIndex}].content` })).has({value: including(subfieldI) }),
    ]);
  },

  fillAllAvailableValues(fieldContent, tag, initialRowsCount = validRecord.lastRowNumber) {
    const contentTextArea = TextArea({ name: `records[${initialRowsCount + 1}].content` });
    const tagTextField = TextField({ name: `records[${initialRowsCount + 1}].tag` });
    const separator = '\t   \t';
    const tagValue = tag ?? defaultFieldValues.freeTags[0];
    const content = fieldContent ?? defaultFieldValues.content;

    cy.do(getRowInteractorByRowNumber(initialRowsCount + 1).find(contentTextArea).fillIn(content));
    cy.do(getRowInteractorByRowNumber(initialRowsCount + 1).find(tagTextField).fillIn(tagValue));

    if (!content.match(/^\$\w/)) {
      return `${tagValue}${separator}${defaultFieldValues.getSourceContent(`${defaultFieldValues.initialSubField}${content}`)}`;
    } else {
      return `${tagValue}${separator}${defaultFieldValues.getSourceContent(content)}`;
    }
  },

  checkRequiredFields() {
    cy.expect(QuickMarcEditor().has({
      presentedFieldsTags: and(...requiredRowsTags.map(field => some(field)))
    }));
    cy.then(() => QuickMarcEditor().presentedRowsProperties())
      .then(presentedRowsProperties => {
        // TODO: move comparing logic into custome interactors matcher
        if (!requiredRowsTags.every((tag) => presentedRowsProperties.find((rowProperties) => rowProperties.tag === tag && !rowProperties.isDeleteButtonExist))) {
          assert.fail('Button Delete is presented into required row');
        }
      });
  },

  updateExistingField(tag = validRecord.existingTag, newContent = `newContent${getRandomPostfix()}`) {
    cy.do(QuickMarcEditorRow({ tagValue: tag }).find(TextArea()).fillIn(newContent));
    return newContent;
  },

  updateExistingTagName({ currentTagName = validRecord.existingTag, newTagName }) {
    cy.then(() => QuickMarcEditorRow({ tagValue: currentTagName }).index()).then(index => {
      cy.do(QuickMarcEditorRow({ index }).find(TextField({ name: including('.tag') })).fillIn(newTagName));
    });
  },

  updateExistingFieldContent(rowIndex, newContent = `newContent${getRandomPostfix()}`) {
    cy.do(QuickMarcEditorRow({ index: rowIndex }).find(TextArea()).fillIn(newContent));
  },

  updateExistingTagValue(rowIndex, newTagValue) {
    cy.do(QuickMarcEditorRow({ index: rowIndex }).find(TextField({ name: including('.tag') })).fillIn(newTagValue));
  },

  waitLoading() {
    cy.expect(Pane({ id: 'quick-marc-editor-pane' }).exists());
  },

  getExistingLocation() {
    return defaultFieldValues.existingLocation;
  },

  getFreeTags() {
    return defaultFieldValues.freeTags;
  },

  checkInitial008TagValueFromHoldings() {
    tag008HoldingsBytesProperties.getAllProperties().forEach(specialByte => {
      cy.expect(specialByte.interactor.has({ value: specialByte.defaultValue }));
    });
  },

  // should be used only with default value of tag 008
  checkNotExpectedByteLabelsInTag008Holdings() {
    cy.then(() => QuickMarcEditor().presentedRowsProperties()).then(rowsProperties => {
      let actualJoinedFieldNames = rowsProperties.filter(rowProperty => rowProperty.tag === '008').map(rowProperty => rowProperty.content)[0].toLowerCase();

      Object.keys(tag008HoldingsBytesProperties).forEach(fieldName => {
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
          default: { actualJoinedFieldNames = actualJoinedFieldNames.replace(fieldName.toLowerCase(), '');
          }
        }
      });

      // eslint-disable-next-line no-unused-expressions
      expect(actualJoinedFieldNames).to.be.empty;
    });
  },

  // TODO: redesign. move tag008HoldingsBytesProperties to InventoryInstance.validOCLC
  updateAllDefaultValuesIn008TagInHoldings() {
    tag008HoldingsBytesProperties.getUsualProperties().forEach(byteProperty => {
      cy.do(QuickMarcEditorRow({ tagValue: '008' }).find(byteProperty.interactor).fillIn(byteProperty.newValue));
    });
    // additional steps related with Spec ret
    specRetInputNamesHoldings008.forEach(name => {
      // TODO: redesign to interactors
      cy.get(`input[name="${name}"]`).click();
      cy.get(`input[name="${name}"]`).type(`{backspace}{backspace}${tag008HoldingsBytesProperties.specRet0.newValue}`);
    });
    this.pressSaveAndClose();
    return tag008HoldingsBytesProperties.getAllProperties().map(property => property.newValue).join('');
  },

  updateAllDefaultValuesIn008TagInAuthority() {
    validRecord.tag008AuthorityBytesProperties.getAllProperties().forEach(byteProperty => {
      cy.do(QuickMarcEditorRow({ tagValue: '008' }).find(byteProperty.interactor).fillIn(byteProperty.newValue));
    });
    QuickmarcEditor.pressSaveAndClose();
    return validRecord.tag008AuthorityBytesProperties.getNewValueSourceLine();
  },

  clearTag008Holdings() {
    tag008HoldingsBytesProperties.getUsualProperties().forEach(byteProperty => {
      cy.do(QuickMarcEditorRow({ tagValue: '008' }).find(byteProperty.interactor).fillIn(byteProperty.voidValue));
    });
    this.pressSaveAndClose();
    return tag008HoldingsBytesProperties.getAllProperties().map(property => property.voidValue).join('');
  },

  checkReplacedVoidValuesInTag008Holdings() {
    tag008HoldingsBytesProperties.getAllProperties().forEach(byteProperty => {
      cy.expect(QuickMarcEditorRow({ tagValue: '008' }).find(byteProperty.interactor).has({ value: byteProperty.replacedVoidValue }));
    });
  },
  
  check008FieldContent() {
    tag008DefaultValues.forEach(field => {
      cy.expect(field.interactor.has({ value: field.defaultValue }))
    })
  },

  getRegularTagContent(tag) {
    cy.then(() => QuickMarcEditorRow({ tagValue: tag }).find(TextArea()).textContent())
      .then(content => cy.wrap(content).as('tagContent'));
    return cy.get('@tagContent');
  },

  deleteTag(rowIndex) {
    cy.do([
      QuickMarcEditorRow({ index: rowIndex }).find(TextField({ name: including('.tag') })).fillIn(''),
      QuickMarcEditorRow({ index: rowIndex }).find(deleteFieldButton).click(),
    ]);
  },

  closeWithoutSaving() {
    cy.do(cancelButton.click());
  },

  closeWithoutSavingAfterChange() {
    cy.do(cancelButton.click());
    cy.expect(closeWithoutSavingBtn.exists());
    cy.do(closeWithoutSavingBtn.click());
  },

  getSourceContent(quickmarcTagValue) { return defaultFieldValues.getSourceContent(quickmarcTagValue); },

  checkNotDeletableTags(...tags) {
    cy.then(() => QuickMarcEditor().presentedRowsProperties())
      .then(presentedRowsProperties => presentedRowsProperties.filter(rowProperties => tags.includes(rowProperties.tag))
        .forEach(specialRowsProperties => cy.expect(specialRowsProperties.isDeleteButtonExist).to.be.false));
  },

  checkInitialInstance008Content() {
    Object.values(validRecord.tag008BytesProperties).forEach(property => cy.expect(property.interactor.has({ value: property.defaultValue })));
  },

  check008FieldsAbsent(...subfieldNames) {
    subfieldNames.forEach(subfieldName => cy.expect(getRowInteractorByTagName('008').find(quickMarcEditorRowContent)
      .find(TextField(subfieldName)).absent()));
  },

  checkSubfieldsPresenceInTag008() {
    cy.expect(getRowInteractorByTagName('008').find(quickMarcEditorRowContent)
      .find(HTML({ className: including('bytesFieldRow-') })).exists());
  },

  checkHeaderFirstLine({ headingReference:headingTypeFrom1XX, headingType, status }, { firstName, name }) {
    cy.expect(Pane(`Edit MARC authority record - ${headingTypeFrom1XX}`).exists());
    cy.then(() => Pane(`Edit MARC authority record - ${headingTypeFrom1XX}`).subtitle()).then(subtitle => {
      cy.expect(Pane({ subtitle: and(including(`Status: ${status}`),
        including(headingType),
        including('Record last updated:'),
        including(`Source: ${firstName}, ${name}`)) }));
      const stringDate = `${subtitle.split('Last updated: ')[1].split(' •')[0]} UTC`;
      dateTools.verifyDate(Date.parse(stringDate), 120_000);
    });
  },

  checkReadOnlyTags() {
    readOnlyAuthorityTags.forEach(readOnlyTag => {
      cy.expect(getRowInteractorByTagName(readOnlyTag).find(TextField('Field')).has({ disabled: true }));
      if (readOnlyTag !== 'LDR') {
        cy.expect(getRowInteractorByTagName(readOnlyTag).find(TextArea({ ariaLabel: 'Subfield' })).has({ disabled: true }));
      }
      if (readOnlyTag === '999') {
        cy.expect(getRowInteractorByTagName(readOnlyTag).find(TextField('Indicator', { name: including('.indicators[0]') })).has({ disabled: true }));
        cy.expect(getRowInteractorByTagName(readOnlyTag).find(TextField('Indicator', { name: including('.indicators[1]') })).has({ disabled: true }));
      }
    });
  },

  checkLDRValue(ldrValue = validRecord.ldrValue) {
    cy.expect(getRowInteractorByTagName('LDR').find(TextArea({ ariaLabel: 'Subfield' })).has({ textContent: ldrValue }));
  },

  checkAuthority008SubfieldsLength() {
    validRecord.tag008AuthorityBytesProperties.getAllProperties().map(property => property.interactor)
      .forEach(subfield => {
        cy.expect(getRowInteractorByTagName('008').find(subfield).has({ maxLength: (1).toString() }));
      });
  },

  checkLinkButtonExist(tag) {
    cy.expect(getRowInteractorByTagName(tag).find(linkToMarcRecordButton).exists());
  },

  checkButtonSaveAndCloseEnable() {
    cy.expect(saveAndCloseButton.exists());
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

  clearCertain008Boxes(...boxNames) {
    boxNames.forEach(boxName => {
      cy.do([
        QuickMarcEditorRow({ tagValue: '008' }).find(TextField(boxName)).fillIn('')
      ]);
    });
  },

  checkAfterSaveHoldings() {
    cy.expect([
      calloutAfterSaveAndClose.exists(),
      Button('Actions').exists()
    ]);
  },

  checkDelete008Callout() {
    cy.expect(calloutDelete008Error.exists());
  },

  check008FieldsEmptyHoldings() {
    tag008DefaultValuesHoldings.forEach(field => {
      cy.expect(field.interactor.has({ value: field.defaultValue }));
    });
  }
};
