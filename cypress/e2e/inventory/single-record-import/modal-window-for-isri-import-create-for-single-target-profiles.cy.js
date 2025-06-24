import { Permissions } from '../../../support/dictionary';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import InventoryActions from '../../../support/fragments/inventory/inventoryActions';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import SingleRecordImportModal from '../../../support/fragments/inventory/singleRecordImportModal';
import Z3950TargetProfiles from '../../../support/fragments/settings/inventory/integrations/z39.50TargetProfiles';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';

describe('Inventory', () => {
  describe('Single record import', () => {
    let user;
    let instanceHRID;
    const OCLCAuthentication = '100481406/PAOLF';
    const profileForImport = 'Inventory Single Record - Default Create Instance (Default)';
    const testIdentifier = '1234567';
    const instanceTitle = 'The Gospel according to Saint Mark : Evangelistib Markusib aglangit.';

    before('Create test user and login', () => {
      cy.createTempUser([
        Permissions.inventoryAll.gui,
        Permissions.uiInventorySingleRecordImport.gui,
        Permissions.settingsDataImportEnabled.gui,
      ]).then((userProperties) => {
        user = userProperties;

        Z3950TargetProfiles.changeOclcWorldCatValueViaApi(OCLCAuthentication, false);

        cy.login(user.username, user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken().then(() => {
        Z3950TargetProfiles.changeOclcWorldCatValueViaApi(OCLCAuthentication);
        Users.deleteViaApi(user.userId);
        cy.getInstance({ limit: 1, expandAll: true, query: `"hrid"=="${instanceHRID}"` }).then(
          (instance) => {
            InventoryInstance.deleteInstanceViaApi(instance.id);
          },
        );
      });
    });

    it(
      'C375145 Verify the modal window for ISRI Import/Create in inventory main actions menu for single target profiles (folijet)',
      { tags: ['criticalPath', 'folijet', 'C375145'] },
      () => {
        const calloutMessage = `Record ${testIdentifier} created. Results may take a few moments to become visible in Inventory`;

        InventoryActions.openSingleReportImportModal();
        SingleRecordImportModal.verifyInventorySingleRecordModalWithOneTargetProfile();
        SingleRecordImportModal.verifySelectTheProfileToBeUsedField(profileForImport);
        SingleRecordImportModal.selectTheProfileToBeUsed(profileForImport);
        SingleRecordImportModal.fillEnterTestIdentifier(testIdentifier);
        SingleRecordImportModal.import();
        InstanceRecordView.verifyCalloutMessage(calloutMessage);
        // need to wait because after the import the data in the instance is displayed for a long time
        // https://issues.folio.org/browse/MODCPCT-73
        cy.wait(15000);
        InstanceRecordView.verifyInstanceIsOpened(instanceTitle);
        InstanceRecordView.getAssignedHRID().then((initialInstanceHrId) => {
          instanceHRID = initialInstanceHrId;
        });
      },
    );
  });
});
