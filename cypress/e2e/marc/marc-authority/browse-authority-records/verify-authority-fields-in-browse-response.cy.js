import { MARC_AUTHORITY_BROWSE_OPTIONS } from '../../../../support/constants';
import Permissions from '../../../../support/dictionary/permissions';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthoritiesSearch from '../../../../support/fragments/marcAuthority/marcAuthoritiesSearch';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix, { randomNDigitNumber } from '../../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Browse - Authority records', () => {
      const randomPostfix = getRandomPostfix();
      const titlePrefix = 'AT_C360535_MarcAuthority_';
      const heading = `${titlePrefix}${randomPostfix}`;
      // "n" is the LC Name Authority file's predefined identifying prefix - placed in "001" this
      // satisfies the precondition's "identifying prefix (alphabetical code) in 001 or 010 $a"
      const naturalIdPrefix = 'n';
      const naturalIdDigits = `360535${randomNDigitNumber(15)}`;
      const browseOption = MARC_AUTHORITY_BROWSE_OPTIONS.PERSONAL_NAME;
      const expectedAuthorityFields = [
        'authRefType',
        'headingRef',
        'headingType',
        'id',
        'naturalId',
        'sourceFileId',
      ];

      const permissions = [Permissions.uiMarcAuthoritiesAuthorityRecordView.gui];

      let user;
      let createdAuthorityId;

      before('Create user and test data', () => {
        cy.getAdminToken();
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI(titlePrefix);

        MarcAuthorities.createMarcAuthorityViaAPI(naturalIdPrefix, naturalIdDigits, [
          { tag: '100', content: `$a ${heading}`, indicators: ['1', '\\'] },
        ]).then((id) => {
          createdAuthorityId = id;
        });

        cy.createTempUser(permissions).then((userProperties) => {
          user = userProperties;

          cy.login(user.username, user.password, {
            path: TopMenu.marcAuthorities,
            waiter: MarcAuthorities.waitLoading,
          });
          MarcAuthorities.switchToBrowse();
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken(false);
        if (createdAuthorityId) MarcAuthority.deleteViaAPI(createdAuthorityId, true);
        Users.deleteViaApi(user.userId);
      });

      it(
        'C360535 Verify that "sourceFileId" and "naturalId" fields exist in response to browse "MARC Authority" records (promin)',
        { tags: ['extendedPath', 'promin', 'C360535'] },
        () => {
          // Step 1: Fill in the browse query with a value that returns only our created record
          MarcAuthoritiesSearch.fillSearchInput(heading);

          // Step 2: Select a browse option matching the record's heading field ("100")
          MarcAuthorities.selectSearchOptionInDropdown(browseOption);
          MarcAuthorities.checkSelectOptionFieldContent(browseOption);

          // Step 3: Intercepting the "/browse/authorities" call is the automated equivalent of
          // opening DevTools' "Network" tab before triggering the request
          cy.intercept('GET', 'browse/authorities*').as('getBrowseAuthorities');

          // Step 4: Run the browse search - request is sent, results are displayed
          MarcAuthoritiesSearch.clickSearchButton();
          MarcAuthorities.verifySearchResultTabletIsAbsent(false);

          // A UI quirk fires "/browse/authorities" twice per search - only the last call's
          // response reflects what's actually displayed, so wait for both to settle first
          cy.wait(3000);

          // Steps 5-6: Inspect the intercepted response body in place of DevTools' "Preview" tab -
          // every returned row's "authority" object must expose all 6 expected fields
          cy.get('@getBrowseAuthorities.all').then((interceptions) => {
            const { response } = interceptions[interceptions.length - 1];
            expect(response.statusCode).to.eq(200);

            const matchingItems = response.body.items.filter((item) => item.authority);
            expect(matchingItems.length).to.be.greaterThan(0);

            matchingItems.forEach((item) => {
              expect(item.authority).to.include.all.keys(...expectedAuthorityFields);
            });

            const ourRecord = matchingItems.find((item) => item.authority.headingRef === heading);

            expect(ourRecord, 'created record is present in the browse response').to.not.equal(
              undefined,
            );
            expect(ourRecord.authority.naturalId).to.not.be.oneOf([null, undefined]);
            expect(ourRecord.authority.sourceFileId).to.not.be.oneOf([null, undefined]);
          });
        },
      );
    });
  });
});
