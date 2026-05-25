import { MARC_AUTHORITY_SEARCH_OPTIONS, AUTHORITY_TYPES } from '../../../support/constants';
import Permissions from '../../../support/dictionary/permissions';
import MarcAuthorities from '../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../support/fragments/marcAuthority/marcAuthority';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix, { randomNDigitNumber } from '../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC authority', () => {
    describe('Result list / sorting', () => {
      const randomPostfix = getRandomPostfix();
      const randomDigits = randomNDigitNumber(15);
      const testData = {
        tag130: '130',
        tag410: '410',
        tag430: '430',
        authorizedHeading: `AT_C350731_MarcAuthority_${randomPostfix}`,
        searchQuery: `AT_C350731_Reference_${randomPostfix}`,
        subfield_w: 'C350731Subw',
        subfield_0: 'C350731Sub0',
        subfield_1: 'C350731Sub1',
        subfield_a430: 'C350731Suba430',
        naturalId: `350731${randomDigits}`,
      };

      const referenceHeadings = [
        testData.searchQuery,
        `${testData.subfield_a430} ${testData.searchQuery}`,
      ];

      let createdAuthorityId;

      before('Create user, data', () => {
        cy.getAdminToken();
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C350731_');

        cy.createTempUser([Permissions.uiMarcAuthoritiesAuthorityRecordView.gui]).then(
          (userProperties) => {
            testData.userProperties = userProperties;

            MarcAuthorities.createMarcAuthorityViaAPI('', testData.naturalId, [
              {
                tag: testData.tag130,
                content: `$a ${testData.authorizedHeading}`,
                indicators: ['\\', '0'],
              },
              {
                tag: testData.tag410,
                content: `$w ${testData.subfield_w} $a ${testData.searchQuery}  $0 ${testData.subfield_0}`,
                indicators: ['\\', '0'],
              },
              {
                tag: testData.tag430,
                content: `$w ${testData.subfield_w} $a ${testData.subfield_a430}  $t ${testData.searchQuery}  $1 ${testData.subfield_1}`,
                indicators: ['\\', '0'],
              },
            ]).then((createdRecordId) => {
              createdAuthorityId = createdRecordId;

              cy.login(testData.userProperties.username, testData.userProperties.password, {
                path: TopMenu.marcAuthorities,
                waiter: MarcAuthorities.waitLoading,
              });
            });
          },
        );
      });

      after('Delete user, data', () => {
        cy.wait(1000); // Wait for any pending operations to complete before deletion
        cy.getAdminToken();
        Users.deleteViaApi(testData.userProperties.userId);
        MarcAuthorities.deleteViaAPI(createdAuthorityId, true);
      });

      it(
        "C350731 Values from $w, $0, $1 subfields of 4XX don't display in the search result pane (spitfire)",
        { tags: ['extendedPath', 'spitfire', 'C350731'] },
        () => {
          // Steps 1-2: Search by the 4XX $a reference value → "Reference" records returned
          MarcAuthorities.searchBy(MARC_AUTHORITY_SEARCH_OPTIONS.KEYWORD, testData.searchQuery);
          MarcAuthorities.verifyResultsRowContent(referenceHeadings[0], AUTHORITY_TYPES.REFERENCE);
          MarcAuthorities.verifyResultsRowContent(referenceHeadings[1], AUTHORITY_TYPES.REFERENCE);

          // Step 3 expected (second pane): $w, $0, $1 values are NOT shown in the result list
          MarcAuthorities.checkRowAbsentByContent(testData.subfield_w);
          MarcAuthorities.checkRowAbsentByContent(testData.subfield_0);
          MarcAuthorities.checkRowAbsentByContent(testData.subfield_1);

          // Step 3: Click the reference heading → detail view opens in third pane, row highlighted
          MarcAuthorities.selectTitle(referenceHeadings[1]);
          MarcAuthority.waitLoading();
          MarcAuthority.contains(testData.authorizedHeading);
          MarcAuthorities.checkRowUpdatedAndHighlighted(referenceHeadings[1]);
        },
      );
    });
  });
});
