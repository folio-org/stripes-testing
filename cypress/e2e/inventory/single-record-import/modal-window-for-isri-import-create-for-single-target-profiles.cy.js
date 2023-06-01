import TestTypes from '../../../support/dictionary/testTypes';
import DevTeams from '../../../support/dictionary/devTeams';
import permissions from '../../../support/dictionary/permissions';
import Z3950TargetProfiles from '../../../support/fragments/settings/inventory/integrations/z39.50TargetProfiles';
import TopMenu from '../../../support/fragments/topMenu';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventoryActions from '../../../support/fragments/inventory/inventoryActions';
import InventoryModals from '../../../support/fragments/inventory/inventoryModals';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import Users from '../../../support/fragments/users/users';

describe('ui-inventory', () => {
  let user;
  let instanceHRID;
  const profileForImport = 'Inventory Single Record - Default Create Instance (Default)';
  const testIdentifier = '1234567';
  const instanceTitle = 'The Gospel according to Saint Mark : Evangelistib Markusib aglangit.';

  before('login', () => {
    cy.createTempUser([
      permissions.inventoryAll.gui,
      permissions.uiInventorySingleRecordImport.gui,
      permissions.settingsDataImportEnabled.gui
    ])
      .then(userProperties => {
        user = userProperties;

        Z3950TargetProfiles.changeOclcWorldCatValueViaApi('100473910/PAOLF');

        cy.login(user.username, user.password,
          { path: TopMenu.inventoryPath, waiter: InventoryInstances.waitContentLoading });
      });
  });

  after('delete test data', () => {
    Users.deleteViaApi(user.userId);
    cy.getInstance({ limit: 1, expandAll: true, query: `"hrid"=="${instanceHRID}"` })
      .then((instance) => {
        InventoryInstance.deleteInstanceViaApi(instance.id);
      });
  });

  it('C375145 Verify the modal window for ISRI Import/Create in inventory main actions menu for single target profiles (folijet)',
    { tags: [TestTypes.criticalPath, DevTeams.folijet] }, () => {
      InventoryActions.openSingleReportImportModal();
      InventoryModals.verifyInventorySingleRecordModalWithOneTargetProfile();
      InventoryModals.verifySelectTheProfileToBeUsedField(profileForImport);
      InventoryModals.selectTheProfileToBeUsed(profileForImport);
      InventoryModals.fillEnterTestIdentifier(testIdentifier);
      InventoryModals.import();
      InstanceRecordView.verivyCalloutMessage(testIdentifier);
      // need to wait because after the import the data in the instance is displayed for a long time
      // https://issues.folio.org/browse/MODCPCT-73
      cy.wait(10000);
      InstanceRecordView.verifyIsInstanceOpened(instanceTitle);
      InstanceRecordView.getAssignedHRID().then(initialInstanceHrId => {
        instanceHRID = initialInstanceHrId;
      });
    });
});
