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
  marc: 'marcAuthFileC409440.mrc',
  fileName: `testMarcFileC409440.${getRandomPostfix()}.mrc`,
  jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
  propertyName: 'authority',
};
const testData = {};

const searchCases = [
  // Step 1-2: Keyword search - all heading types
  {
    searchOption: 'Keyword',
    query: 'AT_C409440',
    expected: [
      { authRef: 'Authorized', heading: 'AT_C409440 Personal name 100', type: 'Personal Name' },
      { authRef: 'Reference', heading: 'AT_C409440 Personal name 400', type: 'Personal Name' },
      { authRef: 'Auth/Ref', heading: 'AT_C409440 Personal name 500', type: 'Personal Name' },
      { authRef: 'Authorized', heading: 'AT_C409440 Corporate name 110', type: 'Corporate Name' },
      { authRef: 'Reference', heading: 'AT_C409440 Corporate name 410', type: 'Corporate Name' },
      { authRef: 'Auth/Ref', heading: 'AT_C409440 Corporate name 510', type: 'Corporate Name' },
      { authRef: 'Authorized', heading: 'AT_C409440 Conference Name 111', type: 'Conference Name' },
      { authRef: 'Reference', heading: 'AT_C409440 Conference Name 411', type: 'Conference Name' },
      { authRef: 'Auth/Ref', heading: 'AT_C409440 Conference Name 511', type: 'Conference Name' },
      { authRef: 'Authorized', heading: 'AT_C409440 Uniform title 130', type: 'Uniform Title' },
      { authRef: 'Reference', heading: 'AT_C409440 Uniform title 430', type: 'Uniform Title' },
      { authRef: 'Auth/Ref', heading: 'AT_C409440 Uniform title 530', type: 'Uniform Title' },
      { authRef: 'Authorized', heading: 'AT_C409440 Named Event 147', type: 'Named Event' },
      { authRef: 'Reference', heading: 'AT_C409440 Named Event 447', type: 'Named Event' },
      { authRef: 'Auth/Ref', heading: 'AT_C409440 Named Event 547', type: 'Named Event' },
      {
        authRef: 'Authorized',
        heading: 'AT_C409440 Chronological Term 148',
        type: 'Chronological Term',
      },
      {
        authRef: 'Reference',
        heading: 'AT_C409440 Chronological Term 448',
        type: 'Chronological Term',
      },
      {
        authRef: 'Auth/Ref',
        heading: 'AT_C409440 Chronological Term 548',
        type: 'Chronological Term',
      },
      { authRef: 'Authorized', heading: 'AT_C409440 Subject 150', type: 'Topical' },
      { authRef: 'Reference', heading: 'AT_C409440 Subject 450', type: 'Topical' },
      { authRef: 'Auth/Ref', heading: 'AT_C409440 Subject 550', type: 'Topical' },
      { authRef: 'Authorized', heading: 'AT_C409440 Geographic name 151', type: 'Geographic Name' },
      { authRef: 'Reference', heading: 'AT_C409440 Geographic name 451', type: 'Geographic Name' },
      { authRef: 'Auth/Ref', heading: 'AT_C409440 Geographic name 551', type: 'Geographic Name' },
      { authRef: 'Authorized', heading: 'AT_C409440 Genre 155', type: 'Genre' },
      { authRef: 'Reference', heading: 'AT_C409440 Genre 455', type: 'Genre' },
      { authRef: 'Auth/Ref', heading: 'AT_C409440 Genre 555', type: 'Genre' },
    ],
  },
  // Step 3-4: Identifier (all) search - only Authorized records
  {
    searchOption: 'Identifier (all)',
    query: 'C409440',
    expected: [
      { authRef: 'Authorized', heading: 'AT_C409440 Personal name 100', type: 'Personal Name' },
      { authRef: 'Authorized', heading: 'AT_C409440 Corporate name 110', type: 'Corporate Name' },
      { authRef: 'Authorized', heading: 'AT_C409440 Conference Name 111', type: 'Conference Name' },
      { authRef: 'Authorized', heading: 'AT_C409440 Uniform title 130', type: 'Uniform Title' },
      { authRef: 'Authorized', heading: 'AT_C409440 Named Event 147', type: 'Named Event' },
      {
        authRef: 'Authorized',
        heading: 'AT_C409440 Chronological Term 148',
        type: 'Chronological Term',
      },
      { authRef: 'Authorized', heading: 'AT_C409440 Subject 150', type: 'Topical' },
      { authRef: 'Authorized', heading: 'AT_C409440 Geographic name 151', type: 'Geographic Name' },
      { authRef: 'Authorized', heading: 'AT_C409440 Genre 155', type: 'Genre' },
    ],
  },
  // Step 5-18: LCCN searches for specific heading types
  {
    searchOption: 'LCCN',
    query: 'fst01133536_409440',
    expected: [
      { authRef: 'Authorized', heading: 'AT_C409440 Named Event 147', type: 'Named Event' },
    ],
  },
  {
    searchOption: 'LCCN',
    query: 'D01355568_409440',
    expected: [
      {
        authRef: 'Authorized',
        heading: 'AT_C409440 Chronological Term 148',
        type: 'Chronological Term',
      },
    ],
  },
  {
    searchOption: 'LCCN',
    query: 'n  80126296_409440',
    expected: [
      { authRef: 'Authorized', heading: 'AT_C409440 Personal name 100', type: 'Personal Name' },
    ],
  },
  {
    searchOption: 'LCCN',
    query: 'nr 98013926_409440',
    expected: [
      { authRef: 'Authorized', heading: 'AT_C409440 Corporate name 110', type: 'Corporate Name' },
    ],
  },
  {
    searchOption: 'LCCN',
    query: 'ns2012061368_409440',
    expected: [
      { authRef: 'Authorized', heading: 'AT_C409440 Conference Name 111', type: 'Conference Name' },
    ],
  },
  {
    searchOption: 'LCCN',
    query: 'gf83700634_409440',
    expected: [
      { authRef: 'Authorized', heading: 'AT_C409440 Uniform title 130', type: 'Uniform Title' },
    ],
  },
  {
    searchOption: 'LCCN',
    query: 'sj 85074240_409440',
    expected: [{ authRef: 'Authorized', heading: 'AT_C409440 Subject 150', type: 'Topical' }],
  },
  {
    searchOption: 'LCCN',
    query: 'aat 85057894_409440',
    expected: [
      { authRef: 'Authorized', heading: 'AT_C409440 Geographic name 151', type: 'Geographic Name' },
    ],
  },
  {
    searchOption: 'LCCN',
    query: 'dg2011026439_409440',
    expected: [{ authRef: 'Authorized', heading: 'AT_C409440 Genre 155', type: 'Genre' }],
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
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C409440*');
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
      'C409440 Search for "MARC authority" records using "Keyword", "Identifier (all)", "LCCN" search options using identifiers (spitfire)',
      { tags: ['extendedPath', 'C409440', 'spitfire'] },
      () => {
        searchCases.forEach(({ searchOption, query, expected }) => {
          MarcAuthorities.selectSearchOptionInDropdown(searchOption);

          MarcAuthoritiesSearch.verifySelectedSearchOption(searchOption);
          MarcAuthorities.searchBeats(query);
          cy.wait(3000);

          // Verify results
          if (expected.length === 0) {
            MarcAuthorities.verifyEmptySearchResults(query);
          } else {
            expected.forEach(({ authRef, heading, type }) => {
              MarcAuthorities.verifyResultsRowContent(heading, type, authRef);
            });
          }
        });
      },
    );
  });
});
