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
    describe('plug-in MARC authority | Search', () => {
      const testData = {
        forC359229: {
          searchOptionA: 'Geographic name',
          searchOptionB: 'Keyword',
          valueA: 'C380568 Gulf Stream',
          valueB: 'C380568 North',
          type: 'Authorized',
        },
      };

      const marcFiles = [
        {
          marc: 'oneMarcBib.mrc',
          fileName: `C380568 testMarcFile.${getRandomPostfix()}.mrc`,
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
          numOfRecords: 1,
          propertyName: 'instance',
        },
        {
          marc: 'marcFileForC359229.mrc',
          fileName: `C380568 testMarcFile.${getRandomPostfix()}.mrc`,
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
          numOfRecords: 2,
          propertyName: 'authority',
        },
      ];

      const createdAuthorityIDs = [];

      before('Creating user', () => {
        cy.getAdminToken();
        // make sure there are no duplicate authority records in the system
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C380568*');

        cy.createTempUser([Permissions.moduleDataImportEnabled.gui]).then((userProperties) => {
          testData.preconditionUserId = userProperties.userId;

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
          InventoryInstance.deleteInstanceViaApi(createdAuthorityIDs[0]);
        });

        cy.createTempUser([
          Permissions.inventoryAll.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
          Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
        ]).then((createdUserProperties) => {
          testData.userProperties = createdUserProperties;

          cy.login(testData.userProperties.username, testData.userProperties.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          });
        });
      });

      after('Deleting created user', () => {
        cy.getAdminToken();
        Users.deleteViaApi(testData.userProperties.userId);
        InventoryInstance.deleteInstanceViaApi(createdAuthorityIDs[0]);
        createdAuthorityIDs.forEach((id, index) => {
          if (index) MarcAuthority.deleteViaAPI(id, true);
        });
      });

      it(
        'C380568 MARC Authority plug-in | Search using "Geographic name" option (spitfire)',
        { tags: ['criticalPath', 'spitfire', 'C380568'] },
        () => {
          InventoryInstances.searchByTitle(createdAuthorityIDs[0]);
          InventoryInstances.selectInstance();
          InventoryInstance.editMarcBibliographicRecord();
          InventoryInstance.verifyAndClickLinkIcon('700');
          MarcAuthorities.switchToSearch();
          InventoryInstance.verifySearchOptions();
          MarcAuthorities.searchBy(testData.forC359229.searchOptionA, testData.forC359229.valueA);
          MarcAuthorities.checkFieldAndContentExistence('151', testData.forC359229.valueA);
          InventoryInstance.checkRecordDetailPage(testData.forC359229.valueA);
          MarcAuthorities.searchBy(testData.forC359229.searchOptionB, testData.forC359229.valueB);
          MarcAuthorities.checkResultsExistance(testData.forC359229.type);
        },
      );
    });
  });
});
