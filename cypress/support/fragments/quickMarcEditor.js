import { QuickMarcEditor, QuickMarcEditorRow, TextArea, Button, Modal, TextField, and, some, Pane } from '../../../interactors';
import InventoryInstance from './inventory/inventoryInstance';
import getRandomPostfix from '../utils/stringTools';
import holdingsRecordView from './inventory/holdingsRecordView';

const addFieldButton = Button({ ariaLabel : 'Add a new field' });
const deleteFieldButton = Button({ ariaLabel : 'Delete this field' });
const saveAndCloseButton = Button({ id:'quick-marc-record-save' });
const confirmationModal = Modal({ id: 'quick-marc-confirm-modal' });
const continueWithSaveButton = Modal().find(Button({ id: 'clickable-quick-marc-confirm-modal-confirm' }));

const specRetInputNames = ['records[3].content.Spec ret[0]',
  'records[3].content.Spec ret[1]',
  'records[3].content.Spec ret[2]'];

const tag008HoldingsBytesProperties = {
  // TODO: default value has  symbols '/', expected - '\', see UIQM-203
  acqStatus : { interactor:TextField('AcqStatus'), defaultValue:'0', newValue:'v', voidValue:' ', replacedVoidValue:'\\' },
  acqMethod :{ interactor:TextField('AcqMethod'), defaultValue:'u', newValue:'v', voidValue:' ', replacedVoidValue:'\\' },
  acqEndDate :{ interactor:TextField('AcqEndDate'), defaultValue:'////', newValue:'vvvv', voidValue:' ', replacedVoidValue:'\\\\\\\\' },
  // TODO: default value is void instead of '0' now. see UIQM-203
  // TODO: change newValue to 'v' after fix of UIQM-204
  genRet : { interactor:TextField('Gen ret'), defaultValue:'', newValue:'0', voidValue:' ', replacedVoidValue:'' },
  specRet0: { interactor:TextField('Spec ret', { name:specRetInputNames[0] }), defaultValue:'/', newValue:'v', voidValue:' ', replacedVoidValue:'\\' },
  specRet1: { interactor:TextField('Spec ret', { name:specRetInputNames[1] }), defaultValue:'/', newValue:'v', voidValue:' ', replacedVoidValue:'\\' },
  specRet2: { interactor:TextField('Spec ret', { name:specRetInputNames[2] }), defaultValue:'/', newValue:'v', voidValue:' ', replacedVoidValue:'\\' },
  compl : { interactor:TextField('Compl'), defaultValue:'0', newValue:'9', voidValue:'0', replacedVoidValue:'\\' },
  copies :{ interactor:TextField('Copies'), defaultValue:'///', newValue:'vvv', voidValue:' ', replacedVoidValue:'\\\\\\' },
  lend : { interactor:TextField('Lend'), defaultValue:'u', newValue:'v', voidValue:' ', replacedVoidValue:'\\' },
  repro : { interactor:TextField('Repro'), defaultValue:'u', newValue:'v', voidValue:' ', replacedVoidValue:'\\' },
  lang : { interactor:TextField('Lang'), defaultValue:'eng', newValue:'vvv', voidValue:' ', replacedVoidValue:'\\\\\\' },
  sepComp : { interactor:TextField('Sep/comp'), defaultValue:'0', newValue:'v', voidValue:' ', replacedVoidValue:'\\' },
  reptDate :{ interactor:TextField('Rept date'), defaultValue:'//////', newValue:'vvvvvv', voidValue:' ', replacedVoidValue:'\\\\\\\\\\\\' },
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

const getRowInteractor = (specialRowNumber) => QuickMarcEditor()
  .find(QuickMarcEditorRow({ index: specialRowNumber }));

const getInitialRowsCount = () => InventoryInstance.validOCLC.getLastRowNumber();

const addRow = (rowNumber) => cy.do(getRowInteractor(rowNumber ?? getInitialRowsCount()).find(addFieldButton).click());

const fillAllAvailableValues = (fieldContent, tag, initialRowsCount = InventoryInstance.validOCLC.getLastRowNumber()) => {
  const contentTextArea = TextArea({ name: `records[${initialRowsCount + 1}].content` });
  const tagTextField = TextField({ name: `records[${initialRowsCount + 1}].tag` });
  const separator = '\t   \t';
  const tagValue = tag ?? defaultFieldValues.freeTags[0];
  const content = fieldContent ?? defaultFieldValues.content;

  cy.do(getRowInteractor(initialRowsCount + 1).find(contentTextArea).fillIn(content));
  cy.do(getRowInteractor(initialRowsCount + 1).find(tagTextField).fillIn(tagValue));

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

const pressSaveAndClose = () => cy.do(saveAndCloseButton.click());

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
            cy.do(getRowInteractor(shouldBeRemovedRowNumber).find(deleteFieldButton).click());
            cy.wrap(shouldBeDeletedRowTag).as('specialTag');
          });
      });
    return cy.get('@specialTag');
  },

  pressSaveAndClose,

  deleteConfirmationPresented: () => cy.expect(confirmationModal.exists()),

  confirmDelete: () => cy.do(continueWithSaveButton.click()),

  getContentFromRow: (row) => row.split(this.separator)[1],

  addRow,

  checkInitialContent: (rowNumber) => cy.expect(
    getRowInteractor(rowNumber ?? getInitialRowsCount() + 1)
      .find(TextArea({ name: `records[${rowNumber ?? getInitialRowsCount() + 1}].content` }))
      .has({ value: defaultFieldValues.initialSubField })
  ),
  checkContent: (content, rowNumber) => cy.expect(
    getRowInteractor(rowNumber ?? getInitialRowsCount() + 1)
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
    tag008HoldingsBytesProperties.getAllProperties().forEach(specialByte => {
      cy.expect(specialByte.interactor.has({ value: specialByte.defaultValue }));
    });
  },

  // should be used only with default value of tag 008
  checkNotExpectedByteLabelsInHoldingsRecordTag008:() => {
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
  updateAllDefaultValuesIn008Tag: () => {
    tag008HoldingsBytesProperties.getUsualProperties().forEach(byteProperty => {
      cy.do(QuickMarcEditorRow({ tagValue: '008' }).find(byteProperty.interactor).fillIn(byteProperty.newValue));
    });
    // additional steps related with Spec ret
    specRetInputNames.forEach(name => {
      // TODO: redesign to interactors
      cy.get(`input[name="${name}"]`).click();
      cy.get(`input[name="${name}"]`).type(`{backspace}{backspace}${tag008HoldingsBytesProperties.specRet0.newValue}`);
    });
    pressSaveAndClose();
    InventoryInstance.holdingsRecordView.waitLoading();
    return tag008HoldingsBytesProperties.getAllProperties().map(property => property.newValue).join('');
  },
  clearTag008:() => {
    tag008HoldingsBytesProperties.getAllProperties().forEach(byteProperty => {
      cy.do(QuickMarcEditorRow({ tagValue: '008' }).find(byteProperty.interactor).fillIn(''));
    });
    pressSaveAndClose();
    InventoryInstance.holdingsRecordView.waitLoading();
    return tag008HoldingsBytesProperties.getAllProperties().map(property => property.voidValue).join('');
  },
  checkReplacedVoidValuesInTag008:() => {
    tag008HoldingsBytesProperties.getAllProperties().forEach(byteProperty => {
      cy.expect(QuickMarcEditorRow({ tagValue: '008' }).find(byteProperty.interactor).has({ value: byteProperty.replacedVoidValue }));
    });
  },
  getRegularTagContent: (tag) => {
    cy.then(() => QuickMarcEditorRow({ tagValue: tag }).find(TextArea()).textContent())
      .then(content => cy.wrap(content).as('tagContent'));
    return cy.get('@tagContent');
  },
  deleteTag: (tag) =>{
    cy.do(QuickMarcEditorRow({ tagValue: tag }).find(deleteFieldButton).click());
  }
};
