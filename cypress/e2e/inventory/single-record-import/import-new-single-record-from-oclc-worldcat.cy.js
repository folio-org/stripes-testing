import { calloutTypes } from '../../../../interactors';
import { INSTANCE_SOURCE_NAMES } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import Z3950TargetProfiles from '../../../support/fragments/settings/inventory/integrations/z39.50TargetProfiles';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';

describe('Inventory', () => {
  describe('Single record import', () => {
    let user;
    let instanceHrid;
    const OCLCAuthentication = '100481406/PAOLF';
    const oclcNumbers = {
      validOclc: '1202462670',
      invalidOclc: '0000000000',
    };

    before('Create test user and login', () => {
      cy.getAdminToken();
      Z3950TargetProfiles.changeOclcWorldCatValueViaApi(OCLCAuthentication, false);

      cy.createTempUser([
        Permissions.inventoryAll.gui,
        Permissions.uiInventorySingleRecordImport.gui,
      ]).then((userProperties) => {
        user = userProperties;

        cy.login(user.username, user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      cy.getInstance({
        limit: 1,
        expandAll: true,
        query: `"hrid"=="${instanceHrid}"`,
      }).then((instance) => {
        InventoryInstance.deleteInstanceViaApi(instance.id);
      });
      Users.deleteViaApi(user.userId);
    });

    it(
      'C343235 Import New single record from OCLC WorldCat (folijet)',
      { tags: ['extendedPath', 'folijet', 'C343235'] },
      () => {
        InventoryInstances.importWithOclc(oclcNumbers.validOclc);
        InventoryInstance.waitLoading();
        InventoryInstance.checkCalloutMessage(
          `Record ${oclcNumbers.validOclc} created. Results may take a few moments to become visible in Inventory`,
        );
        InstanceRecordView.waitLoading();
        InstanceRecordView.verifyInstanceSource(INSTANCE_SOURCE_NAMES.MARC);
        InstanceRecordView.getAssignedHRID().then((hrid) => {
          instanceHrid = hrid;
        });

        InventoryInstances.importWithOclc(oclcNumbers.invalidOclc);
        InventoryInstance.checkCalloutMessage(
          `Something went wrong: HTTPError: Bad Request: No record found when searching zcat.oclc.org/OLUCWorldCat for identifier ${oclcNumbers.invalidOclc}`,
          calloutTypes.error,
        );
      },
    );
  });
});
