import { Button, TextField, MultiColumnListCell } from '../../../../../interactors';
import newActionProfile from './newActionProfile';

const actionsButton = Button('Actions');

const openNewActionProfileForm = () => {
  cy.do([
    actionsButton.click(),
    Button('New action profile').click()
  ]);
};

export default {

  createActionProfile:(actionProfile, mappingProfile) => {
    openNewActionProfileForm();
    newActionProfile.fillActionProfile(actionProfile);
    newActionProfile.linkMappingProfile(mappingProfile);
  },

  checkActionProfilePresented: (actionProfile) => {
    cy.do(TextField({ id:'input-search-action-profiles-field' }).fillIn(actionProfile));
    cy.do(Button('Search').click());
    cy.expect(MultiColumnListCell(actionProfile).exists());
  },
};
