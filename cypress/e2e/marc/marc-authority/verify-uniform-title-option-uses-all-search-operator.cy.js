import { DEFAULT_JOB_PROFILE_NAMES } from '../../../support/constants';
import Permissions from '../../../support/dictionary/permissions';
import DataImport from '../../../support/fragments/data_import/dataImport';
import MarcAuthorities from '../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../support/fragments/marcAuthority/marcAuthority';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Authority', () => {
    const testData = {
      searchOptions: ['Keyword', 'Uniform title'],
      recordType: 'Authorized',
      marcValue: 'C584449 Cartoons & Comics',
      searchQueries: ['Cartoons & Comics', 'Comics & Cartoons', 'Comics &', 'Comics & Movies'],
      invalidQuery: 'Comics & Movies',
    };
    const marcFiles = [
      {
        marc: 'marcAuthFileForC584449.mrc',
        fileName: `testMarcFileC584449.${getRandomPostfix()}.mrc`,
        jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
        propertyName: 'authority',
      },
    ];
    const createdAuthorityIDs = [];
    let user;

    before('Create user, test data', () => {
      cy.getAdminToken();
      // make sure there are no duplicate authority records in the system
      MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C584449*');

      cy.createTempUser([Permissions.moduleDataImportEnabled.gui]).then((userProperties) => {
        testData.preconditionUserId = userProperties.userId;

        cy.getUserToken(userProperties.username, userProperties.password);
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

      cy.getAdminToken();
      cy.createTempUser([Permissions.uiMarcAuthoritiesAuthorityRecordView.gui]).then(
        (createdUserProperties) => {
          user = createdUserProperties;

          cy.login(user.username, user.password, {
            path: TopMenu.marcAuthorities,
            waiter: MarcAuthorities.waitLoading,
          });
          MarcAuthorities.switchToSearch();
        },
      );
    });

    after('Delete user, test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(testData.preconditionUserId);
      Users.deleteViaApi(user.userId);
      createdAuthorityIDs.forEach((id) => {
        MarcAuthority.deleteViaAPI(id);
      });
    });

    it(
      'C584449 Verify that "Uniform title" search option uses "all" search operator ("Cartoons & Comics" case) (spitfire)',
      { tags: ['criticalPath', 'spitfire', 'C584449'] },
      () => {
        // execute search by "Keyword" option
        testData.searchOptions.forEach((option) => {
          testData.searchQueries.forEach((query) => {
            MarcAuthorities.searchByParameter(option, query);
            cy.wait(1000);
            if (query === testData.invalidQuery) {
              MarcAuthorities.verifyEmptySearchResults(query);
            } else {
              MarcAuthorities.checkAfterSearch(testData.recordType, testData.marcValue);
            }
            MarcAuthorities.clickResetAndCheck(query);
            cy.wait(500);
          });
        });
      },
    );
  });
});