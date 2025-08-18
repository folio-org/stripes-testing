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
      authority: {
        searchInput: 'Beatles',
        searchOption: 'Keyword',
      },
      jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
      marcFiles: [
        {
          marc: 'marcAuthFileForC380635.mrc',
          fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
          numOfRecords: 1,
          propertyName: 'authority',
        },
      ],
      expectedActions: ['Edit', 'Export (MARC)', 'Print', 'Delete'],
    };
    const createdAuthorityIDs = [];

    before('Create test data', () => {
      cy.getAdminToken();
      testData.marcFiles.forEach((marcFile) => {
        DataImport.uploadFileViaApi(
          marcFile.marc,
          marcFile.fileName,
          testData.jobProfileToRun,
        ).then((response) => {
          response.forEach((record) => {
            createdAuthorityIDs.push(record[marcFile.propertyName].id);
          });
        });
      });

      cy.createTempUser([
        Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
        Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
        Permissions.uiMarcAuthoritiesAuthorityRecordDelete.gui,
        Permissions.dataExportUploadExportDownloadFileViewLogs.gui,
      ]).then((createdUserProperties) => {
        testData.userProperties = createdUserProperties;
        cy.login(testData.userProperties.username, testData.userProperties.password, {
          path: TopMenu.marcAuthorities,
          waiter: MarcAuthorities.waitLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      createdAuthorityIDs.forEach((id) => {
        MarcAuthority.deleteViaAPI(id);
      });
      Users.deleteViaApi(testData.userProperties.userId);
    });
    it(
      'C380635 "Print" option is located below "Export (MARC)" option in "Actions" menu for "MARC authority" record (spitfire) (TaaS)',
      { tags: ['extendedPath', 'spitfire', 'C380635'] },
      () => {
        MarcAuthorities.searchBy(testData.authority.searchOption, testData.authority.searchInput);
        MarcAuthorities.selectFirstRecord();
        MarcAuthority.checkActionDropdownContent(testData.expectedActions);
      },
    );
  });
});
