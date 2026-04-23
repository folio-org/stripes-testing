import InstanceRecordView from '../../../../support/fragments/inventory/instanceRecordView';
import InventoryActions from '../../../../support/fragments/inventory/inventoryActions';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import SingleRecordImportModal from '../../../../support/fragments/inventory/singleRecordImportModal';
import Z3950TargetProfiles from '../../../../support/fragments/settings/inventory/integrations/z39.50TargetProfiles';
import TopMenu from '../../../../support/fragments/topMenu';
import { parseSanityParameters } from '../../../../support/utils/users';

const { user, memberTenant } = parseSanityParameters();

describe('Inventory', () => {
  describe('Single record import', () => {
    let instanceHRID;
    const OCLCAuthentication = '100481406/PAOLF';
    const profileForImport = 'Inventory Single Record - Default Create Instance (Default)';
    const testIdentifier = '1234567';
    const instanceTitle = 'The Gospel according to Saint Mark : Evangelistib Markusib aglangit.';

    before('Create test user and login', () => {
      cy.setTenant(memberTenant.id);
      cy.allure().logCommandSteps(false);
      cy.getUserToken(user.username, user.password);
      Z3950TargetProfiles.changeOclcWorldCatValueViaApi(OCLCAuthentication, false);

      cy.allure().logCommandSteps(false);
      cy.login(user.username, user.password, {
        path: TopMenu.inventoryPath,
        waiter: InventoryInstances.waitContentLoading,
      });
      cy.allure().logCommandSteps(true);
    });

    after('Delete test data', () => {
      cy.setTenant(memberTenant.id);
      cy.allure().logCommandSteps(false);
      cy.getUserToken(user.username, user.password);
      cy.getInstance({ limit: 1, expandAll: true, query: `"hrid"=="${instanceHRID}"` }).then(
        (instance) => {
          InventoryInstance.deleteInstanceViaApi(instance.id);
        },
      );
    });

    it(
      'C375145 Verify the modal window for ISRI Import/Create in inventory main actions menu for single target profiles (folijet)',
      { tags: ['dryRun', 'folijet', 'C375145'] },
      () => {
        const calloutMessage = `Record ${testIdentifier} created. Results may take a few moments to become visible in Inventory`;

        InventoryActions.openSingleReportImportModal();
        SingleRecordImportModal.selectExternalTarget('OCLC WorldCat');
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
