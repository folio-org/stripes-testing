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
  marc: 'marcAuthFileC409450.mrc',
  fileName: `testMarcFileC409450.${getRandomPostfix()}.mrc`,
  jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
  propertyName: 'authority',
};
const testData = {};

const searchOption = 'Uniform title';
const searchCases = [
  // Step 3: All Uniform title headings
  {
    query: 'AT_C409450',
    expected: [
      { authRef: 'Authorized', heading: 'AT_C409450 Uniform title 130', type: 'Uniform Title' },
      { authRef: 'Reference', heading: 'AT_C409450 Uniform title 430', type: 'Uniform Title' },
      { authRef: 'Auth/Ref', heading: 'AT_C409450 Uniform title 530', type: 'Uniform Title' },
    ],
  },
  // Step 4: Only Authorized Uniform title
  {
    query:
      'AT_C409450 Uniform title 130 Cartoons & Comics subd subf subg subh subk subl subm subn subo subp subr subs subt--subv--subx--suby--subz',
    expected: [
      {
        authRef: 'Authorized',
        heading:
          'AT_C409450 Uniform title 130 Cartoons & Comics subd subf subg subh subk subl subm subn subo subp subr subs subt--subv--subx--suby--subz',
        type: 'Uniform Title',
      },
    ],
  },
  // Step 5: Only Reference Uniform title
  {
    query:
      'AT_C409450 Uniform title 430 Reihe "Cartoons & Comics" subd subf subg subh subk subl subm subn subo subp subr subs subt--subv--subx--suby--subz',
    expected: [
      {
        authRef: 'Reference',
        heading:
          'AT_C409450 Uniform title 430 Reihe "Cartoons & Comics" subd subf subg subh subk subl subm subn subo subp subr subs subt--subv--subx--suby--subz',
        type: 'Uniform Title',
      },
    ],
  },
  // Step 6: Only Auth/Ref Uniform title
  {
    query:
      'AT_C409450 Uniform title 530 Cartoons und Comics subd subf subg subh subi subk subl subm subn subo subp subr subs subt sub4--subv--subx--suby--subz',
    expected: [
      {
        authRef: 'Auth/Ref',
        heading:
          'AT_C409450 Uniform title 530 Cartoons und Comics subd subf subg subh subi subk subl subm subn subo subp subr subs subt sub4--subv--subx--suby--subz',
        type: 'Uniform Title',
      },
    ],
  },
  // Step 7-9: Negative cases (no records) - using invalid subfields
  {
    query:
      'AT_C409450 Uniform title 130 Cartoons & Comics subd subf subg subh subk subl subm subn subo subp subr subs subt--subv--subx--suby--subz subw',
    expected: [],
  },
  {
    query:
      'AT_C409450 Uniform title 430 Reihe "Cartoons & Comics" subd subf subg subh subk subl subm subn subo subp subr subs subt--subv--subx--suby--subz subw',
    expected: [],
  },
  {
    query:
      'AT_C409450 Uniform title 530 Cartoons und Comics subd subf subg subh subi subk subl subm subn subo subp subr subs subt sub4 sub5--subv--subx--suby--subz',
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
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C409450*');
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
            cy.reload();
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
      'C409450 Search for "MARC authority" records using "Uniform title" search option (spitfire)',
      { tags: ['extendedPath', 'C409450', 'spitfire'] },
      () => {
        MarcAuthorities.selectSearchOptionInDropdown(searchOption);
        MarcAuthoritiesSearch.verifySelectedSearchOption(searchOption);
        cy.wait(2000);

        searchCases.forEach(({ query, expected }) => {
          MarcAuthorities.searchBeats(query);
          cy.wait(3000);

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
