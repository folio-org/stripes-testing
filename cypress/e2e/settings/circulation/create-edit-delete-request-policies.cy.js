import uuid from 'uuid';
import Permissions from '../../../support/dictionary/permissions';
import RequestPolicy from '../../../support/fragments/circulation/request-policy';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import Users from '../../../support/fragments/users/users';
import InteractorsTools from '../../../support/utils/interactorsTools';

describe('Permissions -> Circulation', () => {
  const userData = {};
  const newRequestPolicy = {
    name: uuid(),
    description: 'description',
    holdable: true,
    pageable: true,
    recallable: true,
  };
  const duplicateRequestPolicy = {
    name: uuid(),
    description: 'duplicate description',
  };
  const editRequestPolicy = {
    name: uuid(),
    description: 'new description',
    holdable: false,
    pageable: false,
    recallable: false,
  };

  before('Prepare test data', () => {
    cy.getAdminToken().then(() => {
      cy.createTempUser([Permissions.settingsCircCRUDRequestPolicies.gui])
        .then((userProperties) => {
          userData.username = userProperties.username;
          userData.password = userProperties.password;
          userData.userId = userProperties.userId;
        })
        .then(() => {
          cy.login(userData.username, userData.password, {
            path: SettingsMenu.circulationRequestPoliciesPath,
            waiter: RequestPolicy.waitLoading,
          });
        });
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    RequestPolicy.deleteRequestPolicyByNameViaAPI(newRequestPolicy.name);
    RequestPolicy.deleteRequestPolicyByNameViaAPI(editRequestPolicy.name);
    Users.deleteViaApi(userData.userId);
  });

  it(
    'C1218 Can create, edit and remove request policies (vega)',
    { tags: ['extendedPath', 'vega', 'C1218'] },
    () => {
      // Create a new request policy
      RequestPolicy.clickNewPolicy();
      RequestPolicy.fillRequestPolicy(newRequestPolicy);
      RequestPolicy.save();
      InteractorsTools.checkCalloutMessage(
        `The Request policy ${newRequestPolicy.name} was successfully created.`,
      );
      RequestPolicy.verifyRequestPolicy(newRequestPolicy);

      // duplicate the request policy
      RequestPolicy.duplicateRequestPolicy();
      RequestPolicy.fillRequestPolicy(duplicateRequestPolicy);
      RequestPolicy.save();
      InteractorsTools.checkCalloutMessage(
        `The Request policy ${duplicateRequestPolicy.name} was successfully created.`,
      );
      RequestPolicy.verifyRequestPolicy(duplicateRequestPolicy);

      // Edit the request policy
      RequestPolicy.editRequestPolicy();
      RequestPolicy.fillRequestPolicy(editRequestPolicy);
      RequestPolicy.save();
      InteractorsTools.checkCalloutMessage(
        `The Request policy ${editRequestPolicy.name} was successfully updated.`,
      );
      RequestPolicy.verifyRequestPolicy(editRequestPolicy);

      // Remove the request policy
      RequestPolicy.deleteRequestPolicy();
      InteractorsTools.checkCalloutMessage(
        `The Request policy ${editRequestPolicy.name} was successfully deleted.`,
      );
      RequestPolicy.verifyRequestPolicyInNotInTheList(editRequestPolicy.name);
    },
  );
});
