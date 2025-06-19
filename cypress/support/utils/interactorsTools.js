import {
  TextArea,
  Select,
  Button,
  FieldSet,
  FieldInFieldset,
  TextField,
  Checkbox,
  Callout,
  calloutTypes,
  KeyValue,
  including,
} from '../../../interactors';

const deleteButton = Button({ ariaLabel: 'remove fields for ' });

function checkdisabledDeleteButtons(fieldset, buttonsCount, deleteInFieldsetButton) {
  for (let i = 0; i < buttonsCount; i++) {
    fieldset
      .find(FieldInFieldset({ fieldByIndex: i }))
      .find(deleteInFieldsetButton)
      .has({ disabled: true });
  }
}

export default {
  // TODO: add checking of checkbox state
  checkAccordionDisabledElements(accordions, deleteInFieldsetButton = deleteButton) {
    accordions.forEach((accordion) => {
      // check textareas
      cy.then(() => accordion.textareaNames())
        .then((textareaNames) => {
          textareaNames.forEach((textareaName) => cy.expect(accordion.find(TextArea({ name: textareaName })).has({ disabled: true })));
        })
        // check selects
        .then(() => accordion.selectNames())
        .then((selectNames) => {
          selectNames.forEach((selectName) => cy.expect(accordion.find(Select({ name: selectName })).has({ disabled: true })));
        })
        // check buttons
        .then(() => accordion.buttonIds())
        .then((buttonIds) => {
          buttonIds.forEach((buttonId) => cy.expect(accordion.find(Button({ id: buttonId })).has({ disabled: true })));
        })
        .then(() => accordion.buttonContainsText())
        .then((buttonTexts) => {
          buttonTexts.forEach((buttonText) => cy.expect(accordion.find(Button({ text: buttonText })).has({ disabled: true })));
        })
        // check state of button delete in each field of fieldset into each accordion
        .then(() => accordion.find(FieldSet()).feildsCount())
        .then((fieldsCount) => checkdisabledDeleteButtons(
          accordion.find(FieldSet()),
          fieldsCount,
          deleteInFieldsetButton,
        ))
        // check textfields
        .then(() => accordion.inputNames())
        .then((inputNames) => {
          inputNames.forEach((inputName) => cy.expect(accordion.find(TextField({ name: inputName })).has({ disabled: true })));
        });
    });
  },

  checkFieldSetDisibledElements(fielset, deleteInFieldsetButton = deleteButton) {
    fielset.forEach((fieldset) => {
      // check textfields
      cy.then(() => fieldset.inputNames())
        .then((inputNames) => {
          inputNames.forEach((inputName) => cy.expect(fieldset.find(TextField({ name: inputName })).has({ disabled: true })));
        })
        // check selects
        .then(() => fieldset.selectNames())
        .then((selectNames) => {
          selectNames.forEach((selectName) => cy.expect(fieldset.find(Select({ name: selectName })).has({ disabled: true })));
        })
        // check buttons
        // check state of button delete in each field of fieldset into each accordion
        .then(() => fieldset.feildsCount())
        .then((fieldsCount) => checkdisabledDeleteButtons(fieldset, fieldsCount, deleteInFieldsetButton))
        .then(() => fieldset.buttonIds())
        .then((buttonIds) => {
          buttonIds.forEach((buttonId) => cy.expect(fieldset.find(Button({ id: buttonId })).has({ disabled: true })));
        })
        // check textareas
        .then(() => fieldset.textareaNames())
        .then((textareaNames) => {
          textareaNames.forEach((textareaName) => cy.expect(fieldset.find(TextArea({ name: textareaName })).has({ disabled: true })));
        })
        // check checkboxes
        .then(() => fieldset.checkboxLabels())
        .then((checkboxLabels) => {
          checkboxLabels.forEach((checkboxLabel) => cy.expect(fieldset.find(Checkbox(checkboxLabel)).has({ disabled: true })));
        });
    });
  },
  checkSimpleDisabledElements(elements) {
    elements.forEach((element) => {
      cy.expect(element.has({ disabled: true }));
    });
  },
  checkKeyValue: (section, key, value) => {
    cy.expect(section.find(KeyValue(key)).has({ value: value || including('') }));
  },
  checkCalloutMessage: (text, calloutType = calloutTypes.success) => {
    cy.expect(Callout({ textContent: text }).is({ type: calloutType }));
  },
  checkCalloutContainsMessage: (text, calloutType = calloutTypes.success) => {
    cy.expect(Callout({ textContent: including(text) }).is({ type: calloutType }));
  },
  closeCalloutMessage: () => cy.do(
    Callout()
      .find(Button({ icon: 'times' }))
      .click(),
  ),
  closeAllVisibleCallouts: () => {
    cy.get('[class^=calloutBase-]').then(($callouts) => {
      if (!$callouts.length) return;
      for (let i = 0; i < $callouts.length; i++) {
        cy.do(
          Callout({ id: $callouts[i].id })
            .find(Button({ icon: 'times' }))
            .click(),
        );
      }
    });
  },
  checkCalloutErrorMessage: (text, calloutType = calloutTypes.error) => {
    cy.expect(Callout({ type: calloutType }).is({ textContent: text }));
  },
  checkOneOfCalloutsContainsErrorMessage: (text) => {
    cy.get('[class^=calloutBase-]').then(($els) => {
      const matchingId = [...$els].find(
        (el) => el.className.includes('error') &&
          el.querySelector('[class^=message-]')?.textContent.includes(text),
      )?.id;
      if (matchingId) {
        cy.expect(
          Callout({ id: matchingId, type: calloutTypes.error }).has({
            textContent: including(text),
          }),
        );
      }
    });
  },
  dismissCallout: (text) => {
    cy.do(Callout({ textContent: text }).dismiss());
  },
  checkTextFieldError: (fieldName, error) => {
    cy.expect(TextField(fieldName).has({ error }));
  },
  checkTextFieldErrorIncludingName: (fieldName, error) => {
    cy.expect(TextField(including(fieldName)).has({ error }));
  },
  setTextFieldValue({ textField, fieldValue, clearField = false }) {
    if (fieldValue) {
      cy.wait(1000);
      cy.do([textField.focus(), textField.fillIn(fieldValue)]);
      cy.expect(textField.has({ value: fieldValue }));
    } else if (fieldValue !== undefined && clearField) {
      cy.do(textField.clear());
    }
  },
  checkCalloutExists(message, type = null) {
    if (type) cy.expect(Callout({ textContent: message, type }).exists());
    else cy.expect(Callout({ textContent: message }).exists());
  },
};
