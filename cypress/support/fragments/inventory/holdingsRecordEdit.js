import {
  Button,
  including,
  not,
  HTML,
  TextField,
  Select,
  SelectionList,
  Accordion,
  TextArea,
  Callout,
  calloutTypes,
  Spinner,
  MultiSelect,
  MultiSelectOption,
  TextInput,
  FieldSet,
  Selection,
  RepeatableFieldItem,
  RepeatableField,
} from '../../../../interactors';
import InteractorsTools from '../../utils/interactorsTools';

const rootForm = HTML({ className: including('holdingsForm-') });
const holdingsHrId = rootForm.find(TextField({ name: 'hrid' }));
const sourceSelect = rootForm.find(Select({ name: 'sourceId' }));
const readonlyFields = [holdingsHrId, sourceSelect];
const callNumber = rootForm.find(TextArea({ name: 'callNumber' }));
const statisticalCodeFieldSet = FieldSet('Statistical code');
const addStatisticalCodeButton = Button('Add statistical code');
const callNumberType = rootForm.find(Select('Call number type'));
const statisticalCodeSelectionList = statisticalCodeFieldSet.find(SelectionList());

export default {
  saveAndClose: () => {
    cy.do(rootForm.find(Button('Save & close')).click());
  },
  waitLoading: () => {
    cy.expect(rootForm.exists());
    cy.expect(Spinner().absent());
    cy.expect(callNumber.exists());
  },
  checkReadOnlyFields: () => readonlyFields.forEach((element) => cy.expect(element.has({ disabled: true }))),
  closeWithoutSave: () => cy.do(rootForm.find(Button('Cancel')).click()),
  changePermanentLocation: (location) => {
    cy.do([
      Button({ id: 'additem_permanentlocation' }).click(),
      SelectionList().filter(location),
      SelectionList().select(including(location)),
    ]);
  },
  clickAddStatisticalCode(rowIndex = 1) {
    cy.do(addStatisticalCodeButton.click());
    cy.expect(
      statisticalCodeFieldSet
        .find(RepeatableFieldItem({ index: rowIndex }))
        .find(Selection())
        .exists(),
    );
  },
  chooseStatisticalCode(code, rowIndex = 1) {
    cy.do([
      statisticalCodeFieldSet
        .find(RepeatableFieldItem({ index: rowIndex }))
        .find(Selection())
        .choose(including(code)),
    ]);
  },
  addStatisticalCode(code) {
    this.clickAddStatisticalCode();
    this.chooseStatisticalCode(code);
  },
  openStatisticalCodeDropdown() {
    cy.do([statisticalCodeFieldSet.find(Selection()).find(Button()).click()]);
  },
  closeStatisticalCodeDropdown() {
    cy.do(statisticalCodeFieldSet.find(Selection()).find(Button()).click());
  },
  filterStatisticalCodeByName(name) {
    this.openStatisticalCodeDropdown();
    cy.do([statisticalCodeSelectionList.filter(name)]);
  },
  verifyStatisticalCodeCount(codeCount, verifyTrue = true) {
    if (verifyTrue) {
      cy.expect(statisticalCodeSelectionList.has({ optionCount: codeCount }));
    } else {
      cy.expect(statisticalCodeSelectionList.has({ optionCount: not(codeCount) }));
    }
  },
  removeStatisticalCode(code) {
    cy.do(
      RepeatableFieldItem({ singleValue: including(code) })
        .find(Button({ icon: 'trash' }))
        .click(),
    );
  },
  clearTemporaryLocation: () => {
    cy.do([
      Button({ id: 'additem_temporarylocation' }).click(),
      SelectionList().select('Select location'),
    ]);
  },
  openTags() {
    cy.do(Button({ id: 'accordion-toggle-button-tag-accordion' }).click());
  },
  addTag(tag) {
    cy.do([
      TextInput({ id: 'multiselect-input-input-tag' }).fillIn(tag),
      MultiSelect().open(),
      MultiSelectOption(including(tag)).click(),
    ]);
    InteractorsTools.checkCalloutMessage('New tag created');
  },
  addHoldingsNotes: (text, type = 'Action note') => {
    cy.do([
      Accordion('Holdings notes').find(Button('Add note')).click(),
      Select('Note type*').choose(type),
      TextArea({ ariaLabel: 'Note' }).fillIn(text),
    ]);
  },
  fillCallNumber(callNumberValue) {
    cy.do(callNumber.fillIn(callNumberValue));
  },
  verifyNoCalloutErrorMessage() {
    cy.expect(Callout({ type: calloutTypes.error }).absent());
  },
  checkErrorMessageForStatisticalCode: (isPresented = true) => {
    if (isPresented) {
      cy.expect(statisticalCodeFieldSet.has({ error: 'Please select to continue' }));
    } else {
      cy.expect(
        FieldSet({
          buttonIds: [including('stripes-selection')],
          error: 'Please select to continue',
        }).absent(),
      );
    }
  },
  verifyStatisticalCodesCount(itemCount) {
    if (itemCount === 0) {
      cy.do(statisticalCodeFieldSet.absent());
    } else {
      cy.do(RepeatableField('Statistical code').has({ itemCount }));
    }
  },
  chooseCallNumberType(type) {
    cy.do(callNumberType.choose(type));
  },
};
