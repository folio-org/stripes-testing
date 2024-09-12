import uuid from 'uuid';
import { REQUEST_TYPES } from '../../support/constants';
import Permissions from '../../support/dictionary/permissions';
import RequestPolicy from '../../support/fragments/circulation/request-policy';
import SettingsMenu from '../../support/fragments/settingsMenu';
import Users from '../../support/fragments/users/users';
import InteractorsTools from '../../support/utils/interactorsTools';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Requests', () => {
  const userData = {};
  const description = `hold_description${getRandomPostfix()}`;
  const requestPolicyBody = {
    requestTypes: [REQUEST_TYPES.HOLD, REQUEST_TYPES.PAGE],
    name: `hold${getRandomPostfix()}`,
    id: uuid(),
  };

  before('Prepare test data', () => {
    cy.getAdminToken()
      .then(() => {
        RequestPolicy.createViaApi(requestPolicyBody);
      })
      .then(() => {
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
    RequestPolicy.deleteViaApi(requestPolicyBody.id);
    Users.deleteViaApi(userData.userId);
  });

  it(
    'C367969 Check that User can save changes while edit "Request policy" without changing "Request policy name *" field (vega)',
    { tags: ['criticalPath', 'vega'] },
    () => {
      RequestPolicy.selectRequestPolicy(requestPolicyBody.name);
      RequestPolicy.editRequestPolicy();
      RequestPolicy.setDescription(description);
      RequestPolicy.save();
      InteractorsTools.checkCalloutMessage(
        `The Request policy ${requestPolicyBody.name} was successfully updated.`,
      );
    },
  );
});
