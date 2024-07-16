import uuid from 'uuid';
import Permissions from '../../../../support/dictionary/permissions';
import PatronNoticePolicy from '../../../../support/fragments/settings/circulation/patron-notices/newNoticePolicy';
import SettingsMenu from '../../../../support/fragments/settingsMenu';
import Users from '../../../../support/fragments/users/users';
import InteractorsTools from '../../../../support/utils/interactorsTools';

describe('Permissions -> Circulation', () => {
  const userData = {};
  const newNoticePolicy = {
    name: uuid(),
    description: 'description',
  };
  const duplicateNoticePolicy = {
    name: uuid(),
    description: 'duplicate description',
  };
  const editNoticePolicy = {
    name: uuid(),
    description: 'new description',
  };

  before('Prepare test data', () => {
    cy.getAdminToken().then(() => {
      cy.createTempUser([Permissions.uiCirculationSettingsNoticePolicies.gui])
        .then((userProperties) => {
          userData.username = userProperties.username;
          userData.password = userProperties.password;
          userData.userId = userProperties.userId;
        })
        .then(() => {
          cy.login(userData.username, userData.password, {
            path: SettingsMenu.circulationPatronNoticePoliciesPath,
            waiter: PatronNoticePolicy.waitLoading,
          });
        });
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    PatronNoticePolicy.deletePatronNoticePolicyByNameViaAPI(newNoticePolicy.name);
    PatronNoticePolicy.deletePatronNoticePolicyByNameViaAPI(duplicateNoticePolicy.name);
    PatronNoticePolicy.deletePatronNoticePolicyByNameViaAPI(editNoticePolicy.name);
    Users.deleteViaApi(userData.userId);
  });

  it(
    'C1215 Can create, edit and remove notice policies (vega)',
    { tags: ['extendedPath', 'vega'] },
    () => {
      // Create a new patron notice policy
      PatronNoticePolicy.startAdding();
      PatronNoticePolicy.fillGeneralInformation(newNoticePolicy);
      PatronNoticePolicy.save();
      InteractorsTools.checkCalloutMessage(
        `The Patron notice policy ${newNoticePolicy.name} was successfully created.`,
      );
      PatronNoticePolicy.verifyNoticePolicyInTheList(newNoticePolicy);

      // Duplicate the patron notice policy
      PatronNoticePolicy.choosePolicy(newNoticePolicy);
      PatronNoticePolicy.duplicateAndFillPolicy(duplicateNoticePolicy);
      PatronNoticePolicy.save();
      InteractorsTools.checkCalloutMessage(
        `The Patron notice policy ${duplicateNoticePolicy.name} was successfully created.`,
      );
      PatronNoticePolicy.verifyNoticePolicyInTheList(duplicateNoticePolicy);

      // Edit the patron notice policy
      PatronNoticePolicy.clickEditNoticePolicy(duplicateNoticePolicy);
      PatronNoticePolicy.fillGeneralInformation(editNoticePolicy);
      PatronNoticePolicy.save();
      InteractorsTools.checkCalloutMessage(
        `The Patron notice policy ${editNoticePolicy.name} was successfully updated.`,
      );
      PatronNoticePolicy.verifyNoticePolicyInTheList(editNoticePolicy);

      // // Remove the patron notice policy
      PatronNoticePolicy.choosePolicy(editNoticePolicy);
      PatronNoticePolicy.deletePolicy();
      InteractorsTools.checkCalloutMessage(
        `The Patron notice policy ${editNoticePolicy.name} was successfully deleted.`,
      );
      PatronNoticePolicy.verifyNoticePolicyNotInTheList(editNoticePolicy);
    },
  );
});
