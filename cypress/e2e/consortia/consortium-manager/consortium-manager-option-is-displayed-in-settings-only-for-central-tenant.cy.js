import { CAPABILITY_TYPES } from '../../../support/constants';
import Affiliations, { tenantNames } from '../../../support/dictionary/affiliations';
import Users from '../../../support/fragments/users/users';
import CapabilitySets from '../../../support/dictionary/capabilitySets';
import ConsortiumManager from '../../../support/fragments/settings/consortium-manager/consortium-manager';
import SettingsMenu from '../../../support/fragments/settingsMenu';

describe('Consortia', () => {
  describe('Consortium manager', () => {
    let user;

    const capabSetsToAssignCentral = [
      CapabilitySets.uiConsortiaSettingsSettingsMembershipView,
      CapabilitySets.uiConsortiaSettingsSettingsMembershipEdit,
    ];

    before('Create users, data', () => {
      cy.resetTenant();
      cy.getAdminToken();

      cy.createTempUser([]).then((userProperties) => {
        user = userProperties;

        // Assign capability sets in Central tenant
        cy.assignCapabilitiesToExistingUser(user.userId, [], capabSetsToAssignCentral);

        // Assign affiliation and ALL settings capability sets in College (member) tenant
        cy.assignAffiliationToUser(Affiliations.College, user.userId);
        cy.setTenant(Affiliations.College);
        cy.getApplicationsForTenantApi(Affiliations.College, true).then((appIds) => {
          cy.getCapabilitySetsApi(2000, {
            query: `type==${CAPABILITY_TYPES.SETTINGS.toUpperCase()} and applicationId==(${appIds.join(
              ' or ',
            )})`,
          }).then((capabSets) => {
            cy.updateCapabilitySetsForUserApi(
              user.userId,
              capabSets.map(({ id }) => id),
            );
          });
        });

        cy.resetTenant();
        cy.login(user.username, user.password, {
          path: SettingsMenu.consortiumManagerPath,
          waiter: ConsortiumManager.waitLoading,
        });
      });
    });

    after('Delete users, data', () => {
      cy.resetTenant();
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
    });

    it(
      'C386869 "Consortium manager" option is displayed in "Settings" only for Central Tenant (consortia) (thunderjet)',
      { tags: ['criticalPathECS', 'thunderjet', 'C386869'] },
      () => {
        ConsortiumManager.verifyConsortiumManagerOnPage();
        ConsortiumManager.switchActiveAffiliationExists();
        ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
        ConsortiumManager.verifyConsortiumManagerIsAbsent();
      },
    );
  });
});
