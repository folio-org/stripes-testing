import {
  Accordion,
  Button,
  Callout,
  calloutTypes,
  Checkbox,
  FieldSet,
  HTML,
  including,
  matching,
  Modal,
  MultiSelectOption,
  not,
  RepeatableField,
  RepeatableFieldItem,
  Select,
  Selection,
  SelectionList,
  Spinner,
  TextArea,
  TextField,
  TextInput,
} from '../../../../interactors';
import InteractorsTools from '../../utils/interactorsTools';
import InstanceStates from './instanceStates';

const rootForm = HTML({ className: including('holdingsForm-') });
const footerPane = HTML({ className: including('paneFooter-') });
const saveAndCloseButton = footerPane.find(Button('Save & close'));
const cancelButton = footerPane.find(Button('Cancel'));
const holdingsHrId = rootForm.find(TextField({ name: 'hrid' }));
const sourceSelect = rootForm.find(Select({ name: 'sourceId' }));
const readonlyFields = [holdingsHrId, sourceSelect];
const callNumberField = rootForm.find(TextArea({ name: 'callNumber' }));
const statisticalCodeFieldSet = FieldSet('Statistical code');
const addStatisticalCodeButton = Button('Add statistical code');
const callNumberTypeSelect = rootForm.find(Select('Call number type'));
const statisticalCodeSelectionList = SelectionList({ id: including('sl-container-selection-:r') });
const temporaryLocationDropdown = Button({ id: 'additem_temporarylocation' });
const temporaryLocationList = SelectionList({ id: 'sl-container-additem_temporarylocation' });
const createAdministrativeNoteButton = Button('Add administrative note');
const administrativeNoteTextArea = TextArea({ ariaLabel: 'Administrative note' });
const electronicAccessAccordion = Accordion('Electronic access');
const addElectronicAccessButton = Button('Add electronic access');
const relationshipSelectDropdown = Select('Relationship');
const uriTextarea = TextArea({ ariaLabel: 'URI' });
const saveAndKeepEditingButton = footerPane.find(Button('Save & keep editing'));
const holdingsTypeSelect = Select({ id: 'additem_holdingstype' });
const numberOfItemsField = TextField('Number of items');
const addAdditionalCallNumberButton = Button('Add additional call number');
const additionalCallNumberTypeSelect = Select({ name: 'additionalCallNumbers[0].typeId' });
const additionalCallNumberPrefixField = TextArea({ id: 'additem_prefix_0' });
const additionalCallNumberField = TextArea({ id: 'additem_callnumber_0' });
const additionalCallNumberSuffixField = TextArea({ id: 'additem_suffix_0' });
const illPolicySelect = Select({ name: 'illPolicyId' });
const digitizationPolicyField = TextArea({ id: 'edit_digitizationpolicy' });
const retentionPolicyField = TextArea({ id: 'edit_retentionpolicy' });
const acquisitionMethodField = TextField({ name: 'acquisitionMethod' });
const orderFormatField = TextField({ name: 'acquisitionFormat' });
const receiptStatusField = TextField({ name: 'receiptStatus' });
const addAddReceivingHistoryButton = Button('Add receiving history');
const publicDisplayCheckbox = Checkbox('Public display');
const enumerationField = TextArea({ ariaLabel: 'Enumeration' });
const chronologyField = TextArea({ ariaLabel: 'Chronology' });

export default {
  saveAndClose: ({ holdingSaved = false } = {}) => {
    cy.do(saveAndCloseButton.click());

    if (holdingSaved) {
      InteractorsTools.checkCalloutMessage(
        matching(new RegExp(InstanceStates.holdingSavedSuccessfully)),
      );
    }
  },
  waitLoading: () => {
    cy.expect(rootForm.exists());
    cy.expect(Spinner().absent());
    cy.expect(callNumberField.exists());
  },
  checkReadOnlyFields: () => readonlyFields.forEach((element) => cy.expect(element.has({ disabled: true }))),
  closeWithoutSave: () => cy.do(cancelButton.click()),
  fillHoldingFields({
    permanentLocation,
    callNumber,
    holdingsNote,
    holdingType,
    numberOfItems,
  } = {}) {
    if (permanentLocation) {
      this.changePermanentLocation(permanentLocation);
    }

    if (callNumber) {
      this.fillCallNumber(callNumber);
    }

    if (holdingsNote) {
      this.addHoldingsNotes(holdingsNote);
    }

    if (holdingType) {
      cy.do([holdingsTypeSelect.choose(holdingType)]);
    }

    if (numberOfItems) {
      cy.do(numberOfItemsField.fillIn(numberOfItems));
    }
  },
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
    cy.wait(1000);
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
    cy.wait(500);
    cy.do(Button({ id: 'accordion-toggle-button-tag-accordion' }).click());
    cy.wait(500);
  },
  clearTagsInput() {
    cy.get('#input-tag-input').type('{selectall}{backspace}');
  },
  addTag(tag) {
    cy.wait(1000);
    cy.do(TextInput({ id: 'multiselect-input-input-tag' }).fillIn(tag));
    cy.wait(500);
    cy.do(MultiSelectOption(including(tag)).click());
    cy.wait(500);
    InteractorsTools.checkCalloutMessage('New tag created');
    cy.wait(1000);
  },
  addHoldingsNotes: (text, type = 'Action note') => {
    cy.do([
      Accordion('Holdings notes').find(Button('Add note')).click(),
      Select('Note type*').choose(type),
      TextArea({ ariaLabel: 'Note' }).fillIn(text),
    ]);
  },
  addAdministrativeNote: (note) => {
    cy.do([createAdministrativeNoteButton.click(), administrativeNoteTextArea.fillIn(note)]);
  },
  editHoldingsNotes: (newText, newType) => {
    cy.do(TextArea({ ariaLabel: 'Note' }).fillIn(newText));
    if (newType) {
      cy.do(Select('Note type*').choose(newType));
    }
  },
  fillCallNumber(callNumberValue) {
    cy.do(callNumberField.fillIn(callNumberValue));
  },
  fillAdditionalCallNumber(callNumberValue) {
    cy.do(additionalCallNumberField.fillIn(callNumberValue));
  },
  fillAdditionalCallNumberPrefix(callNumberPrefix) {
    cy.do(additionalCallNumberPrefixField.fillIn(callNumberPrefix));
  },
  fillAdditionalCallNumberSuffix(callNumberSuffix) {
    cy.do(additionalCallNumberSuffixField.fillIn(callNumberSuffix));
  },
  chooseAdditionalCallNumberType(type) {
    cy.do(additionalCallNumberTypeSelect.choose(type));
  },
  addAdditionalCallNumberValues({
    callNumber,
    callNumberType,
    callNumberPrefix,
    callNumberSuffix,
  }) {
    cy.do(addAdditionalCallNumberButton.click());
    cy.expect(additionalCallNumberField.exists());
    if (callNumber !== undefined) {
      this.fillAdditionalCallNumber(callNumber);
    }
    if (callNumberType !== undefined) {
      this.chooseAdditionalCallNumberType(callNumberType);
    }
    if (callNumberPrefix !== undefined) {
      this.fillAdditionalCallNumberPrefix(callNumberPrefix);
    }
    if (callNumberSuffix !== undefined) {
      this.fillAdditionalCallNumberSuffix(callNumberSuffix);
    }
  },
  fillInNumberOfItems(numberOfItems) {
    cy.do(numberOfItemsField.fillIn(numberOfItems));
  },
  chooseIllPolicy(policy) {
    cy.do(illPolicySelect.choose(policy));
  },
  fillDigitizationPolicy(policy) {
    cy.do(digitizationPolicyField.fillIn(policy));
  },
  fillRetentionPolicy(policy) {
    cy.do(retentionPolicyField.fillIn(policy));
  },
  fillPolicyFields({ illPolicy, digitizationPolicy, retentionPolicy }) {
    if (illPolicy !== undefined) {
      this.chooseIllPolicy(illPolicy);
    }
    if (digitizationPolicy !== undefined) {
      this.fillDigitizationPolicy(digitizationPolicy);
    }
    if (retentionPolicy !== undefined) {
      this.fillRetentionPolicy(retentionPolicy);
    }
  },
  fillAcquisitionMethod(method) {
    cy.do(acquisitionMethodField.fillIn(method));
  },
  fillOrderFormat(format) {
    cy.do(orderFormatField.fillIn(format));
  },
  fillReceiptStatus(status) {
    cy.do(receiptStatusField.fillIn(status));
  },
  fillAcquisitionFields({ acquisitionMethod, orderFormat, receiptStatus }) {
    if (acquisitionMethod !== undefined) {
      this.fillAcquisitionMethod(acquisitionMethod);
    }
    if (orderFormat !== undefined) {
      this.fillOrderFormat(orderFormat);
    }
    if (receiptStatus !== undefined) {
      this.fillReceiptStatus(receiptStatus);
    }
  },
  markAsPublicDisplay() {
    cy.do(publicDisplayCheckbox.click());
  },
  fillEnumeration(enumeration) {
    cy.do(enumerationField.fillIn(enumeration));
  },
  fillChronology(chronology) {
    cy.do(chronologyField.fillIn(chronology));
  },
  addReceivingHistoryValues({ enumeration, chronology }) {
    cy.do(addAddReceivingHistoryButton.click());
    cy.expect(publicDisplayCheckbox.exists());
    this.markAsPublicDisplay();
    if (enumeration !== undefined) {
      this.fillEnumeration(enumeration);
    }
    if (chronology !== undefined) {
      this.fillChronology(chronology);
    }
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
    cy.do(callNumberTypeSelect.choose(type));
  },
  openTemporaryLocation() {
    cy.do(temporaryLocationDropdown.click());
  },
  selectTemporaryLocation(location) {
    this.openTemporaryLocation();
    cy.do([SelectionList().filter(location), SelectionList().select(including(location))]);
  },
  verifyTemporaryLocationItemExists: (temporarylocation) => {
    cy.expect(temporaryLocationList.exists());
    cy.expect(temporaryLocationList.find(HTML(including(temporarylocation))).exists());
  },
  clickAddElectronicAccessButton: () => {
    cy.do(addElectronicAccessButton.click());
  },
  addElectronicAccess: (type) => {
    cy.expect(electronicAccessAccordion.exists());
    cy.do([
      addElectronicAccessButton.click(),
      relationshipSelectDropdown.choose(type),
      uriTextarea.fillIn(type),
      saveAndCloseButton.click(),
    ]);
  },
  getRelationshipsFromHoldings: () => {
    const relationshipNames = [];
    return cy
      .get('select[name="electronicAccess[0].relationshipId"]')
      .each(($element) => {
        cy.wrap($element)
          .invoke('text')
          .then((name) => {
            relationshipNames.push(name);
          });
      })
      .then(() => {
        const resultArray = relationshipNames.map((str) => {
          return str.replace('Select type', '').trim();
        });
        return Array.from(resultArray);
      });
  },
  closeCancelEditingModal: () => {
    cy.do(
      Modal({ id: 'cancel-editing-confirmation' })
        .find(Button({ id: 'clickable-cancel-editing-confirmation-cancel' }))
        .click(),
    );
  },
  fillCallNumberValues({
    callNumber,
    callNumberType,
    callNumberPrefix,
    callNumberSuffix,
    copyNumber,
  }) {
    if (callNumber !== undefined) this.fillCallNumber(callNumber);
    if (callNumberType) this.chooseCallNumberType(callNumberType);
    if (callNumberPrefix !== undefined) cy.do(TextArea('Call number prefix').fillIn(callNumberPrefix));
    if (callNumberSuffix !== undefined) cy.do(TextArea('Call number suffix').fillIn(callNumberSuffix));
    if (copyNumber !== undefined) cy.do(TextField('Copy number').fillIn(copyNumber));
  },
  markAsSuppressedFromDiscovery() {
    cy.do(Checkbox('Suppress from discovery').click());
  },
  checkMarkedAsSuppressedFromDiscovery(isMarked = true) {
    cy.expect(Checkbox('Suppress from discovery').is({ checked: isMarked }));
  },
  checkButtonsEnabled({ saveAndClose = false, saveAndKeep = false, cancel = true } = {}) {
    cy.expect(saveAndCloseButton.has({ disabled: !saveAndClose }));
    cy.expect(saveAndKeepEditingButton.has({ disabled: !saveAndKeep }));
    cy.expect(cancelButton.has({ disabled: !cancel }));
  },
  saveAndKeepEditing({ holdingSaved = false } = {}) {
    cy.do(saveAndKeepEditingButton.click());
    if (holdingSaved) {
      InteractorsTools.checkCalloutMessage(
        matching(new RegExp(InstanceStates.holdingSavedSuccessfully)),
      );
    }
  },
  verifyHoldingsTypeSelected(selectedType) {
    cy.expect(holdingsTypeSelect.has({ checkedOptionText: selectedType }));
  },
  verifyNumberOfItems(numberOfItems) {
    cy.expect(numberOfItemsField.has({ value: numberOfItems }));
  },
};
