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
      searchOptions: ['Keyword', 'Geographic name'],
      recordType: 'Authorized',
      marcValue: 'C584445 Greenwich Village (New York, N.Y.) Maps',
      searchQueries: [
        'Greenwich Village (New York, N.Y.) Maps',
        'Maps Greenwich New York Village (N.Y.)',
        'Maps New York Village (N.Y.)',
        'Maps New York Brooklyn Village (N.Y.)',
      ],
      invalidQuery: 'Maps New York Brooklyn Village (N.Y.)',
    };
    const marcFiles = [
      {
        marc: 'marcAuthFileForC584445.mrc',
        fileName: `testMarcFileC584445.${getRandomPostfix()}.mrc`,
        jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
        propertyName: 'authority',
      },
    ];
    const createdAuthorityIDs = [];
    let user;

    before('Create user, test data', () => {
      cy.getAdminToken();
      // make sure there are no duplicate authority records in the system
      MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C584445*');

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
      'C584445 Verify that "Geographic name" search option uses "all" search operator ("Greenwich Village (New York, N.Y.) Maps" case) (spitfire)',
      { tags: ['criticalPath', 'spitfire', 'C584445'] },
      () => {
        // execute search by "Keyword" option
        MarcAuthorities.switchToSearch();
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
