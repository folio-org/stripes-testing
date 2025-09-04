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
    const keywordSearchOption = 'Keyword';
    const corporateConferenceNameSearchOption = 'Corporate/Conference name';
    const recordType = 'Authorized';
    const corporateNameFields = [
      'C466087 CORPORATE NAME CASE TEST',
      'C466087 corporate name case test',
    ];
    const marcFiles = [
      {
        marc: 'marcAuthFileForC466087.mrc',
        fileName: `C466087testMarcFile.${getRandomPostfix()}.mrc`,
        jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
        propertyName: 'authority',
      },
    ];
    const createdAuthorityIDs = [];
    let user;

    before('Create user, test data', () => {
      cy.getAdminToken();
      // make sure there are no duplicate authority records in the system
      MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C466087*');

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

        cy.waitForAuthRefresh(() => {
          cy.login(user.username, user.password, {
            path: TopMenu.marcAuthorities,
            waiter: MarcAuthorities.waitLoading,
          });
        });
        MarcAuthorities.switchToSearch();
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
      'C466087 Search/Browse by "Corporate/Conference name" field is case-insensitive (spitfire)',
      { tags: ['criticalPath', 'spitfire', 'C466087'] },
      () => {
        // execute search by "Keyword" option
        corporateNameFields.forEach((query) => {
          MarcAuthorities.searchByParameter(keywordSearchOption, query);
          cy.wait(1000);
          corporateNameFields.forEach((result) => {
            MarcAuthorities.checkAfterSearch(recordType, result);
          });
          MarcAuthorities.clickResetAndCheck(query);
          cy.wait(500);
        });

        // execute search by "Corporate/Conference name" option
        corporateNameFields.forEach((query) => {
          MarcAuthorities.searchByParameter(corporateConferenceNameSearchOption, query);
          cy.wait(1000);
          corporateNameFields.forEach((result) => {
            MarcAuthorities.checkAfterSearch(recordType, result);
          });
          MarcAuthorities.clickResetAndCheck(query);
          cy.wait(500);
        });

        MarcAuthorities.switchToBrowse();

        // execute browse by "Corporate/Conference name" option
        corporateNameFields.forEach((query) => {
          MarcAuthorities.searchByParameter(corporateConferenceNameSearchOption, query);
          cy.wait(1000);
          corporateNameFields.forEach((result) => {
            MarcAuthorities.checkAfterSearch(recordType, result);
          });
          MarcAuthorities.clickReset();
          MarcAuthorities.checkRecordsResultListIsAbsent();
          cy.wait(500);
        });
      },
    );
  });
});
