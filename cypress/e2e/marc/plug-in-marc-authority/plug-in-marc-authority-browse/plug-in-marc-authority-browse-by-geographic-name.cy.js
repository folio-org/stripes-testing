import { DEFAULT_JOB_PROFILE_NAMES } from '../../../../support/constants';
import Permissions from '../../../../support/dictionary/permissions';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('MARC', () => {
  describe('plug-in MARC authority', () => {
    describe('plug-in MARC authority | Browse', () => {
      const testData = {
        searchOption: 'Geographic name',
        value: 'Gulf Stream C380553',
      };

      const marcFiles = [
        {
          marc: 'marcBibFileForC380572.mrc',
          fileName: `marcFileOneBib.${getRandomPostfix()}.mrc`,
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
          numOfRecords: 1,
          propertyName: 'instance',
        },
        {
          marc: 'marcFileForC380553.mrc',
          fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
          numOfRecords: 2,
          propertyName: 'authority',
        },
      ];

      const createdAuthorityIDs = [];

      before('Creating user', () => {
        cy.createTempUser([
          Permissions.inventoryAll.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
          Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
          Permissions.moduleDataImportEnabled.gui,
        ]).then((createdUserProperties) => {
          testData.userProperties = createdUserProperties;

          cy.getUserToken(testData.userProperties.username, testData.userProperties.password);
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

      beforeEach('Login to the application', () => {
        cy.login(testData.userProperties.username, testData.userProperties.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
      });

      after('Deleting created user', () => {
        cy.getAdminToken();
        Users.deleteViaApi(testData.userProperties.userId);
        if (createdAuthorityIDs[0]) InventoryInstance.deleteInstanceViaApi(createdAuthorityIDs[0]);
        createdAuthorityIDs.forEach((id, index) => {
          if (index) MarcAuthority.deleteViaAPI(id);
        });
      });

      it(
        'C380553 MARC Authority plug-in | Browse using "Geographic name" option returns only records with the same "Type of heading" (spitfire)',
        { tags: ['criticalPath', 'spitfire', 'C380553'] },
        () => {
          InventoryInstances.searchByTitle(createdAuthorityIDs[0]);
          InventoryInstances.selectInstance();
          InventoryInstance.editMarcBibliographicRecord();
          InventoryInstance.verifyAndClickLinkIcon('700');

          MarcAuthorities.switchToBrowse();
          MarcAuthorities.clickReset();
          MarcAuthorities.checkDefaultBrowseOptions();
          MarcAuthorities.searchByParameter(testData.searchOption, testData.value);
          MarcAuthorities.checkResultsExistance('Authorized');
          MarcAuthorities.selectTitle(testData.value);
          MarcAuthorities.checkFieldAndContentExistence('151', testData.value);
          InventoryInstance.checkRecordDetailPage(testData.value);
          MarcAuthorities.searchBy('Personal name', 'North End (Boston, Mass.) C380553');
          MarcAuthorities.selectTitle('North End (Boston, Mass.) C380553');
          InventoryInstance.checkRecordDetailPage('North End (Boston, Mass.) C380553');
        },
      );
    });
  });
});
