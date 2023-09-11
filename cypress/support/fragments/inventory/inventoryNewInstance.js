import {
  MultiColumnList,
  HTML,
  including,
  Button,
  Section,
  Select,
  TextArea,
} from '../../../../interactors';
import getRandomPostfix from '../../utils/stringTools';
import inventoryInstance from './inventoryInstance';

const rootSection = Section({ id: 'inventoryform-addinventory' });
const identifiers = MultiColumnList({ id: 'list-identifiers' });

const deafultResouceType = 'text';

export default {
  checkExpectedOCLCPresence: (OCLCNumber) => {
    cy.expect(identifiers.find(HTML(including(OCLCNumber))).exists());
  },
  waitLoading: () => {
    cy.expect(rootSection.exists());
  },
  fillRequiredValues: (
    resourceTitle = `autoTestTitle${getRandomPostfix()}`,
    resourceType = deafultResouceType,
  ) => {
    cy.do(TextArea('Resource title*').fillIn(resourceTitle));
    cy.do(Select('Resource type*').choose(resourceType));
  },
  save: () => {
    cy.do(Button('Save & close').click());
    inventoryInstance.waitLoading();
  },
};
