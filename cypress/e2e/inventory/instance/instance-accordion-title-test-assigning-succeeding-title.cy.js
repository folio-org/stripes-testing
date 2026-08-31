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
    const randomPostfix = getRandomPostfix();
    const titlePrefix = `AT_C9216_FolioInstance_${randomPostfix}`;
    const testData = {
      mainInstanceTitle: `${titlePrefix}_Main`,
      firstSucceedingTitle: `${titlePrefix}_FirstSucceeding`,
      secondSucceedingTitle: `${titlePrefix}_SecondSucceeding`,
      succeedingIsbn: `ISBN_${randomPostfix}`,
      succeedingIssn: `ISSN_${randomPostfix}`,
    };

    before('Create test data', () => {
      cy.getAdminToken();

      cy.getInstanceTypes({ limit: 1, query: 'source<>local' }).then((instanceTypes) => {
        testData.instanceTypeId = instanceTypes[0].id;
      });

      InventoryInstances.getIdentifierTypes({ query: 'name=="ISBN"' }).then((identifierType) => {
        testData.isbnTypeId = identifierType.id;
      });

      InventoryInstances.getIdentifierTypes({ query: 'name=="ISSN"' }).then((identifierType) => {
        testData.issnTypeId = identifierType.id;
      });

      cy.then(() => {
        InventoryInstances.createFolioInstanceViaApi({
          instance: {
            instanceTypeId: testData.instanceTypeId,
            title: testData.mainInstanceTitle,
          },
        }).then((createdInstance) => {
          testData.mainInstanceId = createdInstance.instanceId;
        });

        InventoryInstances.createFolioInstanceViaApi({
          instance: {
            instanceTypeId: testData.instanceTypeId,
            title: testData.firstSucceedingTitle,
            identifiers: [
              { identifierTypeId: testData.isbnTypeId, value: testData.succeedingIsbn },
            ],
          },
        }).then((createdInstance) => {
          testData.firstSucceedingInstanceId = createdInstance.instanceId;
        });

        InventoryInstances.createFolioInstanceViaApi({
          instance: {
            instanceTypeId: testData.instanceTypeId,
            title: testData.secondSucceedingTitle,
            identifiers: [
              { identifierTypeId: testData.issnTypeId, value: testData.succeedingIssn },
            ],
          },
        }).then((createdInstance) => {
          testData.secondSucceedingInstanceId = createdInstance.instanceId;
        });
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
      cy.getAdminToken();
      InventoryInstance.removePrecedingSucceedingTitlesViaApi(testData.mainInstanceId);
      if (testData.user?.userId) Users.deleteViaApi(testData.user.userId);
      InventoryInstance.deleteInstanceViaApi(testData.mainInstanceId);
      InventoryInstance.deleteInstanceViaApi(testData.firstSucceedingInstanceId);
      InventoryInstance.deleteInstanceViaApi(testData.secondSucceedingInstanceId);
    });

    it(
      'C9216 In Accordion Title --> Test assigning a Succeeding title (promin)',
      { tags: ['extendedPath', 'promin', 'C9216'] },
      () => {
        // Step 1: Find and open the instance, then edit it
        InventoryInstances.searchByTitle(testData.mainInstanceId);
        InventoryInstances.selectInstanceById(testData.mainInstanceId);
        InventoryInstance.waitLoading();
        InventoryInstance.waitInstanceRecordViewOpened();

        InventoryInstance.editInstance();
        InstanceRecordEdit.waitLoading();

        // Step 2: Click "Add succeeding title", enter title name manually, save & close
        InstanceRecordEdit.addSucceedingTitle(
          testData.firstSucceedingTitle,
          0,
          testData.succeedingIsbn,
        );
        InstanceRecordEdit.saveAndClose();
        InventoryInstance.waitLoading();
        InventoryInstance.waitInstanceRecordViewOpened();

        InstanceRecordView.verifySucceedingTitle(testData.firstSucceedingTitle);
        InstanceRecordView.verifySucceedingTitle(testData.succeedingIsbn);

        // Step 3: Edit the instance again
        InventoryInstance.editInstance();
        InstanceRecordEdit.waitLoading();

        // Step 4: Click "Add succeeding title", use "+" to open modal, select an instance, save & close
        InstanceRecordEdit.addExistingSucceedingTitle(
          testData.secondSucceedingTitle,
          1,
          undefined,
          testData.succeedingIssn,
        );
        InstanceRecordEdit.saveAndClose();
        InventoryInstance.waitLoading();
        InventoryInstance.waitInstanceRecordViewOpened();

        InstanceRecordView.verifySucceedingTitle(testData.firstSucceedingTitle);
        InstanceRecordView.verifySucceedingTitle(testData.succeedingIsbn);
        InstanceRecordView.verifySucceedingTitle(testData.secondSucceedingTitle);
        InstanceRecordView.verifySucceedingTitle(testData.succeedingIssn);
      },
    );
  });
});
