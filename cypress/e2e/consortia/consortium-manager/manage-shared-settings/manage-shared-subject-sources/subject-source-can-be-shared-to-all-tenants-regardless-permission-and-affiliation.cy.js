// import moment from 'moment';
// import { calloutTypes } from '../../../../../../interactors';
// import { getTestEntityValue } from '../../../../../support/utils/stringTools';
import ConsortiumManagerApp, {
  // messages,
  settingsItems,
} from '../../../../../support/fragments/consortium-manager/consortiumManagerApp';
import Affiliations, { tenantNames } from '../../../../../support/dictionary/affiliations';
import Permissions from '../../../../../support/dictionary/permissions';
// import Users from '../../../../../support/fragments/users/users';
import SelectMembers from '../../../../../support/fragments/consortium-manager/modal/select-members';
import TopMenuNavigation from '../../../../../support/fragments/topMenuNavigation';
// import ConfirmShare from '../../../../../support/fragments/consortium-manager/modal/confirm-share';
import ConsortiumManager from '../../../../../support/fragments/settings/consortium-manager/consortium-manager';
// import SettingsMenu from '../../../../../support/fragments/settingsMenu';
// import ConsortiaControlledVocabularyPaneset from '../../../../../support/fragments/consortium-manager/consortiaControlledVocabularyPaneset';
// import AlternativeTitleTypesConsortiumManager from '../../../../../support/fragments/consortium-manager/inventory/instances/alternativeTitleTypesConsortiumManager';
import SubjectSourcesManager from '../../../../../support/fragments/consortium-manager/inventory/instances/subjectSourcesManager';

describe('Consortia', () => {
  describe('Consortium manager', () => {
    describe('Manage shared settings', () => {
      describe('Manage shared Subject sources', () => {
        let userA;
        let userB;
        // const alternativeTitleTypes4 = {
        //   name: '',
        // };
        // const alternativeTitleTypes5 = {
        //   name: getTestEntityValue('AlternativeTitleTypes5'),
        // };

        before('Create users data', () => {
          cy.clearCookies({ domain: null });
          cy.getAdminToken();
          cy.createTempUser([
            Permissions.consortiaSettingsConsortiumManagerShare.gui,
            Permissions.uiSettingsSubjectSourceCreateEditDelete.gui,
          ]).then((userProperties) => {
            userA = userProperties;

            cy.assignAffiliationToUser(Affiliations.College, userA.userId);
            cy.setTenant(Affiliations.College);
            cy.assignPermissionsToExistingUser(userA.userId, [Permissions.uiOrganizationsView.gui]);
          });

          cy.resetTenant();
          cy.createTempUser([Permissions.uiSettingsSubjectSourceCreateEditDelete.gui]).then(
            (userProperties) => {
              userB = userProperties;

              cy.assignAffiliationToUser(Affiliations.College, userB.userId);
              cy.setTenant(Affiliations.College);
              cy.assignPermissionsToExistingUser(userB.userId, [
                Permissions.uiSettingsSubjectSourceCreateEditDelete.gui,
              ]);

              cy.resetTenant();
              cy.getAdminToken();
              cy.assignAffiliationToUser(Affiliations.University, userB.userId);
              cy.setTenant(Affiliations.University);
              cy.assignPermissionsToExistingUser(userB.userId, [
                Permissions.uiSettingsSubjectSourceCreateEditDelete.gui,
              ]);
            },
          );
          cy.resetTenant();
        });

        it(
          'C594429 Subject source can be shared to all tenants in "Consortium manager" app regardless permission and affiliation (consortia) (folijet)',
          { tags: ['criticalPathECS', 'folijet', 'C594429'] },
          () => {
            cy.login(userA.username, userA.password);
            ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
            TopMenuNavigation.navigateToApp('Consortium manager');
            ConsortiumManagerApp.waitLoading();
            SelectMembers.selectAllMembers();
            ConsortiumManagerApp.verifyStatusOfConsortiumManager(2);

            ConsortiumManagerApp.chooseSettingsItem(settingsItems.inventory);
            SubjectSourcesManager.choose();
          },
        );
      });
    });
  });
});
