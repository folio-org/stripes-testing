import moment from 'moment';
import { including } from '@interactors/html';
import Permissions from '../../../support/dictionary/permissions';
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
        user: {},
        marcTitle: `AT_C916266_MarcBibInstance_${getRandomPostfix()}`,
        tag005: '005',
        tag333: '333',
        tag852: '852',
      };

      let createdInstanceId;
      let locationCode;

      before('Create test data', () => {
        cy.getAdminToken();
        cy.createTempUser([
          Permissions.uiInventoryViewInstances.gui,
          Permissions.uiInventoryViewCreateEditHoldings.gui,
          Permissions.uiQuickMarcQuickMarcHoldingsEditorCreate.gui,
          Permissions.uiQuickMarcQuickMarcHoldingsEditorAll.gui,
        ]).then((userProperties) => {
          testData.user = userProperties;

          cy.createSimpleMarcBibViaAPI(testData.marcTitle).then((instanceId) => {
            createdInstanceId = instanceId;
          });
          cy.getLocations({
            limit: 1,
            query: '(isActive=true and name<>"AT_*" and name<>"*auto*")',
          }).then((res) => {
            locationCode = res.code;
          });

          cy.login(testData.user.username, testData.user.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          });
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(testData.user.userId);
        InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(createdInstanceId);
      });

      it(
        'C916266 Create MARC holdings record without "005" field (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C916266'] },
        () => {
          InventoryInstances.searchByTitle(createdInstanceId);
          InventoryInstances.selectInstanceById(createdInstanceId);
          InventoryInstance.waitLoading();

          InventoryInstance.goToMarcHoldingRecordAdding();
          QuickMarcEditor.waitLoading();

          QuickMarcEditor.updateExistingField(testData.tag852, `$b ${locationCode}`);
          QuickMarcEditor.checkContentByTag(testData.tag852, `$b ${locationCode}`);

          QuickMarcEditor.updateExistingTagName(testData.tag005, testData.tag333);
          QuickMarcEditor.verifyTagValue(2, testData.tag333);
          QuickMarcEditor.checkTagAbsent(testData.tag005);
          QuickMarcEditor.verifyEditableFieldIcons(2, false, true, true);

          QuickMarcEditor.deleteFieldByTagAndCheck(testData.tag333);
          QuickMarcEditor.checkTagAbsent(testData.tag005);

          QuickMarcEditor.pressSaveAndCloseButton();
          QuickMarcEditor.checkDeleteModal(1);
          QuickMarcEditor.confirmDelete();
          HoldingsRecordView.waitLoading();

          HoldingsRecordView.editInQuickMarc();
          QuickMarcEditor.waitLoading();
          QuickMarcEditor.checkContentByTag(
            testData.tag005,
            including(moment().format('YYYYMMDD')),
          );
        },
      );
    });
  });
});
