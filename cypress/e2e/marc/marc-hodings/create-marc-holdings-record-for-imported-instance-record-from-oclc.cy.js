import { DevTeams, TestTypes, Permissions } from '../../../support/dictionary';
import TopMenu from '../../../support/fragments/topMenu';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';
import InventoryViewSource from '../../../support/fragments/inventory/inventoryViewSource';
import InventoryActions from '../../../support/fragments/inventory/inventoryActions';
import Z3950TargetProfiles from '../../../support/fragments/settings/inventory/integrations/z39.50TargetProfiles';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import Users from '../../../support/fragments/users/users';

describe('MARC -> MARC Holdings', () => {
  let user;
  let instanceHrid;
  const testData = {
    tag852: '852',
    headerTitle: 'Create a new MARC Holdings record',
    oclc: '1007797324',
    OCLCAuthentication: '100481406/PAOLF',
  };

  before('create test data and login', () => {
    cy.getAdminToken();
    Z3950TargetProfiles.changeOclcWorldCatValueViaApi(testData.OCLCAuthentication);
    cy.loginAsAdmin({
      path: TopMenu.inventoryPath,
      waiter: InventoryInstances.waitContentLoading,
    });
    InventoryActions.import(testData.oclc);
    InventoryInstance.getAssignedHRID().then((initialInstanceHrId) => {
      instanceHrid = initialInstanceHrId;
    });

    cy.createTempUser([
      Permissions.inventoryAll.gui,
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
    cy.getAdminToken();
    Users.deleteViaApi(user.userId);
    cy.getInstance({ limit: 1, expandAll: true, query: `"hrid"=="${instanceHrid}"` }).then(
      (instance) => {
        cy.deleteHoldingRecordViaApi(instance.holdings[0].id);
        InventoryInstance.deleteInstanceViaApi(instance.id);
      },
    );
  });

  it(
    'C350756 Create a new "MARC Holdings" record for imported "Instance" record from "OCLC" (spitfire) (TaaS)',
    { tags: [TestTypes.extendedPath, DevTeams.spitfire] },
    () => {
      InventorySearchAndFilter.searchByParameter('Identifier (all)', `(OCoLC)${testData.oclc}`);
      InstanceRecordView.verifyInstancePaneExists();
      InventoryInstance.getAssignedHRID().then((initialInstanceHrId) => {
        instanceHrid = initialInstanceHrId;
      });
      InventoryInstance.checkExpectedMARCSource();
      InventoryInstance.goToMarcHoldingRecordAdding();
      QuickMarcEditor.waitLoading();
      QuickMarcEditor.checkPaneheaderContains(testData.headerTitle);
      QuickMarcEditor.updateExistingField(testData.tag852, QuickMarcEditor.getExistingLocation());
      QuickMarcEditor.pressSaveAndClose();
      QuickMarcEditor.checkAfterSaveHoldings();
      HoldingsRecordView.checkHoldingRecordViewOpened();
      HoldingsRecordView.close();
      InventoryInstance.waitLoading();
      InventoryInstance.openHoldingView();
      HoldingsRecordView.viewSource();
      InventoryViewSource.contains('‡b E');
    },
  );
});
