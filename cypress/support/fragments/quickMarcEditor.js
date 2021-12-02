import { QuickMarkEditor, QuickMarkEditorRow, TextArea, Button, Modal, TextField } from '../../../interactors';
import NewInventoryInstance from './inventory/newInventoryInstance';

const addFieldButton = Button({ ariaLabel : 'Add a new field' });
const deleteFieldButton = Button({ ariaLabel : 'Delete this field' });
const saveAndCloseButton = Button({ id:'quick-marc-record-save' });
const confirmationModal = Modal({ id: 'quick-marc-confirm-modal', title:'Delete fields' });
const continueWithSaveButton = Modal().find(Button({ id: 'clickable-quick-marc-confirm-modal-confirm' }));

const defaultFieldValues = {
  content:'qwe',
  contentWithSubfield:'$a qwe',
  // just enumerate a few free to use tags  which can be applyied in test one by one with small reserve
  freeTagsIterator: new Set(['996', '997', '998']).values(),
  getSourceContent: (contentInQuickMarcEditor) => contentInQuickMarcEditor.replace('$', '‡')
};

const _getRowInteractor = (specialRowNumber) => QuickMarkEditor()
  .find(QuickMarkEditorRow({ index: specialRowNumber }));

const _addNewField = (fieldContent, tag) => {
  const lastRowNumber = NewInventoryInstance.validOCLC.getLastRowNumber();
  const contentTextArea = TextArea({ name: `records[${lastRowNumber + 1}].content` });
  const tagTextField = TextField({ name: `records[${lastRowNumber + 1}].tag` });

  cy.do(_getRowInteractor(lastRowNumber).find(addFieldButton).click());

  const tagValue = tag ?? defaultFieldValues.freeTagsIterator.next().value;
  const content = fieldContent ?? defaultFieldValues.content;

  cy.do(_getRowInteractor(lastRowNumber + 1).find(contentTextArea).fillIn(content));
  cy.do(_getRowInteractor(lastRowNumber + 1).find(tagTextField).fillIn(tagValue));

  return `${tagValue}\t   \t${defaultFieldValues.getSourceContent(content)}`;
};

export default {
  addNewField: () => {
    return _addNewField(defaultFieldValues.content);
  },

  addNewFieldWithSubField() {
    return _addNewField(defaultFieldValues.contentWithSubfield);
  },

  deletePenaltField: () => {
    const lastRowNumber = NewInventoryInstance.validOCLC.getLastRowNumber();
    cy.do(_getRowInteractor(lastRowNumber - 1).find(deleteFieldButton).click());
  },

  pressSaveAndClose: () => cy.do(saveAndCloseButton.click()),

  deleteConfirmationPresented: () => cy.expect(confirmationModal.exists()),

  confirmDelete: () => cy.do(continueWithSaveButton.click())
};
