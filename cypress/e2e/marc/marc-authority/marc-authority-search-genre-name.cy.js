import { DEFAULT_JOB_PROFILE_NAMES } from '../../../support/constants';
import Permissions from '../../../support/dictionary/permissions';
import DataImport from '../../../support/fragments/data_import/dataImport';
import MarcAuthorities from '../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthoritiesSearch from '../../../support/fragments/marcAuthority/marcAuthoritiesSearch';
import MarcAuthority from '../../../support/fragments/marcAuthority/marcAuthority';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

const marcFile = {
  marc: 'marcAuthFileC409454.mrc',
  fileName: `testMarcFileC434151.${getRandomPostfix()}.mrc`,
  jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
  propertyName: 'authority',
};
const testData = {};

const searchOption = 'Genre';
const searchCases = [
  // Step 3: All headings
  {
    query: 'AT_C409454',
    expected: [
      {
        authRef: 'Authorized',
        heading: 'AT_C409454 Genre 155 Peplum films--subv--subx--suby--subz',
        type: 'Genre',
      },
      {
        authRef: 'Reference',
        heading: 'AT_C409454 Genre 455 Gladiator films subi sub4 sub5--subv--subx--suby--subz',
        type: 'Genre',
      },
      {
        authRef: 'Auth/Ref',
        heading: 'AT_C409454 Genre 555 Motion pictures subi sub4 sub5--subv--subx--suby--subz',
        type: 'Genre',
      },
    ],
  },
  // Step 4: Only Authorized Genre
  {
    query: 'AT_C409454 Genre 155 Peplum films--subv--subx--suby--subz',
    expected: [
      {
        authRef: 'Authorized',
        heading: 'AT_C409454 Genre 155 Peplum films--subv--subx--suby--subz',
        type: 'Genre',
      },
    ],
  },
  // Step 5: Only Reference Genre
  {
    query: 'AT_C409454 Genre 455 Gladiator films subi sub4 sub5--subv--subx--suby--subz',
    expected: [
      {
        authRef: 'Reference',
        heading: 'AT_C409454 Genre 455 Gladiator films subi sub4 sub5--subv--subx--suby--subz',
        type: 'Genre',
      },
    ],
  },
  // Step 6: Only Auth/Ref Genre
  {
    query: 'AT_C409454 Genre 555 Motion pictures subi sub4 sub5--subv--subx--suby--subz',
    expected: [
      {
        authRef: 'Auth/Ref',
        heading: 'AT_C409454 Genre 555 Motion pictures subi sub4 sub5--subv--subx--suby--subz',
        type: 'Genre',
      },
    ],
  },
  // Step 7-9: Negative cases (no records)
  {
    query: 'AT_C409454 Genre 155 Peplum films sub1--subv--subx--suby--subz',
    expected: [],
  },
  {
    query: 'AT_C409454 Genre 455 Gladiator films subi sub4 sub5 sub1--subv--subx--suby--subz',
    expected: [],
  },
  {
    query: 'g AT_C409454 Genre 555 Motion pictures subi sub4 sub5--subv--subx--suby--subz',
    expected: [],
  },
];

describe('MARC', () => {
  describe('MARC Authority', () => {
    const createdAuthorityIds = [];

    before('Create test data', () => {
      cy.createTempUser([Permissions.uiMarcAuthoritiesAuthorityRecordView.gui]).then(
        (createdUserProperties) => {
          testData.userProperties = createdUserProperties;

          cy.getAdminToken();
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C409454*');
          DataImport.uploadFileViaApi(
            marcFile.marc,
            marcFile.fileName,
            marcFile.jobProfileToRun,
          ).then((response) => {
            response.forEach((record) => {
              createdAuthorityIds.push(record[marcFile.propertyName].id);
            });
          });

          cy.waitForAuthRefresh(() => {
            cy.login(testData.userProperties.username, testData.userProperties.password, {
              path: TopMenu.marcAuthorities,
              waiter: MarcAuthorities.waitLoading,
            });
            MarcAuthorities.waitLoading();
          }, 20_000);
        },
      );
    });

    after('Delete data, user', () => {
      cy.getAdminToken();
      createdAuthorityIds.forEach((createdAuthorityId) => {
        MarcAuthority.deleteViaAPI(createdAuthorityId, true);
      });

      Users.deleteViaApi(testData.userProperties.userId);
    });

    it(
      'C409454 Search for "MARC authority" records using "Genre" search option (spitfire)',
      { tags: ['extendedPath', 'C409454', 'spitfire'] },
      () => {
        MarcAuthorities.selectSearchOptionInDropdown(searchOption);
        MarcAuthoritiesSearch.verifySelectedSearchOption(searchOption);
        cy.wait(2000);

        searchCases.forEach(({ query, expected }) => {
          MarcAuthorities.searchBeats(query);
          if (expected.length === 0) {
            MarcAuthorities.verifyEmptySearchResults(query);
          } else {
            expected.forEach(({ authRef, heading, type }) => {
              MarcAuthorities.verifyResultsRowContent(heading, type, authRef);
            });
            MarcAuthorities.checkRowsCount(expected.length);
          }
        });
      },
    );
  });
});
