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
        forC380567: {
          searchOption: 'Corporate/Conference name',
        },
        forC359228: {
          type: 'Authorized',
          typeOfHeadingA: 'Corporate Name',
          typeOfHeadingB: 'Conference Name',
        },
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
          marc: 'marcFileForC359228.mrc',
          fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
          numOfRecords: 5,
          propertyName: 'authority',
        },
      ];

      const createdAuthorityIDs = [];

      before('Creating user', () => {
        cy.getAdminToken();
        // make sure there are no duplicate authority records in the system

        ['UXPROD-4394C380567*'].forEach((title) => {
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
        });
        cy.waitForAuthRefresh(() => {
          cy.login(testData.preconditionUserId, {
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
          if (index) MarcAuthority.deleteViaAPI(id, true);
        });
      });

      it(
        'C380567 MARC Authority plug-in | Search using "Corporate/Conference name" option (spitfire)',
        { tags: ['criticalPath', 'spitfire', 'C380567'] },
        () => {
          const validSearchResults = [
            'UXPROD-4394C380567 Corporate name 110',
            'UXPROD-4394C380567 Corporate name 410',
            'UXPROD-4394C380567 Corporate name 510',
            'UXPROD-4394C380567 Conference Name 111',
            'UXPROD-4394C380567 Conference Name 411',
            'UXPROD-4394C380567 Conference Name 511',
          ];
          const unvalidSearchResults = [
            'UXPROD-4394C380567 Corporate name 110 Apple & Honey Productions subb subc subd subg subn subk subv subx suby subz',
            'UXPROD-4394C380567 Corporate name 410 Apple and Honey Productions subb subc subd subg subn subk subv subx suby subz',
            'UXPROD-4394C380567 Corporate name 510 Apple & Honey Film Corp. subb subc subd subg subn subk subv subx suby subz',
            'UXPROD-4394C380567 Conference Name 111 Western Region Agricultural Education Research Meeting subc subd subn subq subg subk subv subx suby subz',
            'UXPROD-4394C380567 Conference Name 411 Western Regional Agricultural Education Research Meeting subc subd subn subq subg subk subv subx suby subz',
            'UXPROD-4394C380567 Conference Name 511 Western Region Agricultural Education Research Seminar (1983- ) subc subd subn subq subk subv subx suby subz subg',
          ];
          InventoryInstances.searchByTitle(createdAuthorityIDs[0]);
          InventoryInstances.selectInstance();
          InventoryInstance.editMarcBibliographicRecord();
          InventoryInstance.verifyAndClickLinkIcon('700');
          MarcAuthorities.switchToSearch();
          InventoryInstance.verifySearchOptions();
          MarcAuthorities.searchByParameter(testData.forC380567.searchOption, 'UXPROD-4394C380567');
          // wait for the results to be loaded.
          cy.wait(1000);
          validSearchResults.forEach((result) => {
            MarcAuthorities.checkRowByContent(result);
          });
          MarcAuthorities.checkAfterSearchHeadingType(
            testData.forC359228.type,
            testData.forC359228.typeOfHeadingA,
            testData.forC359228.typeOfHeadingB,
          );
          MarcAuthorities.selectIncludingTitle(validSearchResults[0]);
          MarcAuthorities.checkRecordDetailPageMarkedValue(
            'UXPROD-4394C380567 Corporate name 110 Apple & Honey Productions',
          );
          MarcAuthorities.closeMarcViewPane();
          validSearchResults.forEach((result) => {
            MarcAuthorities.searchByParameter(testData.forC380567.searchOption, result);
            MarcAuthorities.verifyViewPaneContent(result);
          });
          unvalidSearchResults.forEach((result) => {
            MarcAuthorities.searchByParameter(testData.forC380567.searchOption, result);
            MarcAuthoritiesDelete.checkEmptySearchResults(result);
          });
        },
      );
    });
  });
});
