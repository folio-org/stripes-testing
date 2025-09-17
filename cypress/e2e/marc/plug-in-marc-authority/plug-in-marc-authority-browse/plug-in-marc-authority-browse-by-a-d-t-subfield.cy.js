import { DEFAULT_JOB_PROFILE_NAMES } from '../../../../support/constants';
import Permissions from '../../../../support/dictionary/permissions';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import InventoryEditMarcRecord from '../../../../support/fragments/inventory/inventoryEditMarcRecord';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import MarcAuthorityBrowse from '../../../../support/fragments/marcAuthority/MarcAuthorityBrowse';
import MarcAuthoritiesSearch from '../../../../support/fragments/marcAuthority/marcAuthoritiesSearch';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('MARC', () => {
  describe('plug-in MARC authority', () => {
    describe('plug-in MARC authority | Browse', () => {
      const testData = {
        createdRecordIDs: [],
        rowIndex100: 27,
        tag100content: 'valueA valueD valueT',
        rowIndex650: 42,
        tag650content: 'valueA valueD valueT',
        rowIndex240: 28,
        tag240content: 'valueA1 valueA2 valueD1 valueD2 valueT1 valueT2',
        filterStateTag100: ['personalNameTitle', 'valueA valueD valueT'],
        filterStateTag650: ['subject', 'valueA valueD valueT'],
        filterStateTag240: ['nameTitle', 'valueA1 valueA2 valueD1 valueD2 valueT1 valueT2'],
      };

      const marcFile = {
        marc: 'marcBibFileForC385657.mrc',
        fileName: `C385657 marcFile${getRandomPostfix()}.mrc`,
        jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
        numOfRecords: 1,
      };

      before('Creating user', () => {
        cy.createTempUser([Permissions.moduleDataImportEnabled.gui]).then((userProperties) => {
          testData.preconditionUserId = userProperties.userId;

          DataImport.uploadFileViaApi(
            marcFile.marc,
            marcFile.fileName,
            marcFile.jobProfileToRun,
          ).then((response) => {
            response.forEach((record) => {
              testData.createdRecordIDs.push(record.instance.id);
            });
          });
        });

        cy.createTempUser([
          Permissions.inventoryAll.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
          Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
        ]).then((userProperties) => {
          testData.user = userProperties;

          cy.login(testData.user.username, testData.user.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
            authRefresh: true,
          });
        });
      });

      after('Deleting created user', () => {
        cy.getAdminToken();
        Users.deleteViaApi(testData.user.userId);
        Users.deleteViaApi(testData.preconditionUserId);
        if (testData.createdRecordIDs[0]) InventoryInstance.deleteInstanceViaApi(testData.createdRecordIDs[0]);
        testData.createdRecordIDs.forEach((id, index) => {
          if (index) MarcAuthority.deleteViaAPI(id);
        });
      });

      it(
        'C385657 "$a", "$d", "$t" subfield values are shown in correct order in pre-populated browse query when linking "MARC bib" record (spitfire) (TaaS)',
        { tags: ['extendedPath', 'spitfire', 'C385657'] },
        () => {
          InventoryInstances.searchByTitle(testData.createdRecordIDs[0]);
          InventoryInstances.selectInstance();
          InventoryInstance.editMarcBibliographicRecord();
          QuickMarcEditor.clickLinkIconInTagField(testData.rowIndex100);
          InventoryInstance.verifySelectMarcAuthorityModal();
          MarcAuthoritiesSearch.verifyFiltersState(
            testData.filterStateTag100[0],
            testData.filterStateTag100[1],
            'Browse',
          );
          MarcAuthorityBrowse.checkResultWithNoValue(testData.tag100content);
          InventoryInstance.closeFindAuthorityModal();
          InventoryEditMarcRecord.checkEditableQuickMarcFormIsOpened();
          QuickMarcEditor.clickLinkIconInTagField(testData.rowIndex650);
          InventoryInstance.verifySelectMarcAuthorityModal();
          MarcAuthoritiesSearch.verifyFiltersState(
            testData.filterStateTag650[0],
            testData.filterStateTag650[1],
            'Browse',
          );
          MarcAuthorityBrowse.checkResultWithNoValue(testData.tag650content);
          InventoryInstance.closeFindAuthorityModal();
          InventoryEditMarcRecord.checkEditableQuickMarcFormIsOpened();
          QuickMarcEditor.clickLinkIconInTagField(testData.rowIndex240);
          InventoryInstance.verifySelectMarcAuthorityModal();
          MarcAuthoritiesSearch.verifyFiltersState(
            testData.filterStateTag240[0],
            testData.filterStateTag240[1],
            'Browse',
          );
          MarcAuthorityBrowse.checkResultWithNoValue(testData.tag240content);
        },
      );
    });
  });
});
