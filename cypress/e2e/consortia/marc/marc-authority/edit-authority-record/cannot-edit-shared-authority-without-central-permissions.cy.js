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
          searchQuery: `AT_C405538_MarcAuthority_${getRandomPostfix()}`,
          searchOption: 'Keyword',
          expectedActionsMenuItems: ['Print'],
          sharedAuthorityText: 'Shared MARC authority record',
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
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C405538_MarcAuthority');

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

                // Set Member tenant permissions (College)
                cy.setTenant(Affiliations.College);
                cy.assignPermissionsToExistingUser(testData.userProperties.userId, [
                  Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
                  Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
                  Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
                ]);

                // Login and switch to Member tenant
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
          'C405538 User cannot edit Shared "MARC authority" record in Member tenant without permission in Central tenant (consortia) (spitfire)',
          { tags: ['extendedPathECS', 'spitfire', 'C405538'] },
          () => {
            // Steps 1,2: Search for created record
            MarcAuthorities.searchBeats(testData.searchQuery);

            // Step 3: Open detail view of MARC authority record by clicking on its heading
            MarcAuthorities.select(createdAuthorityID);
            MarcAuthority.waitLoading();
            MarcAuthority.contains(testData.searchQuery);

            // Step 4: Click on the "Actions" button in the third pane
            // Verify Actions menu contains only Print option and no Edit option
            MarcAuthority.checkActionDropdownContent(testData.expectedActionsMenuItems);
          },
        );
      });
    });
  });
});
