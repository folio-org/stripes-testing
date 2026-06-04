import Affiliations, { tenantNames } from '../../../../../support/dictionary/affiliations';
import Permissions from '../../../../../support/dictionary/permissions';
import ConsortiumManager from '../../../../../support/fragments/settings/consortium-manager/consortium-manager';
import MarcAuthorities from '../../../../../support/fragments/marcAuthority/marcAuthorities';
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
        const randomDigits = `405541${randomNDigitNumber(6)}`;

        const testData = {
          authorityHeading: `AT_C405541_MarcAuthority_${randomPostfix}`,
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
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C405541_');

          MarcAuthorities.createMarcAuthorityViaAPI(testData.naturalId, '', marcAuthFields).then(
            (id) => {
              authorityId = id;
            },
          );

          // User created in College (Member) so primary affiliation = College (no affiliation switch needed on login)
          // Central: view only (no delete); Member: view + delete
          cy.setTenant(Affiliations.College);
          cy.createTempUser([
            Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
            Permissions.uiMarcAuthoritiesAuthorityRecordDelete.gui,
          ]).then((userProperties) => {
            user = userProperties;

            cy.resetTenant();
            cy.assignPermissionsToExistingUser(user.userId, [
              Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
            ]);
          });
        });

        after('Delete test data', () => {
          cy.resetTenant();
          cy.getAdminToken();
          MarcAuthority.deleteViaAPI(authorityId, true);
          cy.setTenant(Affiliations.College);
          Users.deleteViaApi(user.userId);
        });

        it(
          'C405541 User cannot delete Shared "MARC authority" record in Member tenant without permission in Central tenant (consortia) (spitfire)',
          { tags: ['extendedPathECS', 'spitfire', 'C405541'] },
          () => {
            // Login directly into Member (College) - primary affiliation
            cy.setTenant(Affiliations.College);
            cy.login(user.username, user.password, {
              path: TopMenu.marcAuthorities,
              waiter: MarcAuthorities.waitLoading,
              authRefresh: true,
            });
            ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);

            // Steps 1-2: Search for the record, verify it exists
            MarcAuthorities.searchBeats(testData.authorityHeading);
            MarcAuthorities.verifyResultsRowContent(testData.authorityHeading);

            // Step 3: Open the detail view
            MarcAuthorities.selectIncludingTitle(testData.authorityHeading);
            MarcAuthority.waitLoading();
            MarcAuthority.contains(testData.authorityHeading);

            // Step 4: Click Actions → verify only Print is shown, Delete is absent
            MarcAuthority.checkActionDropdownContent(['Print']);
          },
        );
      });
    });
  });
});
