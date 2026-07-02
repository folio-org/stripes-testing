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
import { AUTHORITY_TYPES } from '../../../../../support/constants';

describe('MARC', () => {
  describe('MARC authority', () => {
    describe('Delete Authority', () => {
      describe('Consortium', () => {
        const randomPostfix = getRandomPostfix();
        const randomLetters = getRandomLetters(13);
        const randomDigits = `405143${randomNDigitNumber(6)}`;

        const testData = {
          authorityHeading: `AT_C405143_MarcAuthority_${randomPostfix}`,
          naturalId: `${randomLetters}${randomDigits}`,
        };

        const marcAuthFields = [
          {
            tag: '110',
            content: `$a ${testData.authorityHeading}`,
            indicators: ['2', '\\'],
          },
        ];

        let userA;
        let userB;
        let authorityId;

        before('Create test data', () => {
          cy.resetTenant();
          cy.getAdminToken();
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C405143_');

          MarcAuthorities.createMarcAuthorityViaAPI(testData.naturalId, '', marcAuthFields).then(
            (id) => {
              authorityId = id;
            },
          );

          // User A: Central tenant with view + delete MARC authority permissions
          cy.createTempUser([
            Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
            Permissions.uiMarcAuthoritiesAuthorityRecordDelete.gui,
          ]).then((userProperties) => {
            userA = userProperties;
          });

          // User B: College (Member) tenant with view MARC authority permission only
          cy.setTenant(Affiliations.College);
          cy.createTempUser([Permissions.uiMarcAuthoritiesAuthorityRecordView.gui]).then(
            (userProperties) => {
              userB = userProperties;
            },
          );
        });

        after('Delete test data', () => {
          cy.resetTenant();
          cy.getAdminToken();
          MarcAuthority.deleteViaAPI(authorityId, true);
          Users.deleteViaApi(userA.userId);
          cy.setTenant(Affiliations.College);
          Users.deleteViaApi(userB.userId);
        });

        it(
          'C405143 "MARC authority" record deleted on Central tenant is deleted in Member tenant (consortia) (spitfire)',
          { tags: ['extendedPathECS', 'spitfire', 'C405143'] },
          () => {
            // Steps 1-3: User B (Member tenant) searches for the record, verifies it exists, resets
            cy.setTenant(Affiliations.College);
            cy.login(userB.username, userB.password, {
              path: TopMenu.marcAuthorities,
              waiter: MarcAuthorities.waitLoading,
            });
            ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
            MarcAuthorities.searchBeats(testData.authorityHeading);
            MarcAuthorities.verifyResultsRowContent(testData.authorityHeading);
            MarcAuthorities.clickResetAndCheck();

            // Steps 4-8: User A (via API, Central tenant) deletes the MARC authority record
            cy.then(() => {
              cy.resetTenant();
              cy.getToken(userA.username, userA.password);
              MarcAuthority.deleteViaAPI(authorityId);
              cy.getAdminToken();
              cy.recurse(
                () => MarcAuthorities.getMarcAuthoritiesViaApi({
                  query: `keyword="${testData.authorityHeading}" and authRefType=="${AUTHORITY_TYPES.AUTHORIZED}"`,
                }),
                (foundAuthorities) => foundAuthorities.length === 0,
                { limit: 10, timeout: 12000, delay: 1000 },
              );
              cy.setTenant(Affiliations.College);
              cy.getToken(userB.username, userB.password);
              cy.wait(2000);
            }).then(() => {
              // Steps 9-10: User B searches again → deleted record cannot be found in Member tenant
              MarcAuthorities.searchBeats(testData.authorityHeading);
              MarcAuthoritiesDelete.checkEmptySearchResults(testData.authorityHeading);
            });
          },
        );
      });
    });
  });
});
