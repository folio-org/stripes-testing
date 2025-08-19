import { DEFAULT_JOB_PROFILE_NAMES } from '../../../../support/constants';
import { Permissions } from '../../../../support/dictionary';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Advanced Search', () => {
      const createdAuthorityIDs = [];

      const testData = {
        marcFile: {
          marc: 'C407730MarcAuth.mrc',
          fileName: `testMarcFile${getRandomPostfix()}.mrc`,
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
        },
        searchSteps: [
          {
            query: 'gf201',
            operator: 'Starts with',
            searchOption: 'Identifier (all)',
            expectedResults: [
              { searchRecordName: 'Mental maps407730', type: 'Authorized', headingType: 'Genre' },
              { searchRecordName: 'Maps407730', type: 'Authorized', headingType: 'Genre' },
              { searchRecordName: 'Mappae mundi407730', type: 'Authorized', headingType: 'Genre' },
              {
                searchRecordName: 'Upside-down maps407730',
                type: 'Authorized',
                headingType: 'Genre',
              },
            ],
          },
          {
            booleanOperator: 'OR',
            query: 'Map',
            operator: 'Starts with',
            searchOption: 'Genre',
            expectedResults: [
              { searchRecordName: 'Maps407730', type: 'Authorized', headingType: 'Genre' },
              { searchRecordName: 'Mappae mundi407730', type: 'Authorized', headingType: 'Genre' },
              {
                searchRecordName: 'Upside-down maps407730',
                type: 'Authorized',
                headingType: 'Genre',
              },
              { searchRecordName: 'Mental maps407730', type: 'Authorized', headingType: 'Genre' },
              { searchRecordName: 'Maps', type: 'Auth/Ref', headingType: 'Genre' },
              { searchRecordName: 'Maps', type: 'Auth/Ref', headingType: 'Genre' },
              { searchRecordName: 'Mappamundi', type: 'Reference', headingType: 'Genre' },
              { searchRecordName: 'Maps mental', type: 'Auth/Ref', headingType: 'Genre' },
              { searchRecordName: 'Mappa mundi', type: 'Reference', headingType: 'Genre' },
            ],
          },
          {
            booleanOperator: 'OR',
            query: 'Map',
            operator: 'Starts with',
            searchOption: "Children's subject heading",
            expectedResults: [
              { searchRecordName: 'Maps407730', type: 'Authorized', headingType: 'Genre' },
              { searchRecordName: 'Mappae mundi407730', type: 'Authorized', headingType: 'Genre' },
              {
                searchRecordName: 'Upside-down maps407730',
                type: 'Authorized',
                headingType: 'Genre',
              },
              { searchRecordName: 'Mental maps407730', type: 'Authorized', headingType: 'Genre' },
              { searchRecordName: 'Mappa mundi', type: 'Reference', headingType: 'Genre' },
              { searchRecordName: 'Mappamundi', type: 'Reference', headingType: 'Genre' },
              { searchRecordName: 'Maps', type: 'Auth/Ref', headingType: 'Genre' },
              { searchRecordName: 'Maps', type: 'Auth/Ref', headingType: 'Genre' },
              { searchRecordName: 'Maps mental', type: 'Auth/Ref', headingType: 'Genre' },
              {
                searchRecordName: 'Maps - Montessori method of education407730',
                type: 'Authorized',
                headingType: 'Topical',
              },
            ],
          },
          {
            booleanOperator: 'AND',
            query: 'Maps',
            operator: 'Starts with',
            searchOption: 'Keyword',
            expectedResults: [
              { searchRecordName: 'Maps', type: 'Authorized', headingType: 'Genre' },
              { searchRecordName: 'Maps', type: 'Auth/Ref', headingType: 'Genre' },
              { searchRecordName: 'Maps mental', type: 'Auth/Ref', headingType: 'Genre' },
              { searchRecordName: 'Maps', type: 'Auth/Ref', headingType: 'Genre' },
              {
                searchRecordName: 'Maps - Montessori method of education407730',
                type: 'Authorized',
                headingType: 'Topical',
              },
            ],
          },
          {
            booleanOperator: 'NOT',
            query: 'gf2011',
            operator: 'Starts with',
            searchOption: 'Keyword',
            expectedResults: [
              { searchRecordName: 'Maps', type: 'Auth/Ref', headingType: 'Genre' },
              { searchRecordName: 'Maps mental', type: 'Auth/Ref', headingType: 'Genre' },
              {
                searchRecordName: 'Maps - Montessori method of education407730',
                type: 'Authorized',
                headingType: 'Topical',
              },
            ],
          },
        ],
      };

      before(() => {
        cy.getAdminToken();
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('*407730');

        DataImport.uploadFileViaApi(
          testData.marcFile.marc,
          testData.marcFile.fileName,
          testData.marcFile.jobProfileToRun,
        ).then((response) => {
          response.forEach((record) => {
            createdAuthorityIDs.push(record.authority.id);
          });
        });

        cy.createTempUser([Permissions.uiMarcAuthoritiesAuthorityRecordView.gui]).then(
          (userProperties) => {
            testData.user = userProperties;
            cy.login(testData.user.username, testData.user.password, {
              path: TopMenu.marcAuthorities,
              waiter: MarcAuthorities.waitLoading,
            });
          },
        );
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        createdAuthorityIDs.forEach((id) => MarcAuthority.deleteViaAPI(id));
        Users.deleteViaApi(testData.user.userId);
      });

      it(
        'C407730 Advanced search of "MARC authority" records using "Starts with" operator (Identifier, Genre, Children subject heading, Keyword, Boolean ops) (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C407730'] },
        () => {
          testData.searchSteps.forEach((step, index) => {
            MarcAuthorities.clickAdvancedSearchButton();
            MarcAuthorities.fillAdvancedSearchField(
              index,
              step.query,
              step.searchOption,
              step.booleanOperator,
              step.operator,
            );
            MarcAuthorities.clickSearchButton();
            MarcAuthorities.checkAdvancedSearchModalAbsence();

            step.expectedResults.forEach((result) => {
              MarcAuthorities.checkAfterSearch(result.type, result.searchRecordName);
            });
          });
        },
      );
    });
  });
});
