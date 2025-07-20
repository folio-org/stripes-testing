import Affiliations, { tenantNames } from '../../../../../support/dictionary/affiliations';
import Permissions from '../../../../../support/dictionary/permissions';
import MarcAuthority from '../../../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../../support/fragments/topMenu';
import Users from '../../../../../support/fragments/users/users';
import MarcAuthorities from '../../../../../support/fragments/marcAuthority/marcAuthorities';
import getRandomPostfix, { randomFourDigitNumber } from '../../../../../support/utils/stringTools';
import ConsortiumManager from '../../../../../support/fragments/settings/consortium-manager/consortium-manager';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Edit Authority record', () => {
      describe('Consortia', () => {
        const keywordOption = 'Keyword';
        const sharedEditHeader = 'Edit shared MARC authority record';
        const marcAuthorityHeading = `AT_C446169_MarcAuthority_${getRandomPostfix()}`;
        const prefix = '';
        const startsWith = `${randomFourDigitNumber()}${randomFourDigitNumber()}C446169`;
        const authorityFields = [
          { tag: '100', content: `$a ${marcAuthorityHeading}`, indicators: ['\\', '\\'] },
        ];
        const userPermissions = [
          Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
        ];
        const users = {};
        let createdAuthorityId;

        before('Create user, data', () => {
          cy.resetTenant();
          cy.getAdminToken();
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C446169_');
          // Create shared MARC authority record
          MarcAuthorities.createMarcAuthorityViaAPI(prefix, startsWith, authorityFields).then(
            (createdRecordId) => {
              createdAuthorityId = createdRecordId;
              cy.createTempUser(userPermissions).then((userProperties) => {
                users.userProperties = userProperties;
                cy.assignAffiliationToUser(Affiliations.College, users.userProperties.userId);
                cy.setTenant(Affiliations.College);
                cy.assignPermissionsToExistingUser(users.userProperties.userId, userPermissions);
              });
            },
          );
        });

        after('Delete user, data', () => {
          cy.resetTenant();
          cy.getAdminToken();
          if (createdAuthorityId) MarcAuthority.deleteViaAPI(createdAuthorityId, true);
          Users.deleteViaApi(users.userProperties.userId);
        });

        it(
          'C446169 Header of shared MARC authority edit page contains word "shared" (consortia) (spitfire)',
          { tags: ['criticalPathECS', 'spitfire', 'C446169'] },
          () => {
            // Log in as user in Member tenant
            cy.resetTenant();
            cy.waitForAuthRefresh(() => {
              cy.login(users.userProperties.username, users.userProperties.password, {
                path: TopMenu.marcAuthorities,
                waiter: MarcAuthorities.waitLoading,
              });
              cy.reload();
            }, 20_000);
            MarcAuthorities.waitLoading();
            ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
            MarcAuthorities.waitLoading();

            // Search for shared MARC authority record
            MarcAuthorities.searchBy(keywordOption, marcAuthorityHeading);
            MarcAuthorities.selectFirstRecord();
            MarcAuthority.waitLoading();

            // Click Actions > Edit
            MarcAuthority.edit();
            QuickMarcEditor.checkPaneheaderContains(
              `${sharedEditHeader} - ${marcAuthorityHeading}`,
            );
          },
        );
      });
    });
  });
});
