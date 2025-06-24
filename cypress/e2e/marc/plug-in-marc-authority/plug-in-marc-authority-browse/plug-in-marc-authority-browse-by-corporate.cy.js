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
import MarcAuthorityBrowse from '../../../../support/fragments/marcAuthority/MarcAuthorityBrowse';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';

describe('MARC', () => {
  describe('plug-in MARC authority', () => {
    describe('plug-in MARC authority | Browse', () => {
      const testData = {
        searchOption: 'Corporate/Conference name',
        typeA: 'Authorized',
        typeB: 'Reference',
        typeOfHeadingA: 'Corporate Name',
        typeOfHeadingB: 'Conference Name',
        value: 'UXPROD-4394C380552',
        valueFullText:
          'UXPROD-4394C380552 updated Corporate name 110 Apple & Honey Productions subb subc subd subg subn subv subx suby subz',
        validSearchResults: [
          'UXPROD-4394C380552 updated Corporate name 110',
          'UXPROD-4394C380552 updated Corporate name 410',
          'UXPROD-4394C380552 updated Conference Name 111',
          'UXPROD-4394C380552 updated Conference Name 411',
        ],
        valid500Results: [
          'UXPROD-4394C380552 updated Corporate name 510',
          'UXPROD-4394C380552 updated Conference Name 511',
        ],
        unvalidSearchResults: [
          'UXPROD-4394C380552 Corporate name 110 Apple & Honey Productions subb subc subd subg subn subk subv subx suby subz',
          'UXPROD-4394C380552 Corporate name 410 Apple and Honey Productions subb subc subd subg subn subk subv subx suby subz',
          'UXPROD-4394C380552 Conference Name 111 Western Region Agricultural Education Research Meeting subc subd subn subq subg subk subv subx suby subz',
          'UXPROD-4394C380552 Conference Name 411 Western Regional Agricultural Education Research Meeting subc subd subn subq subg subk subv subx suby subz',
        ],
      };

      const marcFiles = [
        {
          marc: 'oneMarcBib.mrc',
          fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
          numOfRecords: 1,
          propertyName: 'instance',
        },
        {
          marc: 'marcFileForC380552.mrc',
          fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
          numOfRecords: 5,
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
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI(testData.value);

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
        cy.waitForAuthRefresh(() => {
          cy.login(testData.userProperties.username, testData.userProperties.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          });
          cy.reload();
          InventoryInstances.waitContentLoading();
        }, 20_000);
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
        'C380552 MARC Authority plug-in | Browse using "Corporate/Conference name" option returns only records with the same "Type of heading" (spitfire)',
        { tags: ['criticalPath', 'spitfire', 'C380552'] },
        () => {
          InventoryInstances.searchByTitle(createdAuthorityIDs[0]);
          InventoryInstances.selectInstance();
          InventoryInstance.editMarcBibliographicRecord();
          InventoryInstance.verifyAndClickLinkIcon('700');
          MarcAuthorities.searchByParameter(testData.searchOption, testData.value);
          // wait for the results to be loaded.
          cy.wait(1000);
          testData.validSearchResults.forEach((result) => {
            MarcAuthorities.checkRowByContent(result);
          });
          MarcAuthorities.checkAuthorizedReferenceColumn(testData.typeA, testData.typeB);
          MarcAuthorities.checkAfterSearchHeadingType(
            testData.typeA,
            testData.typeOfHeadingA,
            testData.typeOfHeadingB,
          );
          // eslint-disable-next-line no-irregular-whitespace
          InventorySearchAndFilter.verifySearchResult(`${testData.value} would be here`);
          testData.validSearchResults.forEach((result) => {
            MarcAuthorities.searchByParameter(testData.searchOption, result);
            MarcAuthorities.checkRowByContent(result);
          });
          testData.valid500Results.forEach((result) => {
            MarcAuthorities.searchByParameter(testData.searchOption, result);
            // eslint-disable-next-line no-irregular-whitespace
            InventorySearchAndFilter.verifySearchResult(`${result} would be here`);
          });
          testData.unvalidSearchResults.forEach((result) => {
            MarcAuthorities.searchByParameter(testData.searchOption, result);
            // eslint-disable-next-line no-irregular-whitespace
            InventorySearchAndFilter.verifySearchResult(`${result} would be here`);
          });
          MarcAuthorities.selectTitle(testData.valueFullText);
          MarcAuthorities.checkFieldAndContentExistence('110', testData.value);
          MarcAuthorities.chooseTypeOfHeading('Conference Name');
          MarcAuthorityBrowse.checkResultWithNoValue(
            'UXPROD-4394C380552 Conference Name 411 Western Regional Agricultural Education Research Meeting subc subd subn subq subg subk subv subx suby subz',
          );
        },
      );
    });
  });
});
