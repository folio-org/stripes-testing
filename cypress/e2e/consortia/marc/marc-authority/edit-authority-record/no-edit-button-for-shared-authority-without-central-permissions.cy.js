import { Permissions } from '../../../../../support/dictionary';
import TopMenu from '../../../../../support/fragments/topMenu';
import Users from '../../../../../support/fragments/users/users';
import MarcAuthorities from '../../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../../support/fragments/marcAuthority/marcAuthority';
import Affiliations, { tenantNames } from '../../../../../support/dictionary/affiliations';
import ConsortiumManager from '../../../../../support/fragments/settings/consortium-manager/consortium-manager';
import getRandomPostfix, { getRandomLetters } from '../../../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Edit Authority record', () => {
      describe('Consortia', () => {
        const testData = {
          searchQuery: `AT_C409427_MarcAuthority_${getRandomPostfix()}`,
          expectedActionsMenuItemsWithoutEdit: ['Print'],
          tag008: '008',
          tag100: '100',
        };

        const authData = {
          prefix: getRandomLetters(15),
          startWithNumber: '1',
        };

        const marcAuthorityFields = [
          {
            tag: testData.tag100,
            content: `$a ${testData.searchQuery}`,
            indicators: ['1', '\\'],
          },
        ];

        let createdAuthorityID;

        before('Create test data', () => {
          // Reset to Central tenant for data creation
          cy.resetTenant();
          cy.getAdminToken();
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C409427_MarcAuthority');

          // Create MARC authority record in Central tenant
          MarcAuthorities.createMarcAuthorityViaAPI(
            authData.prefix,
            authData.startWithNumber,
            marcAuthorityFields,
          ).then((authorityId) => {
            createdAuthorityID = authorityId;

            // Create user with proper permissions
            cy.createTempUser([Permissions.uiMarcAuthoritiesAuthorityRecordView.gui]).then(
              (createdUserProperties) => {
                testData.userProperties = createdUserProperties;

                // Assign affiliations to user
                cy.assignAffiliationToUser(Affiliations.College, testData.userProperties.userId);

                // Set Member tenant permissions (College) - includes edit permissions
                cy.setTenant(Affiliations.College);
                cy.assignPermissionsToExistingUser(testData.userProperties.userId, [
                  Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
                  Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
                  Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
                ]);

                // Login and switch to Member tenant initially
                cy.resetTenant();
                cy.login(testData.userProperties.username, testData.userProperties.password, {
                  path: TopMenu.marcAuthorities,
                  waiter: MarcAuthorities.waitLoading,
                });
                ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
                MarcAuthorities.waitLoading();
              },
            );
          });
        });

        after('Delete test data', () => {
          cy.resetTenant();
          cy.getAdminToken();
          MarcAuthority.deleteViaAPI(createdAuthorityID);
          Users.deleteViaApi(testData.userProperties.userId);
        });

        it(
          'C409427 No "Edit" button for shared "MARC Authority" record in Member tenant when user does not have edit permissions in Central tenant (consortia) (spitfire)',
          { tags: ['extendedPathECS', 'spitfire', 'C409427'] },
          () => {
            // Step 1: Fill search input field with heading of shared MARC Authority record → Click Search button
            MarcAuthorities.searchBeats(testData.searchQuery);
            MarcAuthorities.waitLoading();

            // Step 2: Click on the heading of shared MARC Authority record in second pane
            MarcAuthorities.select(createdAuthorityID);
            MarcAuthority.waitLoading();
            MarcAuthority.contains(testData.searchQuery);

            // Step 3: Click on the "Actions" menu button on the third pane
            // Verify "Edit" option is NOT shown in menu in Member tenant
            MarcAuthority.checkActionDropdownContent(testData.expectedActionsMenuItemsWithoutEdit);

            // Step 4: Switch affiliation to Central tenant
            ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.central);
            MarcAuthorities.waitLoading();

            // Step 5: Fill search input field with heading of shared MARC Authority record → Click Search button
            MarcAuthorities.searchBeats(testData.searchQuery);
            MarcAuthorities.waitLoading();

            // Step 6: Click on the heading of shared MARC Authority record in second pane
            MarcAuthorities.select(createdAuthorityID);
            MarcAuthority.waitLoading();
            MarcAuthority.contains(testData.searchQuery);

            // Step 7: Click on the "Actions" menu button on the third pane
            // Verify "Edit" option is NOT shown in menu in Central tenant either
            MarcAuthority.checkActionDropdownContent(testData.expectedActionsMenuItemsWithoutEdit);
          },
        );
      });
    });
  });
});
