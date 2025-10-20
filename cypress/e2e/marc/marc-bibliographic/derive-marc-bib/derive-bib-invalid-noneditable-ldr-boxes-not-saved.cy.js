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
    describe('Derive MARC bib', () => {
      const testData = {
        instanceTitle: 'AT_C354283_MarcBibInstance',
        tag245: '245',
        invalidLDRValuesInEdit: ['a11', '3333'],
        defaultLDRValuesInView: ['a22', '4500'],
      };

      const updatedTitle = `${testData.instanceTitle}_upd`;

      const marcFile = {
        marc: 'marcBibFileC354283.mrc',
        fileName: `C354283.testMarcFile.${getRandomPostfix()}.mrc`,
      };

      const jobProfileToRun = DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS;

      const createdInstanceIds = [];

      before(() => {
        cy.getAdminToken();
        cy.createTempUser([
          Permissions.inventoryAll.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
          Permissions.uiQuickMarcQuickMarcEditorDuplicate.gui,
        ]).then((createdUserProperties) => {
          testData.userProperties = createdUserProperties;

          DataImport.uploadFileViaApi(marcFile.marc, marcFile.fileName, jobProfileToRun).then(
            (response) => {
              createdInstanceIds.push(response[0].instance.id);

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
        InventoryInstances.deleteInstanceByTitleViaApi(testData.instanceTitle);
      });

      it(
        'C354283 Verify that invalid values at 10, 11, 20-23 positions of "LDR" field change to valid when user derive "MARC Bibliographic" record. (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C354283'] },
        () => {
          InventoryInstances.searchByTitle(createdInstanceIds[0]);
          InventoryInstances.selectInstanceById(createdInstanceIds[0]);
          InventoryInstance.waitLoading();
          InventoryInstance.deriveNewMarcBibRecord();

          QuickMarcEditor.verifyValuesInLdrNonEditableBoxes({
            positions9to16BoxValues: including(testData.invalidLDRValuesInEdit[0]),
            positions20to23BoxValues: testData.invalidLDRValuesInEdit[1],
          });

          QuickMarcEditor.updateExistingField(testData.tag245, `$a ${updatedTitle}`);
          QuickMarcEditor.checkButtonsEnabled();

          QuickMarcEditor.pressSaveAndClose();
          QuickMarcEditor.checkAfterSaveAndCloseDerive();
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
