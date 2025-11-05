import {
  DEFAULT_JOB_PROFILE_NAMES,
  INVENTORY_LDR_FIELD_DROPDOWNS_NAMES,
  INVENTORY_LDR_FIELD_STATUS_DROPDOWN,
} from '../../../../support/constants';
import { Permissions } from '../../../../support/dictionary';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Derive MARC bib', () => {
      const testData = {
        marcFile: {
          marc: 'marcBibFileC423434.mrc',
          fileName: `testMarcFileC423434.${getRandomPostfix()}.mrc`,
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
          propertyName: 'instance',
        },
      };

      const createdRecordIDs = [];

      before('Creating data', () => {
        cy.createTempUser([
          Permissions.inventoryAll.gui,
          Permissions.uiQuickMarcQuickMarcEditorDuplicate.gui,
        ]).then((createdUserProperties) => {
          testData.userProperties = createdUserProperties;

          cy.getAdminToken();
          DataImport.uploadFileViaApi(
            testData.marcFile.marc,
            testData.marcFile.fileName,
            testData.marcFile.jobProfileToRun,
          ).then((response) => {
            response.forEach((record) => {
              createdRecordIDs.push(record[testData.marcFile.propertyName].id);
              cy.waitForAuthRefresh(() => {
                cy.login(testData.userProperties.username, testData.userProperties.password, {
                  path: `${TopMenu.inventoryPath}/view/${createdRecordIDs[0]}`,
                  waiter: InventoryInstances.waitContentLoading,
                });
                cy.reload();
                InventoryInstances.waitContentLoading();
              }, 20_000);
            });
          });
        });
      });

      after('Deleting created user and data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(testData.userProperties.userId);
        createdRecordIDs.forEach((recordID) => {
          InventoryInstance.deleteInstanceViaApi(recordID);
        });
      });

      it(
        'C423434 "Save & close" button is disabled by default when deriving new MARC bibliographic record (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C423434'] },
        () => {
          // 2 Click on the "Actions" button → select "Derive new MARC bibliographic record" option
          InventoryInstance.deriveNewMarcBib();

          // Verify "Save & close" button is disabled, "Cancel" button is active
          QuickMarcEditor.checkButtonsDisabled();
          cy.wait(1000);
          // 3 Edit any field, ex.: "LDR" field
          QuickMarcEditor.selectFieldsDropdownOption(
            'LDR',
            INVENTORY_LDR_FIELD_DROPDOWNS_NAMES.STATUS,
            INVENTORY_LDR_FIELD_STATUS_DROPDOWN.A,
          );
          // Verify "Save & close" button became active after field modification
          QuickMarcEditor.checkButtonsEnabled();
        },
      );
    });
  });
});
