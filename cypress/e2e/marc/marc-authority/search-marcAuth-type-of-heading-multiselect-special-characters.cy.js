import Permissions from '../../../support/dictionary/permissions';
import MarcAuthorities from '../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../support/fragments/marcAuthority/marcAuthority';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix, { getRandomLetters } from '../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Search', () => {
      describe('Filters', () => {
        const testData = {
          searchQuery: '*',
          authorityHeading: `AT_C356838_MarcAuthority_${getRandomPostfix()}`,
          specialCharacters: [
            '?question',
            '\\blank',
            '*all',
            '[bracket',
            '+plus',
            ')bracket',
            '(bracket',
          ],
          naturalId: `${getRandomLetters(15)}356838`,
        };

        let createdAuthorityId;

        before('Create user, data', () => {
          cy.getAdminToken();

          cy.createTempUser([Permissions.uiMarcAuthoritiesAuthorityRecordView.gui])
            .then((createdUserProperties) => {
              testData.userProperties = createdUserProperties;

              MarcAuthorities.createMarcAuthorityViaAPI(testData.naturalId, '', [
                {
                  tag: '100',
                  content: `$a ${testData.authorityHeading}`,
                  indicators: ['1', '\\'],
                },
              ]).then((createdId) => {
                createdAuthorityId = createdId;
              });
            })
            .then(() => {
              cy.login(testData.userProperties.username, testData.userProperties.password, {
                path: TopMenu.marcAuthorities,
                waiter: MarcAuthorities.waitLoading,
              });
            });
        });

        after('Delete user, data', () => {
          cy.getAdminToken();
          Users.deleteViaApi(testData.userProperties.userId);
          MarcAuthority.deleteViaAPI(createdAuthorityId);
        });

        it(
          'C356838 Verify that entered special characters in "MultiSelection component" ("Type of heading" filter) doesn\'t crash the app (spitfire)',
          { tags: ['extendedPath', 'spitfire', 'C356838'] },
          () => {
            // Steps 1-2: Search for all records
            MarcAuthorities.searchBeats(testData.searchQuery);
            MarcAuthorities.waitResultsLoading();

            // Step 3: Expand "Type of heading" accordion
            MarcAuthorities.verifyTypeOfHeadingAccordionAndClick();

            // Steps 4-17: For each special character, type it in the multiselect, verify
            // "No matching items found!" appears, then clear the input and verify it's cleared
            testData.specialCharacters.forEach((specialChar) => {
              MarcAuthorities.fillInTypeOfHeadingMultiSelectFilter(specialChar);
              MarcAuthorities.checkFilterNoMatchMessage();
              MarcAuthorities.fillInTypeOfHeadingMultiSelectFilter('');
              MarcAuthorities.checkFilterNoMatchMessage({ isPresent: false });
            });
          },
        );
      });
    });
  });
});
