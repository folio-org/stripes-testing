import { QuickMarcEditor, QuickMarcEditorRow, TextArea, Button, Modal, TextField, and, some, Pane, HTML, including } from '../../../interactors';
import getRandomPostfix from '../utils/stringTools';

const addFieldButton = Button({ ariaLabel : 'Add a new field' });
const deleteFieldButton = Button({ ariaLabel : 'Delete this field' });
const saveAndCloseButton = Button({ id:'quick-marc-record-save' });
const confirmationModal = Modal({ id: 'quick-marc-confirm-modal' });
const continueWithSaveButton = Modal().find(Button({ id: 'clickable-quick-marc-confirm-modal-confirm' }));

const specRetInputNamesHoldings008 = ['records[3].content.Spec ret[0]',
  'records[3].content.Spec ret[1]',
  'records[3].content.Spec ret[2]'];

const tag008HoldingsBytesProperties = {
  acqStatus : { interactor:TextField('AcqStatus'), defaultValue:'0', newValue:'v', voidValue:' ', replacedVoidValue:'\\' },
  acqMethod :{ interactor:TextField('AcqMethod'), defaultValue:'u', newValue:'v', voidValue:' ', replacedVoidValue:'\\' },
  acqEndDate :{ interactor:TextField('AcqEndDate'), defaultValue:'\\\\\\\\', newValue:'vvvv', voidValue:' ', replacedVoidValue:'\\\\\\\\' },
  genRet : { interactor:TextField('Gen ret'), defaultValue:'0', newValue:'v', voidValue:' ', replacedVoidValue:'\\' },
  specRet0: { interactor:TextField('Spec ret', { name:specRetInputNamesHoldings008[0] }), defaultValue:'\\', newValue:'v', voidValue:' ', replacedVoidValue:'\\' },
  specRet1: { interactor:TextField('Spec ret', { name:specRetInputNamesHoldings008[1] }), defaultValue:'\\', newValue:'v', voidValue:' ', replacedVoidValue:'\\' },
  specRet2: { interactor:TextField('Spec ret', { name:specRetInputNamesHoldings008[2] }), defaultValue:'\\', newValue:'v', voidValue:' ', replacedVoidValue:'\\' },
  compl : { interactor:TextField('Compl'), defaultValue:'0', newValue:'9', voidValue:' ', replacedVoidValue:'\\' },
  copies :{ interactor:TextField('Copies'), defaultValue:'\\\\\\', newValue:'vvv', voidValue:' ', replacedVoidValue:'\\\\\\' },
  lend : { interactor:TextField('Lend'), defaultValue:'u', newValue:'v', voidValue:' ', replacedVoidValue:'\\' },
  repro : { interactor:TextField('Repro'), defaultValue:'u', newValue:'v', voidValue:' ', replacedVoidValue:'\\' },
  lang : { interactor:TextField('Lang'), defaultValue:'eng', newValue:'vvv', voidValue:' ', replacedVoidValue:'\\\\\\' },
  sepComp : { interactor:TextField('Sep/comp'), defaultValue:'0', newValue:'v', voidValue:' ', replacedVoidValue:'\\' },
  reptDate :{ interactor:TextField('Rept date'), defaultValue:'\\\\\\\\\\\\', newValue:'vvvvvv', voidValue:' ', replacedVoidValue:'\\\\\\\\\\\\' },
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

const getRowInteractorByRowNumber = (specialRowNumber) => QuickMarcEditor()
  .find(QuickMarcEditorRow({ index: specialRowNumber }));
const getRowInteractorByTagName = (tagName) => QuickMarcEditor()
  .find(QuickMarcEditorRow({ tagValue: tagName }));

export default class QuickmarcEditor {
  constructor(validRecord) {
    this.validRecord = validRecord;
  }

  getInitialRowsCount() { return this.validRecord.lastRowNumber; }


  addNewField(tag = defaultFieldValues.freeTags[0], fieldContent = defaultFieldValues.content) {
    this.addRow();
    return this.fillAllAvailableValues(fieldContent, tag);
  }

  addNewFieldWithSubField(tag) {
    return this.addNewField(tag, defaultFieldValues.contentWithSubfield);
  }

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
  }

  static pressSaveAndClose() { cy.do(saveAndCloseButton.click()); }

  static deleteConfirmationPresented() { cy.expect(confirmationModal.exists()); }

  static confirmDelete() { cy.do(continueWithSaveButton.click()); }

  addRow(rowNumber) {
    cy.do(getRowInteractorByRowNumber(rowNumber ?? this.getInitialRowsCount()).find(addFieldButton).click());
  }

  checkInitialContent(rowNumber) {
    cy.expect(getRowInteractorByRowNumber(rowNumber ?? this.getInitialRowsCount() + 1)
      .find(TextArea({ name: `records[${rowNumber ?? this.getInitialRowsCount() + 1}].content` }))
      .has({ value: defaultFieldValues.initialSubField }));
  }

  checkContent(content, rowNumber) {
    cy.expect(getRowInteractorByRowNumber(rowNumber ?? this.getInitialRowsCount() + 1)
      .find(TextArea({ name: `records[${rowNumber ?? this.getInitialRowsCount() + 1}].content` }))
      .has({ value: content ?? defaultFieldValues.contentWithSubfield }));
  }

  static checkEmptyContent(tagName) {
    cy.expect(getRowInteractorByTagName(tagName).find(HTML({ className: including('quickMarcEditorRowContent') })).exists());
    cy.expect(getRowInteractorByTagName(tagName).find(HTML({ className: including('quickMarcEditorRowContent') })).find(TextField()).absent());
  }

  fillAllAvailableValues(fieldContent, tag, initialRowsCount = this.validRecord.lastRowNumber) {
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
  }

  static checkRequiredFields() {
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
  }

  updateExistingField(tag = this.validRecord.existingTag, newContent = `newContent${getRandomPostfix()}`) {
    cy.do(QuickMarcEditorRow({ tagValue: tag }).find(TextArea()).fillIn(newContent));
    return newContent;
  }

  static waitLoading() {
    cy.expect(Pane({ id: 'quick-marc-editor-pane' }).exists());
  }

  static getExistingLocation() {
    return defaultFieldValues.existingLocation;
  }

  static getFreeTags() {
    return defaultFieldValues.freeTags;
  }

  static checkInitial008TagValueFromHoldings() {
    tag008HoldingsBytesProperties.getAllProperties().forEach(specialByte => {
      cy.expect(specialByte.interactor.has({ value: specialByte.defaultValue }));
    });
  }

  // should be used only with default value of tag 008
  static checkNotExpectedByteLabelsInTag008Holdings() {
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
  }

  // TODO: redesign. move tag008HoldingsBytesProperties to InventoryInstance.validOCLC
  static updateAllDefaultValuesIn008TagInHoldings() {
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
  }

  updateAllDefaultValuesIn008TagInAuthority() {
    this.validRecord.tag008AuthorityBytesProperties.getAllProperties().forEach(byteProperty => {
      cy.do(QuickMarcEditorRow({ tagValue: '008' }).find(byteProperty.interactor).fillIn(byteProperty.newValue));
    });
    QuickmarcEditor.pressSaveAndClose();
    return this.validRecord.tag008AuthorityBytesProperties.getNewValueSourceLine();
  }

  static clearTag008Holdings() {
    tag008HoldingsBytesProperties.getAllProperties().forEach(byteProperty => {
      cy.do(QuickMarcEditorRow({ tagValue: '008' }).find(byteProperty.interactor).fillIn(''));
    });
    this.pressSaveAndClose();
    return tag008HoldingsBytesProperties.getAllProperties().map(property => property.voidValue).join('');
  }

  static checkReplacedVoidValuesInTag008Holdings() {
    tag008HoldingsBytesProperties.getAllProperties().forEach(byteProperty => {
      cy.expect(QuickMarcEditorRow({ tagValue: '008' }).find(byteProperty.interactor).has({ value: byteProperty.replacedVoidValue }));
    });
  }

  static getRegularTagContent(tag) {
    cy.then(() => QuickMarcEditorRow({ tagValue: tag }).find(TextArea()).textContent())
      .then(content => cy.wrap(content).as('tagContent'));
    return cy.get('@tagContent');
  }

  static deleteTag(tag) {
    cy.do(QuickMarcEditorRow({ tagValue: tag }).find(deleteFieldButton).click());
  }

  static closeWithoutSaving() {
    cy.do(Button('Cancel').click());
  }

  static getSourceContent(quickmarcTagValue) { return defaultFieldValues.getSourceContent(quickmarcTagValue); }
  static checkNotDeletableTags(...tags) {
    cy.then(() => QuickMarcEditor().presentedRowsProperties())
      .then(presentedRowsProperties => presentedRowsProperties.filter(rowProperties => tags.includes(rowProperties.tag))
        .forEach(specialRowsProperties => cy.expect(specialRowsProperties.isDeleteButtonExist).to.be.false));
  }

  checkInitialInstance008Content() {
    Object.values(this.validRecord.tag008BytesProperties).forEach(property => cy.expect(property.interactor.has({ value: property.defaultValue })));
  }

  static check008FieldsAbsent(...subfieldNames) {
    subfieldNames.forEach(subfieldName => cy.expect(getRowInteractorByTagName('008').find(HTML({ className: including('quickMarcEditorRowContent') }))
      .find(TextField(subfieldName)).absent()));
  }
}
