import { APPLICATION_NAMES, INSTANCE_SOURCE_NAMES } from '../../../support/constants';
import HoldingsRecordView, {
  actionsMenuOptions,
} from '../../../support/fragments/inventory/holdingsRecordView';
import InventoryActions from '../../../support/fragments/inventory/inventoryActions';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventoryNewHoldings from '../../../support/fragments/inventory/inventoryNewHoldings';
import InventorySteps from '../../../support/fragments/inventory/inventorySteps';
import InventoryViewSource from '../../../support/fragments/inventory/inventoryViewSource';
import QuickmarcEditor from '../../../support/fragments/quickMarcEditor';
import Z3950TargetProfiles from '../../../support/fragments/settings/inventory/integrations/z39.50TargetProfiles';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import { parseSanityParameters } from '../../../support/utils/users';

describe('MARC', () => {
  describe('MARC Holdings', () => {
    const { user, memberTenant } = parseSanityParameters();
    const OCLCAuthentication = '100481406/PAOLF';
    let instanceId = null;
    let initialHoldingsRecordId = null;
    let newHoldingsRecordId = null;

    before('Setup', () => {
      cy.setTenant(memberTenant.id);
      cy.getUserToken(user.username, user.password, { log: false }).then(() => {
        Z3950TargetProfiles.changeOclcWorldCatValueViaApi(OCLCAuthentication);
      });

      cy.allure().logCommandSteps(false);
      cy.login(user.username, user.password);
      cy.allure().logCommandSteps();
      TopMenuNavigation.openAppFromDropdown(APPLICATION_NAMES.INVENTORY);
      InventoryInstances.waitContentLoading();
      InventoryActions.import();
      InventoryInstance.getId().then((id) => {
        instanceId = id;
      });
      InventorySteps.addMarcHoldingRecord();
    });

    after('Cleanup', () => {
      cy.setTenant(memberTenant.id);
      cy.getUserToken(user.username, user.password, { log: false });

      if (newHoldingsRecordId) {
        cy.deleteHoldingRecordViaApi(newHoldingsRecordId);
      }
      if (initialHoldingsRecordId) {
        cy.deleteHoldingRecordViaApi(initialHoldingsRecordId);
      }
      if (instanceId) {
        InventoryInstance.deleteInstanceViaApi(instanceId);
      }
    });

    it(
      'C345409 MARC instance record + MARC holdings record (spitfire)',
      { tags: ['dryRun', 'spitfire', 'C345409'] },
      () => {
        cy.wait(10000);
        HoldingsRecordView.getId().then((initialHoldindsRecordId) => {
          initialHoldingsRecordId = initialHoldindsRecordId;
          HoldingsRecordView.checkSource(INSTANCE_SOURCE_NAMES.MARC);
          HoldingsRecordView.close();
          InventoryInstance.openHoldingView();
          HoldingsRecordView.validateOptionInActionsMenu([
            { optionName: actionsMenuOptions.viewSource, shouldExist: true },
            { optionName: actionsMenuOptions.editMarcBibliographicRecord, shouldExist: true },
          ]);
          HoldingsRecordView.tryToDelete();
          HoldingsRecordView.viewSource();
          InventoryViewSource.close();
          HoldingsRecordView.editInQuickMarc();
          QuickmarcEditor.waitLoading();
          QuickmarcEditor.closeWithoutSaving();
          HoldingsRecordView.duplicate();
          InventoryNewHoldings.checkSource();
          InventoryNewHoldings.saveAndClose();
          HoldingsRecordView.waitLoading();
          HoldingsRecordView.getId().then((newHoldindsRecordId) => {
            newHoldingsRecordId = newHoldindsRecordId;
            HoldingsRecordView.close();
            InventoryInstance.waitLoading();
            InventoryInstance.checkAddItem(initialHoldingsRecordId);
            InventoryInstance.checkAddItem(newHoldingsRecordId);
          });
        });
      },
    );
  });
});
