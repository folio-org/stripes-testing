import { Permissions } from '../../../support/dictionary';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';

describe('MARC', () => {
  describe('MARC Holdings', () => {
    describe('Create MARC holdings', () => {
      const testData = {
        instanceTitle: `AT_C399100_MarcBibInstance_${getRandomPostfix()}`,
        tag008: '008',
        tag852: '852',
      };
      let createdInstanceId;
      let user;
      let locationCode;

      before('Creating data', () => {
        cy.getAdminToken();
        cy.createTempUser([
          Permissions.inventoryAll.gui,
          Permissions.uiQuickMarcQuickMarcHoldingsEditorCreate.gui,
          Permissions.uiQuickMarcQuickMarcHoldingsEditorAll.gui,
        ]).then((createdUserProperties) => {
          user = createdUserProperties;
          cy.createSimpleMarcBibViaAPI(testData.instanceTitle).then((instanceId) => {
            createdInstanceId = instanceId;
            cy.login(user.username, user.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
              authRefresh: true,
            });
          });
          cy.getLocations({ limit: 2, query: '(name<>"*autotest*" and name<>"AT_*")' }).then(
            (location) => {
              locationCode = location.code;
            },
          );
        });
      });

      after('Deleting user, data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(user.userId);
        InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(createdInstanceId);
      });

      it(
        'C399100 Cannot update MARC bib with more or less than 4 characters in "Date 1" and "Date 2" fields (spitfire)',
        { tags: ['criticalPath', 'spitfire', 'C399100'] },
        () => {
          InventoryInstances.searchByTitle(createdInstanceId);
          InventoryInstances.selectInstanceById(createdInstanceId);
          InventoryInstance.waitLoading();

          InventoryInstance.goToMarcHoldingRecordAdding();
          QuickMarcEditor.checkContentByTag(testData.tag852, '');
          QuickMarcEditor.checkSubfieldsPresenceInTag008();

          QuickMarcEditor.pressCancel();
          InventoryInstance.waitLoading();
          InventoryInstance.verifyHoldingsAbsent('');

          InventoryInstance.goToMarcHoldingRecordAdding();
          QuickMarcEditor.checkContentByTag(testData.tag852, '');
          QuickMarcEditor.checkSubfieldsPresenceInTag008();
          QuickMarcEditor.updateExistingField(testData.tag852, `$b ${locationCode}`);
          QuickMarcEditor.checkContentByTag(testData.tag852, `$b ${locationCode}`);
          QuickMarcEditor.updateIndicatorValue(testData.tag852, '', 0);
          QuickMarcEditor.updateIndicatorValue(testData.tag852, '', 1);

          QuickMarcEditor.pressSaveAndClose();
          HoldingsRecordView.waitLoading();

          HoldingsRecordView.editInQuickMarc();
          QuickMarcEditor.waitLoading();
          QuickMarcEditor.verifyIndicatorValue(testData.tag852, '\\', 0);
          QuickMarcEditor.verifyIndicatorValue(testData.tag852, '\\', 1);
        },
      );
    });
  });
});
