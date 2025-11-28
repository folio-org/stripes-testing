import { Permissions } from '../../../support/dictionary';
import InstanceRecordEdit from '../../../support/fragments/inventory/instanceRecordEdit';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Instance', () => {
    const testData = {
      instanceNoteType: 'Exhibitions note',
      instanceNote: `test note${getRandomPostfix()}`,
    };

    before('Create test data and login', () => {
      cy.getAdminToken();
      InventoryInstance.createInstanceViaApi().then(({ instanceData }) => {
        testData.instance = instanceData;
      });

      cy.createTempUser([Permissions.inventoryAll.gui]).then((userProperties) => {
        testData.user = userProperties;

        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken().then(() => {
        Users.deleteViaApi(testData.user.userId);
        InventoryInstance.deleteInstanceViaApi(testData.instance.instanceId);
      });
    });

    it('C615 Instance notes (folijet)', { tags: ['extendedPath', 'folijet', 'C615'] }, () => {
      InventoryInstances.searchByTitle(testData.instance.instanceId);
      InventoryInstances.selectInstance();
      InstanceRecordView.verifyInstancePaneExists();
      InstanceRecordView.edit();
      InstanceRecordEdit.waitLoading();
      InstanceRecordEdit.clickAddNoteButton(testData.instanceNoteType, testData.instanceNote);
      InstanceRecordEdit.saveAndClose();
      cy.wait(2000);
      InstanceRecordView.verifyInstanceRecordViewOpened();
      InstanceRecordView.verifyInstanceNote(testData.instanceNote);
    });
  });
});
