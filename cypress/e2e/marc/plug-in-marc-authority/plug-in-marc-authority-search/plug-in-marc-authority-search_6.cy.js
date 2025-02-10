import { DEFAULT_JOB_PROFILE_NAMES } from '../../../../support/constants';
import Permissions from '../../../../support/dictionary/permissions';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthoritiesDelete from '../../../../support/fragments/marcAuthority/marcAuthoritiesDelete';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('MARC', () => {
  describe('plug-in MARC authority', () => {
    describe('plug-in MARC authority | Search', () => {
      const testData = {
        forC380566: {
          searchOption: 'Personal name',
        },
      };

      const marcFiles = [
        {
          marc: 'oneMarcBib.mrc',
          fileName: `C380566 testMarcFile.${getRandomPostfix()}.mrc`,
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
          numOfRecords: 1,
          propertyName: 'instance',
        },
        {
          marc: 'marcFileForC380566.mrc',
          fileName: `C380566 testMarcFile.${getRandomPostfix()}.mrc`,
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
          numOfRecords: 2,
          propertyName: 'authority',
        },
      ];

      const createdAuthorityIDs = [];

      before('Creating user', () => {
        cy.getAdminToken();
        // make sure there are no duplicate authority records in the system
        ['UXPROD-4394C380566*'].forEach((title) => {
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI(title);
        });

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
        'C380566 MARC Authority plug-in | Search using "Personal name" option (spitfire)',
        { tags: ['criticalPath', 'spitfire', 'C380566'] },
        () => {
          const validSearchResults = [
            'UXPROD-4394C380566 Personal name 100 Elizabeth',
            'UXPROD-4394C380566 Personal name 400 Elizabeth,',
            'UXPROD-4394C380566 Personal name 500 Windsor',
          ];
          const unvalidSearchResults = [
            'UXPROD-4394C380566 Personal name 100 Elizabeth II, Queen of Great Britain, 1926- subg subq subk Musical settings Literary style Stage history 1950- England',
            'UXPROD-4394C380566 Personal name 400 Elizabeth, II Princess, Duchess of Edinburgh, 1926- subg subq subk subv subx suby subz',
            'Family UXPROD-4394C380566 Personal name 500 Windsor (Royal house : 1917- : Great Britain) II subg subq subv subx suby subz',
          ];

          InventoryInstances.searchByTitle(createdAuthorityIDs[0]);
          InventoryInstances.selectInstance();
          InventoryInstance.editMarcBibliographicRecord();
          InventoryInstance.verifyAndClickLinkIcon('700');
          MarcAuthorities.switchToSearch();
          InventoryInstance.verifySearchOptions();
          MarcAuthorities.searchByParameter(testData.forC380566.searchOption, 'UXPROD-4394C380566');
          validSearchResults.forEach((result) => {
            MarcAuthorities.checkRowByContent(result);
          });
          MarcAuthorities.selectIncludingTitle(validSearchResults[0]);
          MarcAuthorities.checkRecordDetailPageMarkedValue(
            'UXPROD-4394C380566 Personal name 100 Elizabeth',
          );
          MarcAuthorities.closeMarcViewPane();
          validSearchResults.forEach((result) => {
            MarcAuthorities.searchByParameter(testData.forC380566.searchOption, result);
            MarcAuthorities.verifyViewPaneContent(result);
          });
          unvalidSearchResults.forEach((result) => {
            MarcAuthorities.searchByParameter(testData.forC380566.searchOption, result);
            MarcAuthoritiesDelete.checkEmptySearchResults(result);
          });
        },
      );
    });
  });
});
