import { DEFAULT_JOB_PROFILE_NAMES } from '../../../../support/constants';
import Permissions from '../../../../support/dictionary/permissions';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('MARC', () => {
  describe('plug-in MARC authority', () => {
    describe('plug-in MARC authority | Browse', () => {
      const testData = {
        searchOption: 'Personal name',
        value: 'UXPROD-4394C380551',
        valueFullText:
          'UXPROD-4394C380551 Personal name 100 Elizabeth II, Queen of Great Britain, 1926- subg subq--Musical settings--Literary style--Stage history--1950---England',
        validSearchResults: [
          'UXPROD-4394C380551 Personal name 100 Elizabeth',
          'UXPROD-4394C380551 Personal name 400 Elizabeth,',
        ],
        unvalidSearchResults: [
          'UXPROD-4394C380551 Personal name 500 Windsor (Royal house : 1917- : Great Britain) II subg subq subv subx suby subz',
          'UXPROD-4394C380551 Personal name 100 Elizabeth II, Queen of Great Britain, 1926- subg subq subk Musical settings Literary style Stage history 1950- England',
          'UXPROD-4394C380551 Personal name 400 Elizabeth, II Princess, Duchess of Edinburgh, 1926- subg subq subk subv subx suby subz',
        ],
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
          marc: 'marcFileForC380551.mrc',
          fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
          numOfRecords: 2,
          propertyName: 'authority',
        },
      ];

      const createdAuthorityIDs = [];

      before('Creating user', () => {
        cy.getAdminToken();
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI(testData.value);
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
          authRefresh: true,
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
        'C380551 MARC Authority plug-in | Browse using "Personal name" option returns only records with the same "Type of heading" (spitfire)',
        { tags: ['criticalPath', 'spitfire', 'C380551'] },
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
          testData.validSearchResults.forEach((result) => {
            MarcAuthorities.checkRowByContent(result);
          });
          // eslint-disable-next-line no-irregular-whitespace
          InventorySearchAndFilter.verifySearchResult(`${testData.value} would be here`);
          testData.validSearchResults.forEach((result) => {
            MarcAuthorities.searchByParameter(testData.searchOption, result);
            MarcAuthorities.checkRowByContent(result);
          });
          testData.unvalidSearchResults.forEach((result) => {
            MarcAuthorities.searchByParameter(testData.searchOption, result);
            // eslint-disable-next-line no-irregular-whitespace
            InventorySearchAndFilter.verifySearchResult(`${result} would be here`);
          });
          MarcAuthorities.selectTitle(testData.valueFullText);
          MarcAuthorities.checkFieldAndContentExistence('100', testData.value);
          MarcAuthorities.clickResetAndCheckBrowse(testData.value);
        },
      );
    });
  });
});
