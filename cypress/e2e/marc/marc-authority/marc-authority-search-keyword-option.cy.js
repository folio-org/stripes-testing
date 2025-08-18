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
  marc: 'marcAuthFileC409439.mrc',
  fileName: `testMarcFileC409439.${getRandomPostfix()}.mrc`,
  jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
  propertyName: 'authority',
};
const testData = {};

const searchOption = 'Keyword';
const searchCase =
  // Step 1-2: Keyword search - all heading types
  {
    query: 'AT_C409439',
    expected: [
      { authRef: 'Authorized', heading: 'AT_C409439 Personal name 100', type: 'Personal Name' },
      { authRef: 'Reference', heading: 'AT_C409439 Personal name 400', type: 'Personal Name' },
      { authRef: 'Auth/Ref', heading: 'AT_C409439 Personal name 500', type: 'Personal Name' },
      {
        authRef: 'Authorized',
        heading: 'AT_C409439 Personal name-title 100',
        type: 'Personal Name',
      },
      {
        authRef: 'Reference',
        heading: 'AT_C409439 Personal name-title 400',
        type: 'Personal Name',
      },
      { authRef: 'Auth/Ref', heading: 'AT_C409439 Personal name-title 500', type: 'Personal Name' },
      { authRef: 'Authorized', heading: 'AT_C409439 Corporate name 110', type: 'Corporate Name' },
      { authRef: 'Reference', heading: 'AT_C409439 Corporate name 410', type: 'Corporate Name' },
      { authRef: 'Auth/Ref', heading: 'AT_C409439 Corporate name 510', type: 'Corporate Name' },
      {
        authRef: 'Authorized',
        heading: 'AT_C409439 Corporate name-title 110',
        type: 'Corporate Name',
      },
      {
        authRef: 'Reference',
        heading: 'AT_C409439 Corporate name-title 410',
        type: 'Corporate Name',
      },
      {
        authRef: 'Auth/Ref',
        heading: 'AT_C409439 Corporate name-title 510',
        type: 'Corporate Name',
      },
      { authRef: 'Authorized', heading: 'AT_C409439 Conference Name 111', type: 'Conference Name' },
      { authRef: 'Reference', heading: 'AT_C409439 Conference Name 411', type: 'Conference Name' },
      { authRef: 'Auth/Ref', heading: 'AT_C409439 Conference Name 511', type: 'Conference Name' },
      {
        authRef: 'Authorized',
        heading: 'AT_C409439 Conference Name-title 111',
        type: 'Conference Name',
      },
      {
        authRef: 'Reference',
        heading: 'AT_C409439 Conference Name-title 411',
        type: 'Conference Name',
      },
      {
        authRef: 'Auth/Ref',
        heading: 'AT_C409439 Conference Name-title 511',
        type: 'Conference Name',
      },
      { authRef: 'Authorized', heading: 'AT_C409439 Uniform title 130', type: 'Uniform Title' },
      { authRef: 'Reference', heading: 'AT_C409439 Uniform title 430', type: 'Uniform Title' },
      { authRef: 'Auth/Ref', heading: 'AT_C409439 Uniform title 530', type: 'Uniform Title' },
      { authRef: 'Authorized', heading: 'AT_C409439 Named Event 147', type: 'Named Event' },
      { authRef: 'Reference', heading: 'AT_C409439 Named Event 447', type: 'Named Event' },
      { authRef: 'Auth/Ref', heading: 'AT_C409439 Named Event 547', type: 'Named Event' },
      {
        authRef: 'Authorized',
        heading: 'AT_C409439 Chronological Term 148',
        type: 'Chronological Term',
      },
      {
        authRef: 'Reference',
        heading: 'AT_C409439 Chronological Term 448',
        type: 'Chronological Term',
      },
      {
        authRef: 'Auth/Ref',
        heading: 'AT_C409439 Chronological Term 548',
        type: 'Chronological Term',
      },
      { authRef: 'Authorized', heading: 'AT_C409439 Subject 150', type: 'Topical' },
      { authRef: 'Reference', heading: 'AT_C409439 Subject 450', type: 'Topical' },
      { authRef: 'Auth/Ref', heading: 'AT_C409439 Subject 550', type: 'Topical' },
      { authRef: 'Authorized', heading: 'AT_C409439 Geographic name 151', type: 'Geographic Name' },
      { authRef: 'Reference', heading: 'AT_C409439 Geographic name 451', type: 'Geographic Name' },
      { authRef: 'Auth/Ref', heading: 'AT_C409439 Geographic name 551', type: 'Geographic Name' },
      { authRef: 'Authorized', heading: 'AT_C409439 Genre 155', type: 'Genre' },
      { authRef: 'Reference', heading: 'AT_C409439 Genre 455', type: 'Genre' },
      { authRef: 'Auth/Ref', heading: 'AT_C409439 Genre 555', type: 'Genre' },
      {
        authRef: 'Authorized',
        heading: 'AT_C409439 Medium of Performance Term 162',
        type: 'Medium of Performance Term',
      },
      {
        authRef: 'Reference',
        heading: 'AT_C409439 Medium of Performance Term 462',
        type: 'Medium of Performance Term',
      },
      {
        authRef: 'Auth/Ref',
        heading: 'AT_C409439 Medium of Performance Term 562',
        type: 'Medium of Performance Term',
      },
      {
        authRef: 'Authorized',
        heading: 'AT_C409439 General Subdivision 180',
        type: 'General Subdivision',
      },
      {
        authRef: 'Reference',
        heading: 'AT_C409439 General Subdivision 480',
        type: 'General Subdivision',
      },
      {
        authRef: 'Auth/Ref',
        heading: 'AT_C409439 General Subdivision 580',
        type: 'General Subdivision',
      },
      {
        authRef: 'Authorized',
        heading: 'AT_C409439 Geographic Subdivision 181',
        type: 'Geographic Subdivision',
      },
      {
        authRef: 'Reference',
        heading: 'AT_C409439 Geographic Subdivision 481',
        type: 'Geographic Subdivision',
      },
      {
        authRef: 'Auth/Ref',
        heading: 'AT_C409439 Geographic Subdivision 581',
        type: 'Geographic Subdivision',
      },
      {
        authRef: 'Authorized',
        heading: 'AT_C409439 Chronological Subdivision 182',
        type: 'Chronological Subdivision',
      },
      {
        authRef: 'Reference',
        heading: 'AT_C409439 Chronological Subdivision 482',
        type: 'Chronological Subdivision',
      },
      {
        authRef: 'Auth/Ref',
        heading: 'AT_C409439 Chronological Subdivision 582',
        type: 'Chronological Subdivision',
      },
      {
        authRef: 'Authorized',
        heading: 'AT_C409439 Form Subdivision 185',
        type: 'Form Subdivision',
      },
      {
        authRef: 'Reference',
        heading: 'AT_C409439 Form Subdivision 485',
        type: 'Form Subdivision',
      },
      { authRef: 'Auth/Ref', heading: 'AT_C409439 Form Subdivision 585', type: 'Form Subdivision' },
    ],
  };

describe('MARC', () => {
  describe('MARC Authority', () => {
    const createdAuthorityIds = [];

    before('Create test data', () => {
      cy.createTempUser([Permissions.uiMarcAuthoritiesAuthorityRecordView.gui]).then(
        (createdUserProperties) => {
          testData.userProperties = createdUserProperties;

          cy.getAdminToken();
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C409439*');
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
      'C409439 Search for "MARC authority" records using "Keyword" search option (spitfire)',
      { tags: ['criticalPath', 'C409439', 'spitfire'] },
      () => {
        MarcAuthorities.selectSearchOptionInDropdown(searchOption);
        MarcAuthoritiesSearch.verifySelectedSearchOption(searchOption);
        cy.wait(2000);

        MarcAuthorities.searchBeats(searchCase.query);
        cy.wait(3000);

        searchCase.expected.forEach(({ authRef, heading, type }) => {
          MarcAuthorities.verifyResultsRowContent(heading, type, authRef);
        });
      },
    );
  });
});
