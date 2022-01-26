import { QuickMarcEditor, QuickMarcEditorRow, TextArea, Button, Modal, TextField, and, some, Pane } from '../../../interactors';
import InventoryInstance from './inventory/inventoryInstance';
import getRandomPostfix from '../utils/stringTools';

const addFieldButton = Button({ ariaLabel : 'Add a new field' });
const deleteFieldButton = Button({ ariaLabel : 'Delete this field' });
const saveAndCloseButton = Button({ id:'quick-marc-record-save' });
const confirmationModal = Modal({ id: 'quick-marc-confirm-modal' });
const continueWithSaveButton = Modal().find(Button({ id: 'clickable-quick-marc-confirm-modal-confirm' }));

// tag008
const tag008HoldingsRecordFields = {
  acqStatusTextField : TextField('AcqStatus'),
  acqMethodTextField : TextField('AcqMethod'),
  acqEndDateTextField : TextField('AcqEndDate'),
  genRetTextField : TextField('Gen ret'),
  specRetTextField0: TextField('Spec ret', { name:'records[3].content.Spec ret[0]' }),
  specRetTextField1: TextField('Spec ret', { name:'records[3].content.Spec ret[1]' }),
  specRetTextField2: TextField('Spec ret', { name:'records[3].content.Spec ret[2]' }),
  complTextField : TextField('Compl'),
  copiesTextField : TextField('Copies'),
  lendTextField : TextField('Lend'),
  reproTextField : TextField('Repro'),
  langTextField : TextField('Lang'),
  sepCompTextField : TextField('Sep/comp'),
  reptDateTextField : TextField('Rept date')
};
const tag008HoldingsDefaultValues = {
  acqStatus : '0',
  acqMethod : 'u',
  acqEndDate : '////',
  genRet : '',
  specRet:{ specRet0: '/',
    specRet1: '/',
    specRet2: '/' },
  compl : '0',
  copies : '///',
  lend : 'u',
  repro : 'u',
  lang : 'eng',
  sepComp : '0',
  reptDate : '//////'
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

const _getRowInteractor = (specialRowNumber) => QuickMarcEditor()
  .find(QuickMarcEditorRow({ index: specialRowNumber }));

const getInitialRowsCount = () => InventoryInstance.validOCLC.getLastRowNumber();

const addRow = (rowNumber) => cy.do(_getRowInteractor(rowNumber ?? getInitialRowsCount()).find(addFieldButton).click());

const fillAllAvailableValues = (fieldContent, tag, initialRowsCount = InventoryInstance.validOCLC.getLastRowNumber()) => {
  const contentTextArea = TextArea({ name: `records[${initialRowsCount + 1}].content` });
  const tagTextField = TextField({ name: `records[${initialRowsCount + 1}].tag` });
  const separator = '\t   \t';
  const tagValue = tag ?? defaultFieldValues.freeTags[0];
  const content = fieldContent ?? defaultFieldValues.content;

  cy.do(_getRowInteractor(initialRowsCount + 1).find(contentTextArea).fillIn(content));
  cy.do(_getRowInteractor(initialRowsCount + 1).find(tagTextField).fillIn(tagValue));

  if (!content.match(/^\$\w/)) {
    return `${tagValue}${separator}${defaultFieldValues.getSourceContent(`${defaultFieldValues.initialSubField}${content}`)}`;
  } else {
    return `${tagValue}${separator}${defaultFieldValues.getSourceContent(content)}`;
  }
};

const addNewField = (tag = defaultFieldValues.freeTags[0], fieldContent = defaultFieldValues.content) => {
  addRow();
  return fillAllAvailableValues(fieldContent, tag);
};


export default {
  addNewField,

  addNewFieldWithSubField: (tag) => addNewField(tag, defaultFieldValues.contentWithSubfield),

  deletePenaltField:  () => {
    const shouldBeRemovedRowNumber = getInitialRowsCount() - 1;

    cy.expect(QuickMarcEditor().exists())
      .then(() => {
        cy.then(() => QuickMarcEditor().presentedRowsProperties())
          .then(presentedRowsProperties => {
            const shouldBeDeletedRowTag = presentedRowsProperties[shouldBeRemovedRowNumber].tag;
            cy.do(_getRowInteractor(shouldBeRemovedRowNumber).find(deleteFieldButton).click());
            cy.wrap(shouldBeDeletedRowTag).as('specialTag');
          });
      });
    return cy.get('@specialTag');
  },

  pressSaveAndClose: () => cy.do(saveAndCloseButton.click()),

  deleteConfirmationPresented: () => cy.expect(confirmationModal.exists()),

  confirmDelete: () => cy.do(continueWithSaveButton.click()),

  getContentFromRow: (row) => row.split(this.separator)[1],

  addRow,

  checkInitialContent: (rowNumber) => cy.expect(
    _getRowInteractor(rowNumber ?? getInitialRowsCount() + 1)
      .find(TextArea({ name: `records[${rowNumber ?? getInitialRowsCount() + 1}].content` }))
      .has({ value: defaultFieldValues.initialSubField })
  ),
  checkContent: (content, rowNumber) => cy.expect(
    _getRowInteractor(rowNumber ?? getInitialRowsCount() + 1)
      .find(TextArea({ name: `records[${rowNumber ?? getInitialRowsCount() + 1}].content` }))
      .has({ value: content ?? defaultFieldValues.contentWithSubfield })
  ),
  fillAllAvailableValues,
  checkRequiredFields: () => {
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
  updateExistingField:(tag = InventoryInstance.validOCLC.existingTag, newContent = `newContent${getRandomPostfix()}`) => {
    cy.do(QuickMarcEditorRow({ tagValue: tag }).find(TextArea()).fillIn(newContent));
    return newContent;
  },
  waitLoading:() => {
    cy.expect(Pane({ id: 'quick-marc-editor-pane' }).exists());
  },
  getExistingLocation:() => defaultFieldValues.existingLocation,
  getFreeTags:() => defaultFieldValues.freeTags,
  checkInitial008TagValueFromHoldingsRecord: () => {
    cy.expect([
      tag008HoldingsRecordFields.acqStatusTextField.has({ value: tag008HoldingsDefaultValues.acqStatus }),
      tag008HoldingsRecordFields.acqMethodTextField.has({ value: tag008HoldingsDefaultValues.acqMethod }),
      tag008HoldingsRecordFields.acqEndDateTextField.has({ value: tag008HoldingsDefaultValues.acqEndDate }),
      tag008HoldingsRecordFields.genRetTextField.has({ value: tag008HoldingsDefaultValues.genRet }),
      tag008HoldingsRecordFields.specRetTextField0.has({ value: tag008HoldingsDefaultValues.specRet.specRet0 }),
      tag008HoldingsRecordFields.specRetTextField1.has({ value: tag008HoldingsDefaultValues.specRet.specRet1 }),
      tag008HoldingsRecordFields.specRetTextField2.has({ value: tag008HoldingsDefaultValues.specRet.specRet2 }),
      tag008HoldingsRecordFields.complTextField.has({ value: tag008HoldingsDefaultValues.compl }),
      tag008HoldingsRecordFields.copiesTextField.has({ value: tag008HoldingsDefaultValues.copies }),
      tag008HoldingsRecordFields.lendTextField.has({ value: tag008HoldingsDefaultValues.lend }),
      tag008HoldingsRecordFields.reproTextField.has({ value: tag008HoldingsDefaultValues.repro }),
      tag008HoldingsRecordFields.langTextField.has({ value: tag008HoldingsDefaultValues.lang }),
      tag008HoldingsRecordFields.sepCompTextField.has({ value: tag008HoldingsDefaultValues.sepComp }),
      tag008HoldingsRecordFields.reptDateTextField.has({ value: tag008HoldingsDefaultValues.reptDate })
    ]);
  },

  // should be used only with default value of tag 008
  checkNotExpectedByteLabelsInHoldingsRecordTag008:() => {
    cy.then(() => QuickMarcEditor().presentedRowsProperties()).then(rowsProperties => {
      let actualJoinedFieldNames = rowsProperties.filter(rowProperty => rowProperty.tag === '008').map(rowProperty => rowProperty.content)[0].toLowerCase();

      Object.keys(tag008HoldingsDefaultValues).forEach(fieldName => {
        switch (fieldName) {
          case 'specRet': {
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
};
