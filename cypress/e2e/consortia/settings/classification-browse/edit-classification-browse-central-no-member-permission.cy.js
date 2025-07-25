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
import TopMenu from '../../../../support/fragments/topMenu';
import { APPLICATION_NAMES } from '../../../../support/constants';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';

describe('Inventory', () => {
  describe('Settings', () => {
    describe('Classification browse', () => {
      describe('Consortia', () => {
        let user;

        const testData = {
          optionToSelect: classificationIdentifierTypesDropdownDefaultOptions[0],
          classificationBrowseName: defaultClassificationBrowseNames[0],
          classificationBrowseId: defaultClassificationBrowseIdsAlgorithms[0].id,
          classificationBrowseAlgorithm: defaultClassificationBrowseIdsAlgorithms[0].algorithm,
        };

        const saveCalloutText = `The Classification browse type ${testData.classificationBrowseName} was successfully updated`;
        const classifBrowseOption = 'Classification browse';
        const classifTypesOption = 'Classification identifier types';

        before('Create user, login', () => {
          cy.resetTenant();
          cy.getAdminToken();
          // remove all identifier types from target classification browse
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
              Permissions.crudClassificationIdentifierTypes.gui,
            ]);

            cy.resetTenant();
            cy.waitForAuthRefresh(() => {
              cy.login(user.username, user.password, {
                path: TopMenu.settingsPath,
                waiter: SettingsPane.waitLoading,
              });
              cy.reload();
              SettingsPane.waitLoading();
            }, 20_000);
            TopMenuNavigation.navigateToApp(
              APPLICATION_NAMES.SETTINGS,
              APPLICATION_NAMES.INVENTORY,
            );
            ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
            ClassificationBrowse.openClassificationBrowse();
            ClassificationBrowse.checkClassificationBrowsePaneOpened();
          });
        });

        after('Delete user', () => {
          cy.resetTenant();
          cy.getAdminToken();
          // remove added identifier type from target classification browse
          ClassificationBrowse.updateIdentifierTypesAPI(
            testData.classificationBrowseId,
            testData.classificationBrowseAlgorithm,
            [],
          );
          Users.deleteViaApi(user.userId);
        });

        it(
          'C451648 Edit "Classification browse" option from Central tenant when user doesn\'t have permission on Member tenant (consortia) (spitfire)',
          { tags: ['extendedPathECS', 'spitfire', 'C451648'] },
          () => {
            // Step 1: Click on the "Edit" (pencil) icon next to Classification browse option
            ClassificationBrowse.checkClassificationBrowseInTable(
              testData.classificationBrowseName,
              '',
            );
            ClassificationBrowse.clickEditButtonInBrowseOption(testData.classificationBrowseName);

            // Verify enabled multi-select dropdown element is displayed
            ClassificationBrowse.checkClassificationIdentifierTypesExistsInBrowseoption(
              testData.classificationBrowseName,
            );
            // Verify enabled "Cancel" button is displayed
            ClassificationBrowse.checkCancelButtonEnabledInBrowseOption(
              testData.classificationBrowseName,
            );
            // Verify disabled "Save" button is displayed
            ClassificationBrowse.checkSaveButtonEnabledInBrowseOption(
              testData.classificationBrowseName,
              false,
            );

            // Step 2: Click on the multi-select dropdown element and select one of the available options
            ClassificationBrowse.expandClassificationIdentifierTypesDropdownInBrowseOption(
              testData.classificationBrowseName,
            );
            ClassificationBrowse.selectClassificationIdentifierTypesDropdownOption(
              testData.optionToSelect,
            );

            // Verify selected option is displayed in input field
            ClassificationBrowse.checkOptionSelectedInClassificationIdentifierTypesDropdown(
              testData.classificationBrowseName,
              [testData.optionToSelect],
            );
            // Verify multi-select dropdown is still expanded
            ClassificationBrowse.checkClassificationIdentifierTypesDropdownExpanded(
              testData.classificationBrowseName,
            );
            // Verify "Save" button became enabled
            ClassificationBrowse.checkSaveButtonEnabledInBrowseOption(
              testData.classificationBrowseName,
            );

            // Step 3: Click on the "Save" button
            ClassificationBrowse.clickSaveButtonInBrowseOption(testData.classificationBrowseName);
            cy.wait(1000);

            // Verify successful saving toast notification is displayed
            InteractorsTools.checkCalloutMessage(saveCalloutText);
            // Verify "Edit" (pencil) icon is displayed instead of "Cancel" and "Save" buttons
            ClassificationBrowse.checkClassificationBrowseInTable(
              testData.classificationBrowseName,
              testData.optionToSelect,
            );

            // Step 4: Switch active affiliation to Member tenant
            ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
            SettingsPane.waitLoading();

            // Verify "Settings" >> "Inventory" page opened from Member tenant
            // Verify "Classification browse" section doesn't display on the "Inventory" pane
            SettingsPane.checkOptionInSecondPaneExists(classifTypesOption, true);
            SettingsPane.checkOptionInSecondPaneExists(classifBrowseOption, false);
          },
        );
      });
    });
  });
});
