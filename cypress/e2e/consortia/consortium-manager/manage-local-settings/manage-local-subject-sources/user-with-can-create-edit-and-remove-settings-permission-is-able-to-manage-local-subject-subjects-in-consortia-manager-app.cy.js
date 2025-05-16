import Affiliations, { tenantNames } from '../../../../../support/dictionary/affiliations';
import Permissions from '../../../../../support/dictionary/permissions';
// import ConsortiaControlledVocabularyPaneset, {
//   actionIcons,
// } from '../../../../support/fragments/consortium-manager/consortiaControlledVocabularyPaneset';
// import ConsortiumManagerApp, {
//   messages,
//   settingsItems,
// } from '../../../../support/fragments/consortium-manager/consortiumManagerApp';
// import ConfirmCreate from '../../../../support/fragments/consortium-manager/modal/confirm-create';
// import SelectMembers from '../../../../support/fragments/consortium-manager/modal/select-members';
// import AlternativeTitleTypesConsortiumManager from '../../../../support/fragments/consortium-manager/inventory/instances/alternativeTitleTypesConsortiumManager';
import ConsortiumManager from '../../../../../support/fragments/settings/consortium-manager/consortium-manager';
// import SettingsMenu from '../../../../support/fragments/settingsMenu';
// import TopMenu from '../../../../support/fragments/topMenu';
// import Users from '../../../../support/fragments/users/users';
// import { getTestEntityValue } from '../../../../support/utils/stringTools';

describe('Consortium manager', () => {
  describe('Manage local settings', () => {
    describe('Manage local Subject sources', () => {
      const testData = {};

      before('Create test data', () => {
        cy.getAdminToken();
        cy.createTempUser([
          Permissions.consortiaSettingsConsortiumManagerEdit.gui,
          Permissions.uiSettingsSubjectSourceCreateEditDelete.gui,
        ]).then((userProperties) => {
          testData.user = userProperties;

          cy.assignAffiliationToUser(Affiliations.College, testData.user.userId);
          cy.setTenant(Affiliations.College);
          cy.assignPermissionsToExistingUser(testData.user.userId, [
            Permissions.uiSettingsSubjectSourceCreateEditDelete.gui,
          ]);

          cy.assignAffiliationToUser(Affiliations.University, testData.user.userId);
          cy.setTenant(Affiliations.University);
          cy.assignPermissionsToExistingUser(testData.user.userId, [
            Permissions.uiSettingsSubjectSourceCreateEditDelete.gui,
          ]);
          cy.resetTenant();

          cy.login(testData.user.username, testData.user.password);
          ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
          ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
        });
      });

      it(
        'C594434 User with "Consortium manager: Can create, edit and remove settings" permission is able to manage local subjects of selected affiliated tenants in "Consortium manager" app (consortia) (folijet)',
        { tags: ['criticalPathECS', 'folijet', 'C594434'] },
        () => {},
      );
    });
  });
});
