import { DEFAULT_JOB_PROFILE_NAMES } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import DataImport from '../../../support/fragments/data_import/dataImport';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryViewSource from '../../../support/fragments/inventory/inventoryViewSource';

describe('Data Import', () => {
  describe('Importing MARC Holdings files', () => {
    const randomPostfix = getRandomPostfix();
    const instanceTitle = `AT_C350394_MarcBibInstance_${randomPostfix}`;
    const holdingsFileName = 'marcFileForC350394.mrc';
    const editedMarcFileName = `AT_C350394_MarcHoldingsFile${randomPostfix}.mrc`;
    const tags = {
      tag008: '008',
      tag852: '852',
    };
    const hridSearchOption = 'Instance HRID';
    const locationName = 'Online';
    const updatedTag852Content = '$b E $h 123';
    const boxToEdit = 'Sep/comp';
    const tag008ContentRegExp = /\d{6}\s{26}/;
    let user;
    let instanceHrid;
    let instanceUuid;

    before('Create test data and login', () => {
      cy.createTempUser([
        Permissions.inventoryAll.gui,
        Permissions.moduleDataImportEnabled.gui,
        Permissions.uiQuickMarcQuickMarcBibliographicEditorView.gui,
        Permissions.uiQuickMarcQuickMarcHoldingsEditorAll.gui,
      ]).then((userProperties) => {
        user = userProperties;

        cy.createSimpleMarcBibViaAPI(instanceTitle).then((instanceId) => {
          instanceUuid = instanceId;

          cy.getInstanceById(instanceId).then((instanceData) => {
            instanceHrid = instanceData.hrid;

            DataImport.editMarcFile(
              holdingsFileName,
              editedMarcFileName,
              ['hrid_placeholder1'],
              [instanceHrid],
            );

            cy.getToken(user.username, user.password);
            DataImport.uploadFileViaApi(
              editedMarcFileName,
              editedMarcFileName,
              DEFAULT_JOB_PROFILE_NAMES.CREATE_HOLDINGS_AND_SRS,
            );

            cy.login(user.username, user.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
              authRefresh: true,
            });
          });
        });
      });
    });

    after('Delete test data', () => {
      FileManager.deleteFile(`cypress/fixtures/${editedMarcFileName}`);
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
      InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(instanceUuid);
    });

    it(
      "C350394 Edit MARC 008 tag (imported marc holdings record doesn't have this tag) (spitfire)",
      { tags: ['extendedPath', 'spitfire', 'C350394'] },
      () => {
        InventorySearchAndFilter.searchByParameter(hridSearchOption, instanceHrid);
        InventoryInstance.waitLoading();
        InventoryInstance.checkHoldingTitle({ title: locationName });

        InventoryInstance.openHoldingView();
        HoldingsRecordView.waitLoading();

        HoldingsRecordView.editInQuickMarc();
        QuickMarcEditor.waitLoading();

        QuickMarcEditor.updateExistingField(tags.tag852, updatedTag852Content);
        QuickMarcEditor.pressSaveAndCloseButton();
        QuickMarcEditor.checkDelete008Callout();

        QuickMarcEditor.addNewField(tags.tag008, '', 3);
        QuickMarcEditor.checkFieldsExist([tags.tag008]);
        QuickMarcEditor.pressSaveAndClose();
        HoldingsRecordView.waitLoading();

        HoldingsRecordView.editInQuickMarc();
        QuickMarcEditor.waitLoading();
        QuickMarcEditor.check008FieldsEmptyHoldings();

        QuickMarcEditor.fillInTextBoxInField(tags.tag008, boxToEdit, '');
        QuickMarcEditor.verifyTextBoxValueInField(tags.tag008, boxToEdit, '');
        QuickMarcEditor.pressSaveAndClose();
        HoldingsRecordView.waitLoading();

        HoldingsRecordView.viewSource();
        InventoryViewSource.checkFieldContentMatch(tags.tag008, tag008ContentRegExp);
      },
    );
  });
});
