import Permissions from '../../../../support/dictionary/permissions';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import MarcAuthoritiesBrowseSearch from '../../../../support/fragments/marcAuthority/marcAuthoritiesBrowseSearch';
import getRandomPostfix from '../../../../support/utils/stringTools';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Browse - Authority records', () => {
      const testData = {
        marcValue: 'C422027',
        searchOption: 'Personal name',
      };

      const marcFile = {
        marc: 'marcAuthC422027.mrc',
        fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
        jobProfileToRun: 'Default - Create SRS MARC Authority',
        numOfRecords: 1,
      };

      const createdAuthorityIDs = [];

      before('Creating user', () => {
        cy.getAdminToken();
        DataImport.uploadFileViaApi(
          marcFile.marc,
          marcFile.fileName,
          marcFile.jobProfileToRun,
        ).then((response) => {
          response.forEach((record) => {
            createdAuthorityIDs.push(record.authority.id);
          });
        });

        cy.createTempUser([Permissions.uiMarcAuthoritiesAuthorityRecordView.gui]).then(
          (createdUserProperties) => {
            testData.userProperties = createdUserProperties;
            cy.login(testData.userProperties.username, testData.userProperties.password, {
              path: TopMenu.marcAuthorities,
              waiter: MarcAuthorities.waitLoading,
            });
          },
        );
        MarcAuthorities.switchToBrowse();
      });

      after('Deleting created user', () => {
        cy.getAdminToken();
        createdAuthorityIDs.forEach((id) => {
          MarcAuthority.deleteViaAPI(id);
        });
        Users.deleteViaApi(testData.userProperties.userId);
      });

      it(
        'C422027 Verify that clicking on "Reset all" button will return focus and cursor to the Browse box (spitfire) (TaaS)',
        { tags: ['extendedPath', 'spitfire'] },
        () => {
          MarcAuthoritiesBrowseSearch.searchBy(testData.searchOption, testData.marcValue);
          MarcAuthorities.verifySearchResultTabletIsAbsent(false);
          MarcAuthorities.checkResetAllButtonDisabled(false);
          MarcAuthorities.clickReset();
          MarcAuthorities.verifySearchResultTabletIsAbsent(true);
          MarcAuthorities.checkDefaultBrowseOptions(testData.marcValue);
          MarcAuthorities.checkResetAllButtonDisabled();
          MarcAuthorities.checkSearchInputInFocus();
        },
      );
    });
  });
});
