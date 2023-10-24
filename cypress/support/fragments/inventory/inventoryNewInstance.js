import {
  MultiColumnList,
  HTML,
  Button,
  Section,
  Select,
  TextArea,
  including,
  matching,
} from '../../../../interactors';
import getRandomPostfix from '../../utils/stringTools';
import InteractorsTools from '../../utils/interactorsTools';
import InstanceStates from './instanceStates';

const rootSection = Section({ id: 'inventoryform-addinventory' });
const identifiers = MultiColumnList({ id: 'list-identifiers' });

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
  fillInstanceFields({ statusTerm, mode, title, resourceType }) {
    if (statusTerm) {
      cy.do(Select('Instance status term').choose(statusTerm));
    }

    if (mode) {
      cy.do(Select('Mode of issuance').choose(mode));
    }

    this.fillRequiredValues(title, resourceType);
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
