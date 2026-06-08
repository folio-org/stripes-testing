import Affiliations, { tenantNames } from '../../../../../support/dictionary/affiliations';
import Permissions from '../../../../../support/dictionary/permissions';
import ConsortiumManager from '../../../../../support/fragments/settings/consortium-manager/consortium-manager';
import MarcAuthorities from '../../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthoritiesDelete from '../../../../../support/fragments/marcAuthority/marcAuthoritiesDelete';
import MarcAuthority from '../../../../../support/fragments/marcAuthority/marcAuthority';
import TopMenu from '../../../../../support/fragments/topMenu';
import Users from '../../../../../support/fragments/users/users';
import getRandomPostfix, {
  getRandomLetters,
  randomNDigitNumber,
} from '../../../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC authority', () => {
    describe('Delete Authority', () => {
      describe('Consortium', () => {
        const randomPostfix = getRandomPostfix();
        const randomLetters = getRandomLetters(13);
        const randomDigits = `405539${randomNDigitNumber(6)}`;

        const testData = {
          authorityHeading: `AT_C405539_MarcAuthority_${randomPostfix}`,
          naturalId: `${randomLetters}${randomDigits}`,
        };

        const marcAuthFields = [
          {
            tag: '110',
            content: `$a ${testData.authorityHeading}`,
            indicators: ['2', '\\'],
          },
        ];

        let user;

        before('Create test data', () => {
          cy.resetTenant();
          cy.getAdminToken();
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C405539_');

          MarcAuthorities.createMarcAuthorityViaAPI(testData.naturalId, '', marcAuthFields);

          // User created in College (Member 1) so primary affiliation = College (no affiliation switch needed on login)
          cy.setTenant(Affiliations.College);
          cy.createTempUser([
            Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
            Permissions.uiMarcAuthoritiesAuthorityRecordDelete.gui,
          ]).then((userProperties) => {
            user = userProperties;

            cy.resetTenant();
            cy.assignAffiliationToUser(Affiliations.University, user.userId);

            cy.assignPermissionsToExistingUser(user.userId, [
              Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
              Permissions.uiMarcAuthoritiesAuthorityRecordDelete.gui,
            ]);

            cy.setTenant(Affiliations.University);
            cy.assignPermissionsToExistingUser(user.userId, [
              Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
            ]);

            cy.resetTenant();
          });
        });

        after('Delete test data', () => {
          cy.resetTenant();
          cy.getAdminToken();
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C405539_');
          cy.setTenant(Affiliations.College);
          Users.deleteViaApi(user.userId);
        });

        it(
          'C405539 "MARC authority" record deleted on Member 1 tenant is deleted in Central and Member 2 tenant (consortia) (spitfire)',
          { tags: ['extendedPathECS', 'spitfire', 'C405539'] },
          () => {
            // Login directly into Member 1 (College) - primary affiliation
            cy.setTenant(Affiliations.College);
            cy.login(user.username, user.password, {
              path: TopMenu.marcAuthorities,
              waiter: MarcAuthorities.waitLoading,
            });
            ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);

            // Steps 1-2: Search for the record in Member 1, verify it exists
            MarcAuthorities.searchBeats(testData.authorityHeading);
            MarcAuthorities.verifyResultsRowContent(testData.authorityHeading);

            // Steps 3-5: Open the record and delete it via UI in Member 1
            MarcAuthorities.selectIncludingTitle(testData.authorityHeading);
            MarcAuthority.waitLoading();
            MarcAuthority.contains(testData.authorityHeading);
            MarcAuthoritiesDelete.clickDeleteButton();
            MarcAuthoritiesDelete.checkDeleteModal();
            MarcAuthoritiesDelete.confirmDelete();
            MarcAuthoritiesDelete.verifyDeleteComplete(testData.authorityHeading);

            // Steps 6-9: Switch to Central, search → record not found
            ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.central);
            MarcAuthorities.waitLoading();
            MarcAuthorities.searchBeats(testData.authorityHeading);
            MarcAuthoritiesDelete.checkEmptySearchResults(testData.authorityHeading);

            // Steps 10-13: Switch to Member 2 (University), search → record not found
            ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.university);
            MarcAuthorities.waitLoading();
            MarcAuthorities.searchBeats(testData.authorityHeading);
            MarcAuthoritiesDelete.checkEmptySearchResults(testData.authorityHeading);
          },
        );
      });
    });
  });
});
