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
        const randomDigits = `405543${randomNDigitNumber(6)}`;

        const testData = {
          authorityHeading: `AT_C405543_MarcAuthority_${randomPostfix}`,
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
        let authorityId;

        before('Create test data', () => {
          cy.resetTenant();
          cy.getAdminToken();

          // Create local authority on Member 1 (College) tenant
          cy.setTenant(Affiliations.College);
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C405543_');
          MarcAuthorities.createMarcAuthorityViaAPI(testData.naturalId, '', marcAuthFields).then(
            (id) => {
              authorityId = id;
            },
          );

          // User created in College (Member 1) so primary affiliation = College (no affiliation switch needed on login)
          // Member 1: view + delete; Member 2: view only; no Central permissions
          cy.createTempUser([
            Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
            Permissions.uiMarcAuthoritiesAuthorityRecordDelete.gui,
          ]).then((userProperties) => {
            user = userProperties;

            cy.resetTenant();
            cy.assignAffiliationToUser(Affiliations.University, user.userId);

            cy.setTenant(Affiliations.University);
            cy.assignPermissionsToExistingUser(user.userId, [
              Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
            ]);
          });
        });

        after('Delete test data', () => {
          cy.resetTenant();
          cy.getAdminToken();
          cy.setTenant(Affiliations.College);
          MarcAuthority.deleteViaAPI(authorityId, true);
          Users.deleteViaApi(user.userId);
        });

        it(
          'C405543 Delete Local "MARC authority" record on Member 1 tenant (consortia) (spitfire)',
          { tags: ['extendedPathECS', 'spitfire', 'C405543'] },
          () => {
            // Login directly into Member 1 (College) - primary affiliation
            cy.setTenant(Affiliations.College);
            cy.login(user.username, user.password, {
              path: TopMenu.marcAuthorities,
              waiter: MarcAuthorities.waitLoading,
            });
            ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);

            // Steps 1-2: Search for the local record, verify it exists
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

            // Steps 6-9: Switch to Member 2 (University), search → deleted record not found
            ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.university);
            MarcAuthorities.waitLoading();
            MarcAuthorities.searchBeats(testData.authorityHeading);
            MarcAuthoritiesDelete.checkEmptySearchResults(testData.authorityHeading);
          },
        );
      });
    });
  });
});
