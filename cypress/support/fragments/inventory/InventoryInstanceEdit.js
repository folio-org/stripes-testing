import {
  Accordion,
  Button,
  Section,
  Select,
  TextArea,
  TextField,
  FieldSet,
  Selection,
  including,
} from '../../../../interactors';
import InteractorsTools from '../../utils/interactorsTools';
import getRandomPostfix from '../../utils/stringTools';
import InventoryInstanceModal from './holdingsMove/inventoryInstanceSelectInstanceModal';

const closeButton = Button({ icon: 'times' });
const saveAndCloseButton = Button('Save and close');
const rootSection = Section({ id: 'instance-form' });
const actionsButton = Button('Actions');
const value = `test.${getRandomPostfix()}`;

export default {
  close:() => cy.do(closeButton.click()),
  waitLoading:() => cy.expect(Section({ id: 'instance-form' }).exists()),
  // related with Actions->Overlay
  checkReadOnlyFields() {
    const readonlyTextFields = {
      hrId : rootSection.find(TextField('Instance HRID')),
      source: rootSection.find(TextField('Source*')),
    };

    const readonlyButtons = {
      // already checked in scope of fieldset alternativeTitles checking
      // alernativeTitles: rootSection.find(Button('Add alternative title')),
      series: rootSection.find(Button('Add series')),
      editions: rootSection.find(Button('Add edition')),
    };

    // TODO: rename id in https://github.com/folio-org/ui-inventory-es/blob/0d2f3b6b13c4cf28f64e3510d81b606ee354d909/src/edit/InstanceForm.js
    const readonlyAccordions = {
      identifiers: rootSection.find(Accordion({ id: 'instanceSection03' })),
      contributors: rootSection.find(Accordion({ id: 'instanceSection04' })),
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
    };

    const readonlyTextAreas = {
      resourceTitle: rootSection.find(TextArea('Resource title*')),
      indexTitle: rootSection.find(TextArea('Index title')),
    };

    const readonlySelects = {
      // already checked in scope of fieldset alternativeTitles checking
      // type:rootSection.find(FieldSet('Alternative titles')).find(Select('Type*')),
      modeOfIssuance:rootSection.find(Select('Mode of issuance')),
    };

    function getRegularElements(...elementsList) {
      return elementsList.flatMap(elements => Object.values(elements));
    }

    InteractorsTools.checkAccordionDisabledElements(Object.values(readonlyAccordions));
    InteractorsTools.checkFieldSetDisibledElements(Object.values(readonlyFieldsets));
    InteractorsTools.checkSimpleDisabledElements(getRegularElements(readonlyTextFields, readonlyButtons, readonlyTextAreas, readonlySelects));
  },

  addIdentifier:(identifier) => {
    cy.expect(Accordion('Identifier').exists());
    cy.do(Button('Add identifier').click());
    cy.expect(Select('Type*').exists());
    cy.expect(TextField('Identifier*').exists());
    cy.do(Accordion('Identifier').find(Select({ name:'identifiers[0].identifierTypeId' })).choose(identifier));
    cy.do(TextField({ name:'identifiers[0].value' }).fillIn(value));
    cy.do(saveAndCloseButton.click());
  },

  addPrecedingTitle:(fieldIndex, precedingTitle, isbn, issn) => {
    const fieldNamePref = `precedingTitles[${fieldIndex}]`;

    cy.do([
      Button('Add preceding title').click(),
      TextArea({ name:  `${fieldNamePref}.title` }).fillIn(precedingTitle),
      TextField({ name: `${fieldNamePref}.isbn` }).fillIn(isbn),
      TextField({ name: `${fieldNamePref}.issn` }).fillIn(issn),
    ]);
  },
  addExistingPrecedingTitle:(precedingTitle) => {
    cy.do(Button({ id: 'find-instance-trigger' }).click());
    InventoryInstanceModal.searchByTitle(precedingTitle);
    InventoryInstanceModal.selectInstance();
  },
  choosePermanentLocation(locationName) {
    // wait fixes selection behavior
    cy.wait(1000);
    cy.do([
      Selection('Permanent').open(),
      Selection('Permanent').choose(including(locationName))
    ]);
  },
  chooseTemporaryLocation(locationName) {
    cy.do([
      Selection('Temporary').open(),
      Selection('Temporary').choose(including(locationName))
    ]);
  },
  saveAndClose: () => {
    cy.do(saveAndCloseButton.click());
    cy.expect(actionsButton.exists());
  }
};
