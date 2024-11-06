import { DEFAULT_JOB_PROFILE_NAMES } from '../../../../support/constants';
import Permissions from '../../../../support/dictionary/permissions';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';

describe('MARC', () => {
  describe('plug-in MARC authority', () => {
    describe('plug-in MARC authority | Search', () => {
      const testData = {
        searchOption: 'LCCN',
        AUTHORIZED: 'Authorized',
      };

      const searchQueries = ['sh  85057*', '*5057895', '*0578*'];

      const searchResults = [
        'C440116 Test LCCN subfield a record 1 (two leading spaces, one trailing space, two internal spaces)',
        'C440116 Test LCCN subfield a record 2 (one space internal)',
        'C440116 Test LCCN subfield a record 3 (two spaces internal)',
        'C440116 Test LCCN subfield a record 4 (one space trailing)',
        'C440116 Test LCCN subfield a record 5 (two spaces trailing)',
        'C440116 Test LCCN subfield a record 6 (one space leading)',
        'C440116 Test LCCN subfield a record 7 (two spaces leading)',
        'C440116 Test LCCN subfield a record 8 (two spaces everywhere)',
        'C440116 Test LCCN subfield a record 9 (no spaces)',
      ];

      const marcFiles = [
        {
          marc: 'oneMarcBib.mrc',
          fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
          numOfRecords: 1,
          propertyName: 'instance',
        },
        {
          marc: 'marcAuthFileForC440116.mrc',
          fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
          numOfRecords: 9,
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
          if (index) MarcAuthority.deleteViaAPI(id);
        });
      });

      it(
        'C440116 MARC Authority plug-in | Search by "LCCN" option using a query with asterisk when "LCCN" (010 $a) has (leading, internal, trailing) spaces. (spitfire)',
        { tags: ['criticalPath', 'spitfire', 'C440116'] },
        () => {
          InventoryInstances.searchByTitle(createdAuthorityIDs[0]);
          InventoryInstances.selectInstance();
          InventoryInstance.editMarcBibliographicRecord();
          InventoryInstance.verifyAndClickLinkIcon('700');
          MarcAuthorities.switchToSearch();
          InventoryInstance.verifySearchOptions();

          searchQueries.forEach((query) => {
            MarcAuthorities.searchByParameter(testData.searchOption, query);
            searchResults.forEach((result) => {
              MarcAuthorities.checkAfterSearch(testData.AUTHORIZED, result);
            });
          });
        },
      );
    });
  });
});
