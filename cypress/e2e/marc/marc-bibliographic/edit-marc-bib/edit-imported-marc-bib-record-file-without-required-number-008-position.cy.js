import {
  DEFAULT_JOB_PROFILE_NAMES,
  RECORD_STATUSES,
  INVENTORY_008_FIELD_CONF_DROPDOWN,
  INVENTORY_008_FIELD_REGL_DROPDOWN,
  INVENTORY_008_FIELD_DTST_DROPDOWN,
  INVENTORY_008_FIELD_S_L_DROPDOWN,
  INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES,
} from '../../../../support/constants';
import Permissions from '../../../../support/dictionary/permissions';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import Logs from '../../../../support/fragments/data_import/logs/logs';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Edit MARC bib', () => {
      const testData = {
        createdRecordIDs: [],
      };

      const marcFile = {
        marc: 'marcBibFileForC387455.mrc',
        fileName: `testMarcFileC387455.${getRandomPostfix()}.mrc`,
        jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
        numOfRecords: 2,
        propertyName: 'instance',
      };

      const firstInstanceTitle = 'Extra 008 positions Vanity fair.';
      const secondInstanceTitle = 'Too few 008 positions Vanity fair.';

      before('Create user and data', () => {
        cy.createTempUser([
          Permissions.inventoryAll.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
          Permissions.moduleDataImportEnabled.gui,
        ]).then((createdUserProperties) => {
          testData.userProperties = createdUserProperties;

          cy.getAdminToken();
          DataImport.uploadFileViaApi(
            marcFile.marc,
            marcFile.fileName,
            marcFile.jobProfileToRun,
          ).then((response) => {
            response.forEach((record) => {
              testData.createdRecordIDs.push(record[marcFile.propertyName].id);
            });
          });
          cy.waitForAuthRefresh(() => {
            cy.login(testData.userProperties.username, testData.userProperties.password, {
              path: TopMenu.dataImportPath,
              waiter: DataImport.waitLoading,
            });
            cy.reload();
            DataImport.waitLoading();
          }, 20_000);
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(testData.userProperties.userId);
      });

      it(
        'C387455 User can edit imported "MARC Bib" file without required number (40) of "008" positions (spitfire) (TaaS)',
        { tags: ['extendedPath', 'spitfire', 'C387455'] },
        () => {
          Logs.openFileDetails(marcFile.fileName);
          for (let i = 0; i < marcFile.numOfRecords; i++) {
            Logs.getCreatedItemsID(i).then((link) => {
              testData.createdRecordIDs.push(link.split('/')[5]);
            });
          }
          Logs.verifyInstanceStatus(0, 2);
          Logs.verifyInstanceStatus(1, 2);

          Logs.clickOnHotLink(0, 3, RECORD_STATUSES.CREATED);
          InventoryInstance.verifyInstanceTitle(firstInstanceTitle);
          InventoryInstance.editMarcBibliographicRecord();

          QuickMarcEditor.selectFieldsDropdownOption(
            '008',
            INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.CONF,
            INVENTORY_008_FIELD_CONF_DROPDOWN.ONE,
          );
          QuickMarcEditor.updateExistingFieldContent(7);
          QuickMarcEditor.pressSaveAndClose();
          QuickMarcEditor.checkAfterSaveAndClose();

          TopMenuNavigation.navigateToApp('Data import');
          Logs.verifyInstanceStatus(0, 2);
          Logs.verifyInstanceStatus(1, 2);

          Logs.clickOnHotLink(1, 3, RECORD_STATUSES.CREATED);
          InventoryInstance.verifyInstanceTitle(secondInstanceTitle);
          InventoryInstance.editMarcBibliographicRecord();

          QuickMarcEditor.selectFieldsDropdownOption(
            '008',
            INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.REGL,
            INVENTORY_008_FIELD_REGL_DROPDOWN.R,
          );
          QuickMarcEditor.selectFieldsDropdownOption(
            '008',
            INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.DTST,
            INVENTORY_008_FIELD_DTST_DROPDOWN.C,
          );
          QuickMarcEditor.selectFieldsDropdownOption(
            '008',
            INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.CONF,
            INVENTORY_008_FIELD_CONF_DROPDOWN.ONE,
          );
          QuickMarcEditor.selectFieldsDropdownOption(
            '008',
            INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.SL,
            INVENTORY_008_FIELD_S_L_DROPDOWN[2],
          );
          QuickMarcEditor.updateExistingFieldContent(7);
          QuickMarcEditor.pressSaveAndClose();
          QuickMarcEditor.checkAfterSaveAndClose();
        },
      );
    });
  });
});
