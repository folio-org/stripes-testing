import { QuickMarcEditor, QuickMarcEditorRow, TextArea, Button, Modal, TextField, and, some } from '../../../interactors';
import InventoryInstance from './inventory/inventoryInstance';

const addFieldButton = Button({ ariaLabel : 'Add a new field' });
const deleteFieldButton = Button({ ariaLabel : 'Delete this field' });
const saveAndCloseButton = Button({ id:'quick-marc-record-save' });
const confirmationModal = Modal({ id: 'quick-marc-confirm-modal', title:'Delete fields' });
const continueWithSaveButton = Modal().find(Button({ id: 'clickable-quick-marc-confirm-modal-confirm' }));

const defaultFieldValues = {
  content:'qwe',
  subfieldPrefixInEditor: '$',
  subfieldPrefixInSource: '‡',
  // just enumerate a few free to use tags  which can be applyied in test one by one with small reserve
  freeTagsIterator: new Set(['996', '997', '998']).values()
};
defaultFieldValues.initialSubField = `${defaultFieldValues.subfieldPrefixInEditor}a `;
defaultFieldValues.contentWithSubfield = `${defaultFieldValues.initialSubField}${defaultFieldValues.content}`;
defaultFieldValues.getSourceContent = (contentInQuickMarcEditor) => contentInQuickMarcEditor.replace(defaultFieldValues.subfieldPrefixInEditor, defaultFieldValues.subfieldPrefixInSource);

const requiredRowsTags = ['LDR', '001', '005', '008', '999'];

const _getRowInteractor = (specialRowNumber) => QuickMarcEditor()
  .find(QuickMarcEditorRow({ index: specialRowNumber }));

const _addNewField = (fieldContent, tag) => {
  const lastRowNumber = InventoryInstance.validOCLC.getLastRowNumber();
  this.addRow(lastRowNumber);
  return this.fillAllAvailableValues(fieldContent, tag);
};

const getInitialRowsCount = () => InventoryInstance.validOCLC.getLastRowNumber();

export default {
  addNewField: () => _addNewField(defaultFieldValues.content),

  addNewFieldWithSubField: () => _addNewField(defaultFieldValues.contentWithSubfield),

  deletePenaltField: () => {
    const lastRowNumber = getInitialRowsCount();
    cy.do(_getRowInteractor(lastRowNumber - 1).find(deleteFieldButton).click());
  },

  pressSaveAndClose: () => cy.do(saveAndCloseButton.click()),

  deleteConfirmationPresented: () => cy.expect(confirmationModal.exists()),

  confirmDelete: () => cy.do(continueWithSaveButton.click()),

  getContentFromRow: (row) => row.split(this.separator)[1],

  addRow: (rowNumber) => cy.do(_getRowInteractor(rowNumber ?? getInitialRowsCount() + 1).find(addFieldButton).click()),

  checkInitialContent: (rowNumber) => cy.expect(
    _getRowInteractor(rowNumber ?? getInitialRowsCount() + 2)
      .find(TextArea({ name: `records[${rowNumber ?? getInitialRowsCount() + 2}].content` }))
      .has({ value: defaultFieldValues.initialSubField })
  ),
  checkContent: (content, rowNumber) => cy.expect(
    _getRowInteractor(rowNumber ?? getInitialRowsCount() + 2)
      .find(TextArea({ name: `records[${rowNumber ?? getInitialRowsCount() + 2}].content` }))
      .has({ value: content ?? defaultFieldValues.contentWithSubfield })
  ),
  fillAllAvailableValues:(fieldContent, tag) => {
    const initialRowsCount = InventoryInstance.validOCLC.getLastRowNumber();
    const contentTextArea = TextArea({ name: `records[${initialRowsCount + 2}].content` });
    const tagTextField = TextField({ name: `records[${initialRowsCount + 2}].tag` });
    const separator = '\t   \t';
    const tagValue = tag ?? defaultFieldValues.freeTagsIterator.next().value;
    const content = fieldContent ?? defaultFieldValues.content;

    cy.do(_getRowInteractor(initialRowsCount + 2).find(contentTextArea).fillIn(content));
    cy.do(_getRowInteractor(initialRowsCount + 2).find(tagTextField).fillIn(tagValue));

    // content in editor doesn't have subfield marker
    if (!content.match(/^$\w/)) {
      return `${tagValue}${separator}${defaultFieldValues.getSourceContent(`${defaultFieldValues.initialSubField}${content}`)}`;
    } else {
      return `${tagValue}${separator}${defaultFieldValues.getSourceContent(content)}`;
    }
  },
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
  }
};
