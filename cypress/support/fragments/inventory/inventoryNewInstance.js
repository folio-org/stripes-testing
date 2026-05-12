import {
  MultiColumnList,
  HTML,
  Button,
  FieldSet,
  RepeatableFieldItem,
  Section,
  Select,
  Selection,
  SelectionList,
  TextArea,
  including,
  matching,
  Accordion,
  TextField,
} from '../../../../interactors';
import getRandomPostfix from '../../utils/stringTools';
import InteractorsTools from '../../utils/interactorsTools';
import InstanceStates from './instanceStates';

const rootSection = Section({ id: 'inventoryform-addinventory' });
const identifiers = MultiColumnList({ id: 'list-identifiers' });

const contributorsSection = rootSection.find(Accordion('Contributor'));
const descriptiveDataSection = rootSection.find(Accordion('Descriptive data'));

const cancelButton = rootSection.find(Button('Cancel'));
const saveAndCloseButton = rootSection.find(Button('Save & close'));
const statisticalCodeFieldSet = rootSection.find(FieldSet('Statistical code'));
const statisticalCodeSelectionList = statisticalCodeFieldSet.find(SelectionList());

const deafultResouceType = 'text';

const fillResourceTitle = (resourceTitle) => {
  cy.do(TextArea('Resource title*').fillIn(resourceTitle));
};
const fillResourceType = (resourceType = deafultResouceType) => {
  cy.do(Select('Resource type*').choose(resourceType));
};

export default {
  fillResourceTitle,
  fillResourceType,
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
    fillResourceTitle(resourceTitle);
    fillResourceType(resourceType);
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
  clickAddStatisticalCodeButton() {
    cy.do(Button('Add statistical code').click());
    cy.expect(Selection({ singleValue: 'Select code' }).exists());
  },
  openStatisticalCodeDropdown() {
    cy.do([statisticalCodeFieldSet.find(Selection()).find(Button()).click()]);
  },
  verifyStatisticalCodeDropdown() {
    cy.expect(statisticalCodeSelectionList.has({ placeholder: 'Filter options list' }));
    cy.then(() => statisticalCodeSelectionList.optionCount()).then((count) => {
      expect(count).to.greaterThan(0);
    });
  },
  filterStatisticalCodeByName(name) {
    cy.do([statisticalCodeSelectionList.filter(name)]);
  },
  verifyStatisticalCodeListOptionsFilteredBy(name) {
    cy.then(() => statisticalCodeSelectionList.optionList()).then((list) => {
      list.forEach((option) => expect(option).to.include(name));
    });
  },
  chooseStatisticalCode(code, rowIndex = 1) {
    cy.do([
      statisticalCodeFieldSet
        .find(RepeatableFieldItem({ index: rowIndex }))
        .find(Selection())
        .choose(including(code)),
    ]);
  },
  checkErrorMessageForStatisticalCode(isPresented = true) {
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
  clickCancelButton() {
    cy.do(cancelButton.click());
    cy.expect(rootSection.absent());
  },
  clickSaveAndCloseButton() {
    cy.do(saveAndCloseButton.click());
    cy.expect(rootSection.absent());

    InteractorsTools.checkCalloutMessage(
      matching(new RegExp(InstanceStates.instanceSavedSuccessfully)),
    );
  },
};
