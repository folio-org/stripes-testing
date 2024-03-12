import uuid from 'uuid';
import { JOB_STATUS_NAMES, LOCATION_NAMES, RECORD_STATUSES } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import Logs from '../../../support/fragments/data_import/logs/logs';
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import ItemRecordNew from '../../../support/fragments/inventory/item/itemRecordNew';
import ItemRecordView from '../../../support/fragments/inventory/item/itemRecordView';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Holdings', () => {
    const testData = {
      createdRecordIDs: [],
      itemBarcode: uuid(),
      itemData: {},
      updatedItemData: {},
      tag866: '866',
      content866: '$8 0 $a v.54-68 (2003-2017) test',
      tag868: '868',
      content868: '$8 0 $a v.1/50 (1950/1999) test',
    };
    const marcFiles = [
      {
        marc: 'oneMarcBib.mrc',
        fileName: `testMarcFileC388511${getRandomPostfix()}.mrc`,
        jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
      },
      {
        marc: 'marcBibFileForC388511.mrc',
        editedFileName: `testMarcFileC388511${getRandomPostfix()}.mrc`,
        fileName: `testMarcFileC388511${getRandomPostfix()}.mrc`,
        jobProfileToRun: 'Default - Create Holdings and SRS MARC Holdings',
      },
    ];

    before('create test data and login', () => {
      cy.getAdminToken().then(() => {
        cy.getLoanTypes({ limit: 1 }).then((res) => {
          testData.loanTypeId = res[0].id;
        });
        cy.getMaterialTypes({ limit: 1 }).then((res) => {
          testData.materialTypeId = res.id;
        });
      });
      cy.loginAsAdmin({ path: TopMenu.dataImportPath, waiter: DataImport.waitLoading });
      DataImport.uploadFileViaApi(
        marcFiles[0].marc,
        marcFiles[0].fileName,
        marcFiles[0].jobProfileToRun,
      );
      JobProfiles.waitFileIsImported(marcFiles[0].fileName);
      Logs.openFileDetails(marcFiles[0].fileName);
      FileDetails.openInstanceInInventory(RECORD_STATUSES.CREATED);
      InventoryInstance.getAssignedHRID().then((initialInstanceHrId) => {
        testData.instanceHrid = initialInstanceHrId;

        // edit marc file adding instance hrid
        DataImport.editMarcFile(
          marcFiles[1].marc,
          marcFiles[1].editedFileName,
          ['in00000000037'],
          [initialInstanceHrId],
        );
        cy.visit(TopMenu.dataImportPath);
        DataImport.uploadFileViaApi(
          marcFiles[1].marc,
          marcFiles[1].fileName,
          marcFiles[1].jobProfileToRun,
        );
        JobProfiles.waitFileIsImported(marcFiles[1].fileName);
        Logs.checkJobStatus(marcFiles[1].fileName, JOB_STATUS_NAMES.COMPLETED);
        Logs.openFileDetails(marcFiles[1].fileName);
        Logs.getCreatedItemsID().then((link) => {
          testData.createdRecordIDs.push(link.split('/')[5]);

          cy.getHoldings({
            limit: 1,
            query: `"instanceId"="${testData.createdRecordIDs[0]}"`,
          }).then((holdings) => {
            testData.holdingsId = holdings[0].id;
          });
        });
      });
      cy.logout();

      cy.createTempUser([
        Permissions.uiQuickMarcQuickMarcHoldingsEditorAll.gui,
        Permissions.inventoryAll.gui,
      ]).then((userProperties) => {
        testData.user = userProperties;

        ItemRecordNew.createViaApi({
          holdingsId: testData.holdingsId,
          itemBarcode: testData.itemBarcode,
          materialTypeId: testData.materialTypeId,
          permanentLoanTypeId: testData.loanTypeId,
        });

        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
        InventoryInstances.searchByTitle(testData.createdRecordIDs[0]);
        InventoryInstances.selectInstance();
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(testData.user.userId);
      InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(testData.itemBarcode);
      FileManager.deleteFile(`cypress/fixtures/${marcFiles[1].editedFileName}`);
    });

    it(
      'C388511 Item metadata updates when Holdings fields not related to Item are changed (MARC record) (spitfire) (TaaS)',
      { tags: ['extendedPath', 'spitfire'] },
      () => {
        InventoryInstance.openHoldingView();
        HoldingsRecordView.editInQuickMarc();
        QuickMarcEditor.waitLoading();
        QuickMarcEditor.updateExistingField(testData.tag866, testData.content866);
        QuickMarcEditor.updateExistingField(testData.tag868, testData.content868);
        QuickMarcEditor.pressSaveAndClose();
        HoldingsRecordView.getRecordLastUpdatedDate().then((date) => {
          const holdingsUpdateDate = date;

          HoldingsRecordView.close();
          InventoryInstance.openHoldingsAccordion(`${LOCATION_NAMES.ANNEX_UI} >`);
          InventoryInstance.openItemByBarcode(testData.itemBarcode);
          cy.getItems({ query: `"barcode"=="${testData.itemBarcode}"` }).then((item) => {
            testData.updatedItemData = item;

            ItemRecordView.waitLoading();
            ItemRecordView.verifyItemMetadata(
              holdingsUpdateDate,
              testData.updatedItemData.metadata,
              testData.user.userId,
            );
          });
          ItemRecordView.verifyLastUpdatedDate(holdingsUpdateDate, testData.user.username);
        });
      },
    );
  });
});
