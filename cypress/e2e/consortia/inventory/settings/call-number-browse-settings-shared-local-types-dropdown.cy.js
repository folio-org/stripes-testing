import Permissions from '../../../../support/dictionary/permissions';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import SettingsPane from '../../../../support/fragments/settings/settingsPane';
import { CallNumberBrowseSettings } from '../../../../support/fragments/settings/inventory/instances/callNumberBrowse';
import {
  CallNumberTypes,
  CALL_NUMBER_TYPES_DEFAULT,
} from '../../../../support/fragments/settings/inventory/instances/callNumberTypes';
import CallNumberTypesConsortiumManager from '../../../../support/fragments/consortium-manager/inventory/holdings-items/callNumberTypesConsortiumManager';
import { APPLICATION_NAMES, BROWSE_CALL_NUMBER_OPTIONS } from '../../../../support/constants';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Settings', () => {
    describe('Call number browse', () => {
      describe('Consortia', () => {
        const randomPostfix = getRandomPostfix();
        const sharedCallNumberType = {
          payload: { name: `AT_C627464_Shared_${randomPostfix}` },
        };
        const centralLocalCallNumberType = {
          payload: { name: `AT_C627464_CentralLocal_${randomPostfix}` },
        };
        const memberLocalCallNumberType = {
          payload: { name: `AT_C627464_MemberLocal_${randomPostfix}` },
        };
        const browseOption = BROWSE_CALL_NUMBER_OPTIONS.CALL_NUMBERS_ALL;
        const testData = {};

        const expectedCallNumberTypes = [
          ...Object.values(CALL_NUMBER_TYPES_DEFAULT),
          sharedCallNumberType.payload.name,
          centralLocalCallNumberType.payload.name,
        ];

        before('Create test data', () => {
          cy.resetTenant();
          cy.getAdminToken();

          CallNumberTypes.deleteCallNumberTypesLike('C627464');

          // Create shared call number type on Central
          CallNumberTypesConsortiumManager.createViaApiShared(sharedCallNumberType);

          // Create local call number type on Central
          CallNumberTypes.createCallNumberTypeViaApi({
            name: centralLocalCallNumberType.payload.name,
          }).then((id) => {
            centralLocalCallNumberType.id = id;
          });

          // Create local call number type on Member
          cy.setTenant(Affiliations.College);
          CallNumberTypes.createCallNumberTypeViaApi({
            name: memberLocalCallNumberType.payload.name,
          }).then((id) => {
            memberLocalCallNumberType.id = id;
          });

          cy.resetTenant();
          cy.createTempUser([Permissions.uiSettingsCallNumberBrowseView.gui]).then(
            (userProperties) => {
              testData.user = userProperties;

              cy.assignAffiliationToUser(Affiliations.College, testData.user.userId);
              cy.setTenant(Affiliations.College);
              cy.assignPermissionsToExistingUser(testData.user.userId, [
                Permissions.uiSettingsCallNumberBrowseView.gui,
              ]);

              cy.resetTenant();
              CallNumberBrowseSettings.assignCallNumberTypesViaApi({
                name: browseOption,
                callNumberTypes: [],
              });
              cy.login(testData.user.username, testData.user.password, {
                path: TopMenu.settingsPath,
                waiter: SettingsPane.waitLoading,
                authRefresh: true,
              });
              SettingsPane.selectSettingsTab(APPLICATION_NAMES.INVENTORY);
              ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
              CallNumberBrowseSettings.openCallNumberBrowse();
              CallNumberBrowseSettings.validateCallNumberBrowsePaneOpened();
            },
          );
        });

        after('Delete test data', () => {
          cy.resetTenant();
          cy.getAdminToken();
          CallNumberBrowseSettings.assignCallNumberTypesViaApi({
            name: browseOption,
            callNumberTypes: [],
          });
          CallNumberTypesConsortiumManager.deleteViaApi(sharedCallNumberType);
          CallNumberTypes.deleteLocalCallNumberTypeViaApi(centralLocalCallNumberType.id);
          cy.setTenant(Affiliations.College);
          CallNumberTypes.deleteLocalCallNumberTypeViaApi(memberLocalCallNumberType.id);
          cy.resetTenant();
          Users.deleteViaApi(testData.user.userId);
        });

        it(
          'C627464 Only Shared "Call numbe types" are displayed in "Call number types" multi-select dropdown on Central and Member tenants (consortia) (spitfire)',
          { tags: ['extendedPathECS', 'spitfire', 'C627464'] },
          () => {
            // Step 1: Click on the "Edit" icon next to a Call number browse option
            CallNumberBrowseSettings.clickEditButtonForItem(browseOption);
            CallNumberBrowseSettings.validateSaveButtonStatusForItem({
              itemName: browseOption,
              isEnabled: false,
            });
            CallNumberBrowseSettings.validateCancelButtonStatusForItem({
              itemName: browseOption,
              isEnabled: true,
            });

            // Step 2: Expand dropdown and verify available options on Central
            CallNumberBrowseSettings.expandCallNumberTypeDropdownOption(browseOption);
            expectedCallNumberTypes.forEach((expectedType) => {
              CallNumberBrowseSettings.validateAvailableCallNumberTypeOption(expectedType);
            });
            // Verify member-local type is NOT shown on Central
            CallNumberBrowseSettings.validateAvailableCallNumberTypeOption(
              memberLocalCallNumberType.payload.name,
              false,
            );
            CallNumberBrowseSettings.clickCancelButtonForItem(browseOption);

            // Step 3: Switch to Member tenant
            ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
            SettingsPane.waitLoading();
            SettingsPane.selectSettingsTab(APPLICATION_NAMES.INVENTORY);

            // Step 4: Open Call number browse on Member
            CallNumberBrowseSettings.openCallNumberBrowse();
            CallNumberBrowseSettings.validateCallNumberBrowsePaneOpened();

            // Step 5: Expand dropdown and verify available options on Member
            CallNumberBrowseSettings.clickEditButtonForItem(browseOption);
            CallNumberBrowseSettings.expandCallNumberTypeDropdownOption(browseOption);
            // Same shared + default types should be shown
            expectedCallNumberTypes.forEach((expectedType) => {
              CallNumberBrowseSettings.validateAvailableCallNumberTypeOption(expectedType);
            });
            // Member-local type should NOT be shown
            CallNumberBrowseSettings.validateAvailableCallNumberTypeOption(
              memberLocalCallNumberType.payload.name,
              false,
            );
          },
        );
      });
    });
  });
});
