import { TextArea,
  Select,
  Button,
  FieldSet,
  FieldInFieldset,
  TextField,
  Checkbox,
  Callout,
  calloutTypes } from '../../../interactors';


const deleteButton = Button({ ariaLabel: 'remove fields for ' });

function checkdisabledDeleteButtons(fieldset, buttonsCount, deleteInFieldsetButton) {
  for (let i = 0; i < buttonsCount; i++) {
    fieldset.find(FieldInFieldset({ fieldByIndex: i })).find(deleteInFieldsetButton).has({ disabled: true });
  }
}

export default {
// TODO: add checking of checkbox state
  checkAccordionDisabledElements(accordions, deleteInFieldsetButton = deleteButton) {
    accordions.forEach(accordion => {
    // check textareas
      cy.then(() => accordion.textareaNames()).then(textareaNames => {
        textareaNames.forEach(textareaName => cy.expect(accordion.find(TextArea({ name: textareaName })).has({ disabled: true })));
      })
      // check selects
        .then(() => accordion.selectNames()).then(selectNames => {
          selectNames.forEach(selectName => cy.expect(accordion.find(Select({ name: selectName })).has({ disabled: true })));
        })
      // check buttons
        .then(() => accordion.buttonIds())
        .then(buttonIds => {
          buttonIds.forEach(buttonId => cy.expect(accordion.find(Button({ id: buttonId })).has({ disabled: true })));
        })
        .then(() => accordion.buttonContainsText())
        .then(buttonTexts => {
          buttonTexts.forEach(buttonText => cy.expect(accordion.find(Button({ text : buttonText })).has({ disabled: true })));
        })
      // check state of button delete in each field of fieldset into each accordion
        .then(() => accordion.find(FieldSet()).feildsCount())
        .then(fieldsCount => checkdisabledDeleteButtons(accordion.find(FieldSet()), fieldsCount, deleteInFieldsetButton))
      // check textfields
        .then(() => accordion.inputNames())
        .then(inputNames => {
          inputNames.forEach(inputName => cy.expect(accordion.find(TextField({ name: inputName })).has({ disabled: true })));
        });
    });
  },

  checkFieldSetDisibledElements(fielset, deleteInFieldsetButton = deleteButton) {
    fielset.forEach(fieldset => {
    // check textfields
      cy.then(() => fieldset.inputNames())
        .then(inputNames => {
          inputNames.forEach(inputName => cy.expect(fieldset.find(TextField({ name: inputName })).has({ disabled: true })));
        })
      // check selects
        .then(() => fieldset.selectNames()).then(selectNames => {
          selectNames.forEach(selectName => cy.expect(fieldset.find(Select({ name: selectName })).has({ disabled: true })));
        })
      // check buttons
      // check state of button delete in each field of fieldset into each accordion
        .then(() => fieldset.feildsCount())
        .then(fieldsCount => checkdisabledDeleteButtons(fieldset, fieldsCount, deleteInFieldsetButton))
        .then(() => fieldset.buttonIds())
        .then(buttonIds => {
          buttonIds.forEach(buttonId => cy.expect(fieldset.find(Button({ id: buttonId })).has({ disabled: true })));
        })
      // check textareas
        .then(() => fieldset.textareaNames())
        .then(textareaNames => {
          textareaNames.forEach(textareaName => cy.expect(fieldset.find(TextArea({ name: textareaName })).has({ disabled: true })));
        })
      // check checkboxes
        .then(() => fieldset.checkboxLabels())
        .then(checkboxLabels => {
          checkboxLabels.forEach(checkboxLabel => cy.expect(fieldset.find(Checkbox(checkboxLabel)).has({ disabled: true })));
        });
    });
  },
  checkSimpleDisabledElements(elements) {
    elements.forEach(element => {
      cy.expect(element.has({ disabled: true }));
    });
  },
  checkCalloutMessage: (text, calloutType = calloutTypes.success) => {
    cy.expect(Callout({ type: calloutType }).is({ textContent: text }));
  },
  closeCalloutMessage: () => cy.do(Callout().find(Button({ icon:'times' })).click())
};
