import { Accordion, Button, Section, Select, TextArea, TextField, TextInput, FieldSet, Checkbox, FieldInFieldset } from '../../../../interactors';

const closeButton = Button({ icon: 'times' });
const rootSection = Section({ id: 'instance-form' });


export default {
  close:() => cy.do(closeButton.click()),
  waitLoading:() => cy.expect(Section({ id: 'instance-form' }).exists()),
  // related with Actions->Overlay
  checkReadOnlyFields() {
    const deleteInFieldsetButton = Button({ ariaLabel: 'remove fields for ' });
    function getRegularElements() {
      return Object.values(this).filter(element => typeof element !== 'function');
    }
    const readonlyTextFields = {
      hrId : rootSection.find(TextField('Instance HRID')),
      source: rootSection.find(TextField('Source*')),
      getRegularElements
    };

    const readonlyButtons = {
      // already checked in scope of fieldset alternativeTitles checking
      // alernativeTitles: rootSection.find(Button('Add alternative title')),
      series: rootSection.find(Button('Add series')),
      editions: rootSection.find(Button('Add edition')),
      getRegularElements
    };

    // TODO: rename id in https://github.com/folio-org/ui-inventory-es/blob/0d2f3b6b13c4cf28f64e3510d81b606ee354d909/src/edit/InstanceForm.js
    const readonlyAccordions = {
      identifiers: rootSection.find(Accordion({ id: 'instanceSection03' })),
      contributors: rootSection.find(Accordion({ id: 'instanceSection04' })),
      getRegularElements
    };

    const readonlyFieldsets = {
      physicalDescriptions : rootSection.find(FieldSet('Physical descriptions')),
      formats:rootSection.find(FieldSet('Formats')),
      languages:rootSection.find(FieldSet('Languages')),
      publications: rootSection.find(FieldSet('Publications')),
      publicationFrequency: rootSection.find(FieldSet('Publication frequency')),
      publicationRange: rootSection.find(FieldSet('Publication range')),
      notes: rootSection.find(FieldSet('Notes')),
      electronicAccess: rootSection.find(FieldSet('Electronic access')),
      // TODO: add legend value to this fieldset. It's void actually
      // subjects: rootSection.find(FieldSet('Subjects')),
      classifications: rootSection.find(FieldSet('Classification')),
      precedingTitles: rootSection.find(FieldSet('Preceding titles')),
      succeedingTitles: rootSection.find(FieldSet('Succeeding titles')),
      // related with fields Type and Alternative title
      alternativeTitles: rootSection.find(FieldSet('Alternative titles')),
      getRegularElements
    };

    const readonlyTextAreas = {
      resourceTitle: rootSection.find(TextArea('Resource title*')),
      indexTitle: rootSection.find(TextArea('Index title')),
      getRegularElements
    };

    const readonlySelects = {
      // already checked in scope of fieldset alternativeTitles checking
      // type:rootSection.find(FieldSet('Alternative titles')).find(Select('Type*')),
      modeOfIssuance:rootSection.find(Select('Mode of issuance')),
      getRegularElements
    };

    readonlyTextFields.getRegularElements().forEach(element => {
      cy.expect(element.has({ disabled: true }));
    });
    readonlyButtons.getRegularElements().forEach(element => {
      cy.expect(element.has({ disabled: true }));
    });
    readonlyAccordions.getRegularElements().forEach(accordion => {
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
        .then(fieldsCount => {
          for (let i = 0; i < fieldsCount; i++) {
            accordion.find(FieldSet()).find(FieldInFieldset({ fieldByIndex: i })).find(deleteInFieldsetButton).has({ disabled: true });
          }
        })
      // check textfields
        .then(() => accordion.inputNames())
        .then(inputNames => {
          inputNames.forEach(inputName => cy.expect(accordion.find(TextField({ name: inputName })).has({ disabled: true })));
        });
    });
    readonlyFieldsets.getRegularElements().forEach(fieldset => {
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
        .then(fieldsCount => {
          for (let i = 0; i < fieldsCount; i++) {
            fieldset.find(FieldInFieldset({ fieldByIndex: i })).find(deleteInFieldsetButton).has({ disabled: true });
          }
        })
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
    readonlyTextAreas.getRegularElements().forEach(textArea => {
      cy.expect(textArea.has({ disabled: true }));
    });

    readonlySelects.getRegularElements().forEach(select => {
      cy.expect(select.has({ disabled: true }));
    });
  }
};
