import { Permissions } from '../../../../support/dictionary';
import Users from '../../../../support/fragments/users/users';
import ClassificationBrowse, {
  defaultClassificationBrowseNames,
  classificationIdentifierTypesDropdownDefaultOptions,
  defaultClassificationBrowseIdsAlgorithms,
} from '../../../../support/fragments/settings/inventory/instances/classificationBrowse';
import InteractorsTools from '../../../../support/utils/interactorsTools';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import SettingsPane from '../../../../support/fragments/settings/settingsPane';
import { APPLICATION_NAMES } from '../../../../support/constants';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';

describe('Inventory', () => {
  describe('Settings', () => {
    describe('Classification browse', () => {
      describe('Consortia', () => {
        let user;

        const testData = {
          optionToSelect: classificationIdentifierTypesDropdownDefaultOptions[0],
          classificationBrowseName: defaultClassificationBrowseNames[1],
          classificationBrowseId: defaultClassificationBrowseIdsAlgorithms[1].id,
          classificationBrowseAlgorithm: defaultClassificationBrowseIdsAlgorithms[1].algorithm,
        };

        const saveCalloutText = `The Classification browse type ${testData.classificationBrowseName} was successfully updated`;

        before('Create user, login', () => {
          cy.resetTenant();
          cy.getAdminToken();
          // remove all identifier types from target classification browse, if any
          ClassificationBrowse.getIdentifierTypesForCertainBrowseAPI(
            testData.classificationBrowseId,
          ).then((types) => {
            testData.originalTypes = types;
          });
          ClassificationBrowse.updateIdentifierTypesAPI(
            testData.classificationBrowseId,
            testData.classificationBrowseAlgorithm,
            [],
          );
          cy.createTempUser([
            Permissions.uiInventorySettingsConfigureClassificationBrowse.gui,
          ]).then((userProperties) => {
            user = userProperties;
            cy.assignAffiliationToUser(Affiliations.College, user.userId);
            cy.setTenant(Affiliations.College);
            cy.assignPermissionsToExistingUser(user.userId, [
              Permissions.uiInventorySettingsConfigureClassificationBrowse.gui,
            ]);

            cy.resetTenant();
            cy.login(user.username, user.password);
            ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
            ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS, 'Inventory');
            ClassificationBrowse.openClassificationBrowse();
            ClassificationBrowse.checkClassificationBrowsePaneOpened();
          });
        });

        after('Delete user', () => {
          cy.resetTenant();
          cy.getAdminToken();
          // restore the original identifier types for target classification browse
          ClassificationBrowse.updateIdentifierTypesAPI(
            testData.classificationBrowseId,
            testData.classificationBrowseAlgorithm,
            testData.originalTypes,
          );
          Users.deleteViaApi(user.userId);
        });

        it(
          'C451647 Edit "Classification browse" option from Member tenant (spitfire)',
          { tags: ['criticalPathECS', 'spitfire', 'C451647'] },
          () => {
            ClassificationBrowse.checkClassificationBrowseInTable(
              testData.classificationBrowseName,
              '',
            );
            ClassificationBrowse.clickEditButtonInBrowseOption(testData.classificationBrowseName);
            ClassificationBrowse.checkClassificationIdentifierTypesExistsInBrowseoption(
              testData.classificationBrowseName,
            );
            ClassificationBrowse.checkCancelButtonEnabledInBrowseOption(
              testData.classificationBrowseName,
            );
            ClassificationBrowse.checkSaveButtonEnabledInBrowseOption(
              testData.classificationBrowseName,
              false,
            );
            ClassificationBrowse.expandClassificationIdentifierTypesDropdownInBrowseOption(
              testData.classificationBrowseName,
            );
            ClassificationBrowse.selectClassificationIdentifierTypesDropdownOption(
              testData.optionToSelect,
            );
            ClassificationBrowse.checkOptionSelectedInClassificationIdentifierTypesDropdown(
              testData.classificationBrowseName,
              [testData.optionToSelect],
            );
            ClassificationBrowse.checkClassificationIdentifierTypesDropdownExpanded(
              testData.classificationBrowseName,
            );
            ClassificationBrowse.checkSaveButtonEnabledInBrowseOption(
              testData.classificationBrowseName,
            );
            ClassificationBrowse.clickSaveButtonInBrowseOption(testData.classificationBrowseName);
            cy.wait(1000);
            InteractorsTools.checkCalloutMessage(saveCalloutText);
            ClassificationBrowse.checkClassificationBrowseInTable(
              testData.classificationBrowseName,
              testData.optionToSelect,
            );

            ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.central);
            SettingsPane.waitLoading();
            ClassificationBrowse.openClassificationBrowse();
            ClassificationBrowse.checkClassificationBrowsePaneOpened();
            ClassificationBrowse.checkClassificationBrowseInTable(
              testData.classificationBrowseName,
              testData.optionToSelect,
            );
          },
        );
      });
    });
  });
});
