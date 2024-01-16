import { Button } from '../../../../../../interactors';
import ResultsPane from '../resultsPane';
import ActionProfileEditForm from './actionProfileEditForm';

export default {
  ...ResultsPane,
  createNewActionProfile() {
    ResultsPane.expandActionsDropdown();
    cy.do(Button('New action profile').click());
    ActionProfileEditForm.waitLoading();
    ActionProfileEditForm.verifyFormView();

    return ActionProfileEditForm;
  },
  getActionProfilesViaApi(searchParams) {
    return cy
      .okapiRequest({
        method: 'GET',
        path: 'data-import-profiles/actionProfiles',
        isDefaultSearchParamsRequired: false,
        searchParams,
      })
      .then(({ body }) => body);
  },
  createActionProfileViaApi(actionProfile) {
    return cy.okapiRequest({
      method: 'POST',
      path: 'data-import-profiles/actionProfiles',
      body: actionProfile,
    });
  },
  deleteActionProfileViaApi(profileId) {
    return cy.okapiRequest({
      method: 'DELETE',
      path: `data-import-profiles/actionProfiles/${profileId}`,
    });
  },
  deleteActionProfileByNameViaApi(profileName) {
    this.getActionProfilesViaApi({ query: `name="${profileName}"` }).then(({ actionProfiles }) => {
      actionProfiles.forEach((actionProfile) => {
        this.deleteActionProfileViaApi(actionProfile.id);
      });
    });
  },
};
