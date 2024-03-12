import { calloutTypes } from '../../../../interactors';
import { Permissions } from '../../../support/dictionary';
import DataImport from '../../../support/fragments/data_import/dataImport';
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import NewLocation from '../../../support/fragments/settings/tenant/locations/newLocation';
import ServicePoints from '../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import InteractorsTools from '../../../support/utils/interactorsTools';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Holdings', () => {
    let user;
    const testData = {
      headerTitle: 'Create a new MARC Holdings record',
      headerSubtitle: 'New',
    };
    const marcFile = {
      marc: 'oneMarcBib.mrc',
      fileName: `testMarcFileC375206${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
      propertyName: 'relatedInstanceInfo',
    };

    before('create test data and login', () => {
      cy.getAdminToken().then(() => {
        ServicePoints.getViaApi({ limit: 1, query: 'name=="Circ Desk 1"' }).then((servicePoint) => {
          testData.servicePointId = servicePoint[0].id;
          NewLocation.createViaApi(NewLocation.getDefaultLocation(testData.servicePointId)).then(
            (res) => {
              testData.location = res;
            },
          );
        });
      });

      cy.getAdminToken();
      DataImport.uploadFileViaApi(marcFile.marc, marcFile.fileName, marcFile.jobProfileToRun).then(
        (response) => {
          response.entries.forEach((record) => {
            testData.instanceID = record[marcFile.propertyName].idList[0];
          });
        },
      );

      cy.createTempUser([
        Permissions.inventoryAll.gui,
        Permissions.uiQuickMarcQuickMarcHoldingsEditorAll.gui,
        Permissions.uiQuickMarcQuickMarcHoldingsEditorCreate.gui,
      ]).then((userProperties) => {
        user = userProperties;

        cy.login(user.username, user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
      });
    });

    after('delete test data', () => {
      cy.getAdminToken().then(() => {
        cy.getInstance({
          limit: 1,
          expandAll: true,
          query: `"hrid"=="${testData.instanceHrid}"`,
        }).then((instance) => {
          cy.deleteHoldingRecordViaApi(instance.holdings[0].id);
          InventoryInstance.deleteInstanceViaApi(instance.id);
        });
        Users.deleteViaApi(user.userId);
      });
    });

    it(
      'C375206 Error notifications shown before modals when creating "MARC holdings" record (spitfire) (TaaS)',
      { tags: ['extendedPath', 'spitfire'] },
      () => {
        const calloutLDRMessage =
          'Record cannot be saved. The Leader must contain 24 characters, including null spaces.';
        const calloutTagMessage =
          'Record cannot be saved. A MARC tag must contain three characters.';

        InventorySearchAndFilter.searchInstanceByTitle(testData.instanceID);
        InstanceRecordView.verifyInstancePaneExists();
        InventoryInstance.getAssignedHRID().then((initialInstanceHrId) => {
          testData.instanceHrid = initialInstanceHrId;
        });
        InventoryInstance.goToMarcHoldingRecordAdding();
        QuickMarcEditor.waitLoading();
        QuickMarcEditor.checkPaneheaderContains(testData.headerTitle);
        QuickMarcEditor.checkPaneheaderContains(testData.headerSubtitle);
        QuickMarcEditor.selectExistingHoldingsLocation(testData.location);
        QuickMarcEditor.checkContent(`$b ${testData.location.code} `, 5);
        QuickMarcEditor.addNewField('040', '$a test', 5);
        QuickMarcEditor.checkContent('$a test', 6);
        QuickMarcEditor.addNewField('0', '$a test2', 6);
        QuickMarcEditor.checkContent('$a test2', 7);
        QuickMarcEditor.deleteFieldAndCheck(6, '040');
        QuickMarcEditor.updateLDRvalueByPosition(23, '');
        QuickMarcEditor.pressSaveAndClose();
        InteractorsTools.checkCalloutMessage(calloutLDRMessage, calloutTypes.error);
        InteractorsTools.closeCalloutMessage();
        QuickMarcEditor.waitLoading();
        QuickMarcEditor.checkPaneheaderContains(testData.headerTitle);
        QuickMarcEditor.updateExistingField('LDR', '00000nu\\\\\\2200000un\\4500');
        QuickMarcEditor.pressSaveAndClose();
        InteractorsTools.checkCalloutMessage(calloutTagMessage, calloutTypes.error);
        InteractorsTools.closeCalloutMessage();
        QuickMarcEditor.waitLoading();
        QuickMarcEditor.checkPaneheaderContains(testData.headerTitle);
        QuickMarcEditor.updateExistingTagName('0', '041');
        QuickMarcEditor.checkFieldsExist(['041']);
        QuickMarcEditor.pressSaveAndClose();
        QuickMarcEditor.checkAfterSaveHoldings();
        HoldingsRecordView.checkHoldingRecordViewOpened();
      },
    );
  });
});
