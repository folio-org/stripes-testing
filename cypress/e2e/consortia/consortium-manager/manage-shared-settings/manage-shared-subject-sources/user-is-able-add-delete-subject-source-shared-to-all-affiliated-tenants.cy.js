// import { calloutTypes } from '../../../../../../interactors';
// import { APPLICATION_NAMES } from '../../../../../support/constants';
import Affiliations from '../../../../../support/dictionary/affiliations';
// , { tenantNames }

import Permissions from '../../../../../support/dictionary/permissions';
// import ConsortiumManager, {
//   settingsItems,
// } from '../../../../../support/fragments/consortium-manager/consortiumManagerApp';
// import ConsortiumSubjectSources from '../../../../../support/fragments/consortium-manager/inventory/instances/subjectSourcesConsortiumManager';
// import SelectMembersModal from '../../../../../support/fragments/consortium-manager/modal/select-members';
// import ConsortiumManagerSettings from '../../../../../support/fragments/settings/consortium-manager/consortium-manager';
// import SubjectSources from '../../../../../support/fragments/settings/inventory/instances/subjectSources';
// import SettingsInventory, {
//   INVENTORY_SETTINGS_TABS,
// } from '../../../../../support/fragments/settings/inventory/settingsInventory';
// import TopMenuNavigation from '../../../../../support/fragments/topMenuNavigation';
// import Users from '../../../../../support/fragments/users/users';
// import InteractorsTools from '../../../../../support/utils/interactorsTools';
// import getRandomPostfix from '../../../../../support/utils/stringTools';

describe('Consortia', () => {
  describe('Consortium manager', () => {
    describe('Manage shared settings', () => {
      describe('Manage shared Subject sources', () => {
        let userA;
        let userB;
        // const subjectSource = {
        //   name: `C594429 autotestSubjectSourceName${getRandomPostfix()}`,
        //   source: 'consortium',
        //   consortiaUser: 'System, System user - mod-consortia-keycloak',
        // };
        // const calloutMessage = `You do not have permissions at one or more members: ${tenantNames.college}`;

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

        // after('Delete users data', () => {
        //   cy.resetTenant();
        //   cy.getAdminToken();
        //   cy.getConsortiaId().then((consortiaId) => {
        //     Users.deleteViaApi(userA.userId);
        //     Users.deleteViaApi(userB.userId);
        //     ConsortiumSubjectSources.getSubjectSourceIdViaApi(subjectSource.name, consortiaId).then(
        //       (id) => {
        //         ConsortiumSubjectSources.deleteViaApi(id, subjectSource.name, consortiaId);
        //       },
        //     );
        //   });
        // });

        it(
          'C594427 User with "Consortium manager: Can share settings to all members" permission is able to add/delete subject source shared to all affiliated tenants in "Consortium manager" app (consortia) (folijet)',
          { tags: ['criticalPathECS', 'folijet', 'C594427'] },
          () => {},
        );
      });
    });
  });
});
