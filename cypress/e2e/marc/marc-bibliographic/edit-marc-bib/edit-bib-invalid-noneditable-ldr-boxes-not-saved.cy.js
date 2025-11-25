import Permissions from '../../../../support/dictionary/permissions';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';
import { DEFAULT_JOB_PROFILE_NAMES } from '../../../../support/constants';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import InventoryViewSource from '../../../../support/fragments/inventory/inventoryViewSource';
import { including } from '../../../../../interactors';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Edit MARC bib', () => {
      const testData = {
        instanceTitle: 'AT_C353982_MarcBibInstance',
        tag245: '245',
        invalidLDRValuesInEdit: ['a11', '3333'],
        defaultLDRValuesInView: ['a22', '4500'],
      };

      const updatedTitle = `${testData.instanceTitle}_upd`;

      const marcFile = {
        marc: 'marcBibFileC353982.mrc',
        fileName: `C353982.testMarcFile.${getRandomPostfix()}.mrc`,
      };

      const jobProfileToRun = DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS;

      let createdInstanceId;

      before(() => {
        cy.getAdminToken();
        cy.createTempUser([
          Permissions.inventoryAll.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
        ]).then((createdUserProperties) => {
          testData.userProperties = createdUserProperties;

          DataImport.uploadFileViaApi(marcFile.marc, marcFile.fileName, jobProfileToRun).then(
            (response) => {
              createdInstanceId = response[0].instance.id;

              cy.waitForAuthRefresh(() => {
                cy.login(testData.userProperties.username, testData.userProperties.password, {
                  path: TopMenu.inventoryPath,
                  waiter: InventoryInstances.waitContentLoading,
                });
              }, 20_000);
            },
          );
        });
      });

      after('Deleting created user', () => {
        cy.getAdminToken();
        Users.deleteViaApi(testData.userProperties.userId);
        InventoryInstance.deleteInstanceViaApi(createdInstanceId);
      });

      it(
        'C353982 Verify that invalid values at 10, 11, 20-23 positions of "LDR" field change to valid when user edit "MARC Bibliographic" record. (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C353982'] },
        () => {
          InventoryInstances.searchByTitle(createdInstanceId);
          InventoryInstances.selectInstanceById(createdInstanceId);
          InventoryInstance.waitLoading();
          InventoryInstance.editMarcBibliographicRecord();

          QuickMarcEditor.verifyValuesInLdrNonEditableBoxes({
            positions9to16BoxValues: including(testData.invalidLDRValuesInEdit[0]),
            positions20to23BoxValues: testData.invalidLDRValuesInEdit[1],
          });

          QuickMarcEditor.updateExistingField(testData.tag245, `$a ${updatedTitle}`);
          QuickMarcEditor.checkButtonsEnabled();

          QuickMarcEditor.pressSaveAndClose();
          QuickMarcEditor.checkAfterSaveAndClose();
          InventoryInstance.verifyInstanceTitle(updatedTitle);

          InventoryInstance.viewSource();
          testData.defaultLDRValuesInView.forEach((defaultValue) => {
            InventoryViewSource.contains(defaultValue);
          });
        },
      );
    });
  });
});
