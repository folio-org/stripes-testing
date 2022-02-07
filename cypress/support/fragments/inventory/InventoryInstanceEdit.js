import { Accordion, Button, Section, Select, TextArea, TextField, TextInput, FieldSet } from '../../../../interactors';

const closeButton = Button({ icon: 'times' });
const rootSection = Section({ id: 'instance-form' });


export default {
  close:() => cy.do(closeButton.click()),
  waitLoading:() => cy.expect(Section({ id: 'instance-form' }).exists()),
  // related with Actions->Overlay
  checkReadOnlyFields() {
    function getRegularElements() {
      return Object.values(this).filter(element => typeof element !== 'function');
    }
    const readonlyTextFields = {
      hrId : rootSection.find(TextField('Instance HRID')),
      source: rootSection.find(TextField('Source*')),
      getRegularElements
    };

    const readonlyButtons = {
      alernativeTitles: rootSection.find(Button('Add alternative title')),
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
      getRegularElements
    };

    const readonlyTextAreas = {
      resourceTitle: rootSection.find(TextArea('Resource title')),
      indexTitle: rootSection.find(TextArea('Index title')),
      getRegularElements
    };

    const readonlySelects = {
      type:rootSection.find(Select('Type*')),
      modeOfIssuance:rootSection.find(Select('Mode of issuance')),
      getRegularElements
    };

    readonlyTextFields.getRegularElements().forEach(element => {
      cy.expect(element.has({ disabled: true }));
    });
    readonlyButtons.getRegularElements().forEach(element => {
      cy.expect(element.has({ disabled: true }));
    });
    // TODO: add button Delete
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
      // // TODO: add special unique attribute to each delete button
      // .then(() => accordion.buttonAriaLabels())
        // .then(buttonAriaLabels => {
        //   buttonAriaLabels.forEach(buttonAriaLabel => cy.expect(accordion.find(Button({ ariaLabel: buttonAriaLabel })).has({ disabled: true })));
        // })
        .then(() => accordion.buttonIds())
        .then(buttonIds => {
          buttonIds.forEach(buttonId => cy.expect(accordion.find(Button({ id: buttonId })).has({ disabled: true })));
        })
        .then(() => accordion.buttonContainsText())
        .then(buttonTexts => {
          buttonTexts.forEach(buttonText => cy.expect(accordion.find(Button({ text : buttonText })).has({ disabled: true })));
        })
      // check textfields
        .then(() => accordion.inputNames())
        .then(inputNames => {
          inputNames.forEach(inputName => cy.expect(accordion.find(TextField({ name: inputName })).has({ disabled: true })));
        });
    });
    // TODO: add checkboxes
    // TODO: add button delete
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
      // // TODO: add special unique attribute to each delete button
      // .then(() => accordion.buttonAriaLabels())
        // .then(buttonAriaLabels => {
        //   buttonAriaLabels.forEach(buttonAriaLabel => cy.expect(accordion.find(Button({ ariaLabel: buttonAriaLabel })).has({ disabled: true })));
        // })
        .then(() => fieldset.buttonIds())
        .then(buttonIds => {
          buttonIds.forEach(buttonId => cy.expect(fieldset.find(Button({ id: buttonId })).has({ disabled: true })));
        });
      // check textareas
      cy.then(() => fieldset.textareaNames()).then(textareaNames => {
        textareaNames.forEach(textareaName => cy.expect(fieldset.find(TextArea({ name: textareaName })).has({ disabled: true })));
      });
    });
  }
};
