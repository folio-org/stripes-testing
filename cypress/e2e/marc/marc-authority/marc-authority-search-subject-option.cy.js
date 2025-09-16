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
  marc: 'marcAuthFileC409453.mrc',
  fileName: `testMarcFileC409453.${getRandomPostfix()}.mrc`,
  jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
  propertyName: 'authority',
};
const testData = {};

const searchOption = 'Subject';
const searchCases = [
  // Step 3: All Subject headings
  {
    query: 'AT_C409453',
    expected: [
      { authRef: 'Authorized', heading: 'AT_C409453 Named Event 147', type: 'Named Event' },
      { authRef: 'Reference', heading: 'AT_C409453 Named Event 447', type: 'Named Event' },
      { authRef: 'Auth/Ref', heading: 'AT_C409453 Named Event 547', type: 'Named Event' },
      {
        authRef: 'Authorized',
        heading: 'AT_C409453 Chronological Term 148',
        type: 'Chronological Term',
      },
      {
        authRef: 'Reference',
        heading: 'AT_C409453 Chronological Term 448',
        type: 'Chronological Term',
      },
      {
        authRef: 'Auth/Ref',
        heading: 'AT_C409453 Chronological Term 548',
        type: 'Chronological Term',
      },
      { authRef: 'Authorized', heading: 'AT_C409453 Subject 150', type: 'Topical' },
      { authRef: 'Reference', heading: 'AT_C409453 Subject 450', type: 'Topical' },
      { authRef: 'Auth/Ref', heading: 'AT_C409453 Subject 550', type: 'Topical' },
      {
        authRef: 'Authorized',
        heading: 'AT_C409453 Medium of Performance Term 162',
        type: 'Medium of Performance Term',
      },
      {
        authRef: 'Reference',
        heading: 'AT_C409453 Medium of Performance Term 462',
        type: 'Medium of Performance Term',
      },
      {
        authRef: 'Auth/Ref',
        heading: 'AT_C409453 Medium of Performance Term 562',
        type: 'Medium of Performance Term',
      },
      {
        authRef: 'Authorized',
        heading: 'AT_C409453 General Subdivision 180',
        type: 'General Subdivision',
      },
      {
        authRef: 'Reference',
        heading: 'AT_C409453 General Subdivision 480',
        type: 'General Subdivision',
      },
      {
        authRef: 'Auth/Ref',
        heading: 'AT_C409453 General Subdivision 580',
        type: 'General Subdivision',
      },
      {
        authRef: 'Authorized',
        heading: 'AT_C409453 Geographic Subdivision 181',
        type: 'Geographic Subdivision',
      },
      {
        authRef: 'Reference',
        heading: 'AT_C409453 Geographic Subdivision 481',
        type: 'Geographic Subdivision',
      },
      {
        authRef: 'Auth/Ref',
        heading: 'AT_C409453 Geographic Subdivision 581',
        type: 'Geographic Subdivision',
      },
      {
        authRef: 'Authorized',
        heading: 'AT_C409453 Chronological Subdivision 182',
        type: 'Chronological Subdivision',
      },
      {
        authRef: 'Reference',
        heading: 'AT_C409453 Chronological Subdivision 482',
        type: 'Chronological Subdivision',
      },
      {
        authRef: 'Auth/Ref',
        heading: 'AT_C409453 Chronological Subdivision 582',
        type: 'Chronological Subdivision',
      },
      {
        authRef: 'Authorized',
        heading: 'AT_C409453 Form Subdivision 185',
        type: 'Form Subdivision',
      },
      {
        authRef: 'Reference',
        heading: 'AT_C409453 Form Subdivision 485',
        type: 'Form Subdivision',
      },
      { authRef: 'Auth/Ref', heading: 'AT_C409453 Form Subdivision 585', type: 'Form Subdivision' },
    ],
  },
  // Step 4: Only Authorized Subject
  {
    query: 'AT_C409453 Subject 150 Lampetra subb--subv--subx--suby--subz',
    expected: [
      {
        authRef: 'Authorized',
        heading: 'AT_C409453 Subject 150 Lampetra subb--subv--subx--suby--subz',
        type: 'Topical',
      },
    ],
  },
  // Step 5: Only Reference Subject
  {
    query: 'AT_C409453 Subject 450 Eudontomyzon subb subg subi sub4 sub5--subv--subx--suby--subz',
    expected: [
      {
        authRef: 'Reference',
        heading:
          'AT_C409453 Subject 450 Eudontomyzon subb subg subi sub4 sub5--subv--subx--suby--subz',
        type: 'Topical',
      },
    ],
  },
  // Step 6: Only Auth/Ref Subject
  {
    query:
      'AT_C409453 Subject 550 Petromyzontidae subb subg subi sub4 sub5--subv--subx--suby--subz',
    expected: [
      {
        authRef: 'Auth/Ref',
        heading:
          'AT_C409453 Subject 550 Petromyzontidae subb subg subi sub4 sub5--subv--subx--suby--subz',
        type: 'Topical',
      },
    ],
  },
  // Step 7-9: Negative cases (no records) - using invalid subfields
  {
    query: 'AT_C409453 Subject 150 Lampetra subb sub1--subv--subx--suby--subz',
    expected: [],
  },
  {
    query:
      'AT_C409453 Subject 450 Eudontomyzon subb subg subi sub4 sub5 sub1--subv--subx--suby--subz',
    expected: [],
  },
  {
    query:
      'AT_C409453 Subject 550 Petromyzontidae subb subg subi sub4 sub5 sub1--subv--subx--suby--subz',
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
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C409453*');
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
      'C409453 Search for "MARC authority" records using "Subject" search option (spitfire)',
      { tags: ['extendedPath', 'C409453', 'spitfire'] },
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
