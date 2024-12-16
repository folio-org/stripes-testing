import { DEFAULT_JOB_PROFILE_NAMES } from '../../../../support/constants';
import Permissions from '../../../../support/dictionary/permissions';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Advanced Search', () => {
      const testData = {
        searchQueries: {
          geoNames: ['Belarus', 'Poland'],
          subject: 'Parliament paper',
          identifier: 'n91128701',
        },
        searchOptions: {
          geoName: 'Geographic name',
          subject: 'Subject',
          identifier: 'Identifier (all)',
        },
        booleanOptions: {
          or: 'OR',
          and: 'AND',
          not: 'NOT',
        },
        matchOptions: {
          exactPhrase: 'Exact phrase',
        },
      };

      const records = [
        { auth: 'Authorized', heading: 'Poland', typeOfHeading: 'Geographic Name' },
        { auth: 'Authorized', heading: 'Belarus', typeOfHeading: 'Geographic Name' },
        { auth: 'Authorized', heading: 'Parliament paper', typeOfHeading: 'Topical' },
      ];

      const jobProfileToRun = DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY;
      const marcFile = {
        marc: 'MarcAuthoritiesForC407728.mrc',
        fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
      };

      const createdAuthorityIDs = [];

      before(() => {
        cy.getAdminToken();
        DataImport.uploadFileViaApi(marcFile.marc, marcFile.fileName, jobProfileToRun).then(
          (response) => {
            response.forEach((record) => {
              createdAuthorityIDs.push(record.authority.id);
            });
          },
        );

        cy.createTempUser([Permissions.uiMarcAuthoritiesAuthorityRecordView.gui]).then(
          (createdUserProperties) => {
            testData.userProperties = createdUserProperties;
          },
        );
      });

      beforeEach(() => {
        cy.login(testData.userProperties.username, testData.userProperties.password, {
          path: TopMenu.marcAuthorities,
          waiter: MarcAuthorities.waitLoading,
        });
      });

      after(() => {
        cy.getAdminToken();
        MarcAuthority.deleteViaAPI(createdAuthorityIDs[0]);
        MarcAuthority.deleteViaAPI(createdAuthorityIDs[1]);
        MarcAuthority.deleteViaAPI(createdAuthorityIDs[3]);
        Users.deleteViaApi(testData.userProperties.userId);
      });

      it(
        'C407728 Advanced search of "MARC authority" records using "Exact phrase" search operator (Geographic name and Subject) (spitfire) (TaaS)',
        { tags: ['criticalPath', 'spitfire', 'C407728'] },
        () => {
          // #1 Click on the "Advanced search" button placed on the "Search & filter" pane.
          MarcAuthorities.clickAdvancedSearchButton();

          // #2 - #4 Fill in the first in following way: "Belarus" Exact phrase in "Geographic name"
          // Entered value is displayed in the first input field
          MarcAuthorities.fillAdvancedSearchField(
            0,
            testData.searchQueries.geoNames[0],
            testData.searchOptions.geoName,
            false,
            testData.matchOptions.exactPhrase,
          );
          // #5 Click on the "Search" button
          MarcAuthorities.clickSearchButton();
          MarcAuthorities.checkRowByContent(Object.values(records[1]).join(''));

          // #6 Click on the "Advanced search" button placed on the "Search & filter" pane.
          MarcAuthorities.clickAdvancedSearchButton();

          // #7 - #10 Fill in the second row in following way: "OR "Poland" Exact phrase in "Geographic name"
          MarcAuthorities.fillAdvancedSearchField(
            1,
            testData.searchQueries.geoNames[1],
            testData.searchOptions.geoName,
            testData.booleanOptions.or,
            testData.matchOptions.exactPhrase,
          );
          // #11 Click on the "Search" button
          MarcAuthorities.clickSearchButton();
          MarcAuthorities.checkRowByContent(Object.values(records[0]).join(''));
          MarcAuthorities.checkRowByContent(Object.values(records[1]).join(''));

          // #12 Click on the "Advanced search" button placed on the "Search & filter" pane.
          MarcAuthorities.clickAdvancedSearchButton();

          // #13 - #16 Fill in the third row in following way: "OR "Parliament paper" Exact phrase in "Subject"
          MarcAuthorities.fillAdvancedSearchField(
            2,
            testData.searchQueries.subject,
            testData.searchOptions.subject,
            testData.booleanOptions.or,
            testData.matchOptions.exactPhrase,
          );
          // #17 Click on the "Search" button
          MarcAuthorities.clickSearchButton();
          MarcAuthorities.checkRowByContent(Object.values(records[0]).join(''));
          MarcAuthorities.checkRowByContent(Object.values(records[1]).join(''));
          MarcAuthorities.checkRowByContent(Object.values(records[2]).join(''));

          // #18 Click on the "Advanced search" button placed on the "Search & filter" pane.
          MarcAuthorities.clickAdvancedSearchButton();

          // #19 - #22 Fill in the fourth row in following way: "NOT "n91128701" Exact phrase in "Identifier (all)"
          MarcAuthorities.fillAdvancedSearchField(
            3,
            testData.searchQueries.identifier,
            testData.searchOptions.identifier,
            testData.booleanOptions.not,
            testData.matchOptions.exactPhrase,
          );
          // #23 Click on the "Search" button
          MarcAuthorities.clickSearchButton();
          MarcAuthorities.checkRowByContent(Object.values(records[0]).join(''));
          MarcAuthorities.checkRowAbsentByContent(Object.values(records[1]).join(''));
          MarcAuthorities.checkRowByContent(Object.values(records[2]).join(''));
        },
      );
    });
  });
});
