import Permissions from '../../../support/dictionary/permissions';
import MarcAuthorities from '../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../support/fragments/marcAuthority/marcAuthority';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import { DEFAULT_JOB_PROFILE_NAMES } from '../../../support/constants';
import DataImport from '../../../support/fragments/data_import/dataImport';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Authority', () => {
    const keywordSearchOption = 'Keyword';
    const identifierAllSearchOption = 'Identifier (all)';
    const searchQueries = ['np13011996', 'NP13011996'];
    const searchResults = [
      'C466085 Authority 1, 001 identifier lower case test',
      'C466085 Authority 2, 001 identifier UPPER case test',
      'C466085 Authority 3, 010 identifier lower case test',
      'C466085 Authority 4, 010 identifier UPPER case test',
      'C466085 Authority 5, 024 identifier lower case test',
      'C466085 Authority 6, 024 identifier UPPER case test',
      'C466085 Authority 7, 035 identifier lower case test',
      'C466085 Authority 8, 035 identifier UPPER case test',
    ];
    const createdAuthorityIDs = [];
    let user;

    const marcFiles = [
      {
        marc: 'marcAuthFileForC466085.mrc',
        fileName: `testMarcFileC466085.${getRandomPostfix()}.mrc`,
        jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
        propertyName: 'authority',
      },
    ];

    before('Create user, test data', () => {
      cy.getAdminToken();
      // make sure there are no duplicate authority records in the system
      MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C466085*', 'Authority 2, 001 identifier*');

      cy.createTempUser([
        Permissions.inventoryAll.gui,
        Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
      ]).then((createdUserProperties) => {
        user = createdUserProperties;

        marcFiles.forEach((marcFile) => {
          DataImport.uploadFileViaApi(
            marcFile.marc,
            marcFile.fileName,
            marcFile.jobProfileToRun,
          ).then((response) => {
            response.forEach((record) => {
              createdAuthorityIDs.push(record[marcFile.propertyName].id);
            });
          });
        });
      });
    });

    after('Delete user, test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
      createdAuthorityIDs.forEach((id) => {
        MarcAuthority.deleteViaAPI(id);
      });
    });

    it(
      'C466085 Search by "Identifier" field is case-insensitive (spitfire)',
      { tags: ['criticalPath', 'spitfire', 'C466085'] },
      () => {
        cy.login(user.username, user.password, {
          path: TopMenu.marcAuthorities,
          waiter: MarcAuthorities.waitLoading,
        });
        MarcAuthorities.switchToSearch();

        searchQueries.forEach((query) => {
          MarcAuthorities.searchByParameter(keywordSearchOption, query);
          cy.wait(1000);
          searchResults.forEach((result) => {
            MarcAuthorities.checkAfterSearch('Authorized', result);
          });
          MarcAuthorities.clickResetAndCheck(query);
          cy.wait(500);
        });

        searchQueries.forEach((query) => {
          MarcAuthorities.searchByParameter(identifierAllSearchOption, query);
          cy.wait(1000);
          searchResults.forEach((result) => {
            MarcAuthorities.checkAfterSearch('Authorized', result);
          });
          MarcAuthorities.clickResetAndCheck(query);
          cy.wait(500);
        });
      },
    );
  });
});
