import {
  MultiColumnList,
  HTML,
  Button,
  Section,
  Select,
  TextArea,
  including,
  matching,
  Accordion,
  TextField,
  Callout,
} from '../../../../interactors';
import getRandomPostfix from '../../utils/stringTools';
import InstanceStates from './instanceStates';

const rootSection = Section({ id: 'inventoryform-addinventory' });
const identifiers = MultiColumnList({ id: 'list-identifiers' });

const contributorsSection = rootSection.find(Accordion('Contributor'));
const descriptiveDataSection = rootSection.find(Accordion('Descriptive data'));

const cancelButton = rootSection.find(Button('Cancel'));
const saveAndCloseButton = rootSection.find(Button('Save & close'));

const deafultResouceType = 'text';

export default {
  checkExpectedOCLCPresence(OCLCNumber) {
    cy.expect(identifiers.find(HTML(including(OCLCNumber))).exists());
  },
  waitLoading() {
    cy.expect(rootSection.exists());
  },
  fillRequiredValues(
    resourceTitle = `autotest_instance_title_${getRandomPostfix()}`,
    resourceType = deafultResouceType,
  ) {
    cy.do(TextArea('Resource title*').fillIn(resourceTitle));
    cy.do(Select('Resource type*').choose(resourceType));
    cy.wait(300);
  },
  fillInstanceFields({
    contributor,
    publication,
    description,
    language,
    statusTerm,
    mode,
    title,
    resourceType,
  }) {
    if (contributor) {
      this.addContributor(contributor);
    }

    if (publication) {
      this.addPublication(publication);
    }

    if (description) {
      this.addDescription({ description });
    }

    if (language) {
      this.addLanduage({ language });
    }

    if (statusTerm) {
      cy.do(Select('Instance status term').choose(statusTerm));
    }

    if (mode) {
      cy.do(Select('Mode of issuance').choose(mode));
    }

    this.fillRequiredValues(title, resourceType);
  },
  addContributor({ name, nameType, shouldExpand = true } = {}) {
    if (shouldExpand) {
      cy.do(contributorsSection.find(Button('Add contributor')).click());
    }
    cy.do([
      contributorsSection.find(TextArea({ name: 'contributors[0].name' })).fillIn(name),
      contributorsSection
        .find(Select({ name: 'contributors[0].contributorNameTypeId' }))
        .choose(nameType),
    ]);
  },
  addPublication({ place, date, shouldExpand = true } = {}) {
    if (shouldExpand) {
      cy.do(descriptiveDataSection.find(Button('Add publication')).click());
    }
    cy.do([
      descriptiveDataSection.find(TextArea({ name: 'publication[0].place' })).fillIn(place),
      descriptiveDataSection
        .find(TextField({ name: 'publication[0].dateOfPublication' }))
        .fillIn(date),
    ]);
  },
  addDescription({ description, shouldExpand = true } = {}) {
    if (shouldExpand) {
      cy.do(descriptiveDataSection.find(Button('Add description')).click());
    }
    cy.do([
      descriptiveDataSection
        .find(TextField({ name: 'physicalDescriptions[0]' }))
        .fillIn(description),
    ]);
  },
  addLanduage({ language, shouldExpand = true } = {}) {
    if (shouldExpand) {
      cy.do(descriptiveDataSection.find(Button('Add language')).click());
    }
    cy.do([descriptiveDataSection.find(Select({ name: 'languages[0]' })).choose(language)]);
  },
  clickCancelButton() {
    cy.do(cancelButton.click());
    cy.expect(rootSection.absent());
  },
  clickSaveAndCloseButton() {
    cy.wait(1000);
    cy.do(saveAndCloseButton.click());
    cy.expect(rootSection.absent());

    cy.expect(
      Callout({
        textContent: matching(new RegExp(InstanceStates.instanceSavedSuccessfully)),
      }).exists(),
    );
  },
};
