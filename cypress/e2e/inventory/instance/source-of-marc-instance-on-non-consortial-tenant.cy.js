import { Permissions } from '../../../support/dictionary';
import DataImport from '../../../support/fragments/data_import/dataImport';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('inventory', () => {
  describe('Instance', () => {
    let user;
    let instanceHrid;
    const instanceSource = 'MARC';
    const filePathForUpload = 'oneMarcBib.mrc';
    const jobProfileToRun = 'Default - Create instance and SRS MARC Bib';
    const fileName = `C402775 autotestFile.${getRandomPostfix()}.mrc`;

    before('create test data and login', () => {
      cy.getAdminToken();
      DataImport.uploadFileViaApi(filePathForUpload, fileName, jobProfileToRun).then((response) => {
        instanceHrid = response.entries[0].relatedInstanceInfo.hridList[0];
      });

      cy.createTempUser([Permissions.uiInventoryViewCreateEditInstances.gui]).then(
        (userProperties) => {
          user = userProperties;
          cy.login(user.username, user.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          });
        },
      );
    });

    after('delete test data', () => {
      cy.getAdminToken().then(() => {
        Users.deleteViaApi(user.userId);
        cy.getInstance({ limit: 1, expandAll: true, query: `"hrid"=="${instanceHrid}"` }).then(
          (instance) => {
            InventoryInstance.deleteInstanceViaApi(instance.id);
          },
        );
      });
    });

    it(
      'C402775 (NON-CONSORTIA) Verify the Source of a MARC Instance on non-consortial tenant (folijet) (TaaS)',
      { tags: ['criticalPath', 'folijet'] },
      () => {
        InventorySearchAndFilter.verifyPanesExist();
        InventorySearchAndFilter.instanceTabIsDefault();
        InventoryInstances.searchBySource(instanceSource);
        InventorySearchAndFilter.searchInstanceByHRID(instanceHrid);
        InstanceRecordView.verifyInstancePaneExists();
        InstanceRecordView.verifyInstanceSource(instanceSource);
      },
    );
  });
});
