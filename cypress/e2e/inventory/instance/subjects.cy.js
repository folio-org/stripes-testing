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
      instanceSubject: `test subject${getRandomPostfix()}`,
      newInstanceSubject: `test subject${getRandomPostfix()}`,
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

    it('C617 Subjects (folijet)', { tags: ['extendedPath', 'folijet', 'C617'] }, () => {
      InventoryInstances.searchByTitle(testData.instance.instanceId);
      InventoryInstances.selectInstance();
      InstanceRecordView.verifyInstancePaneExists();
      InstanceRecordView.edit();
      InstanceRecordEdit.waitLoading();
      InstanceRecordEdit.addSubject(testData.instanceSubject);
      InstanceRecordEdit.saveAndClose();
      InstanceRecordView.verifyInstanceRecordViewOpened();
      InstanceRecordView.openSubjectAccordion();
      InstanceRecordView.verifyInstanceSubject({
        indexRow: 0,
        subjectHeadings: testData.instanceSubject,
        subjectSource: 'Library of Congress Subject Headings',
        subjectType: 'Personal name',
      });

      InstanceRecordView.edit();
      InstanceRecordEdit.waitLoading();
      InstanceRecordEdit.changeSubject(testData.newInstanceSubject);
      InstanceRecordEdit.saveAndClose();
      InstanceRecordView.verifyInstanceRecordViewOpened();
      InstanceRecordView.verifyInstanceSubject({
        indexRow: 0,
        subjectHeadings: testData.newInstanceSubject,
        subjectSource: 'Library of Congress Subject Headings',
        subjectType: 'Personal name',
      });

      InstanceRecordView.edit();
      InstanceRecordEdit.waitLoading();
      InstanceRecordEdit.deleteSubject();
      InstanceRecordEdit.saveAndClose();
      InstanceRecordView.verifyInstanceRecordViewOpened();
      InstanceRecordView.verifyInstanceSubjectAbsent();
    });
  });
});
