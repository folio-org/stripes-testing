import { INSTANCE_DATE_TYPES } from '../../../support/constants';
import CapabilitySets from '../../../support/dictionary/capabilitySets';
import InstanceRecordEdit from '../../../support/fragments/inventory/instanceRecordEdit';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';
import InteractorsTools from '../../../support/utils/interactorsTools';

describe('Inventory', () => {
  describe('Keyboard shortcut (NEW)', () => {
    const randomPostfix = getRandomPostfix();
    const testData = {
      instanceTitle: `AT_C1464228_FolioInstance_${randomPostfix}`,
      updatedTitle: `AT_C1464228_FolioInstance_Updated_${randomPostfix}`,
      alternativeTitleValue: `AT_C1464228_AlternativeTitle_${randomPostfix}`,
      dateType: INSTANCE_DATE_TYPES.INCLUSIVE,
      date1: '2020',
      date2: '2021',
    };

    let user;
    let instanceId;

    before('Create test data', () => {
      cy.getAdminToken();

      cy.then(() => {
        cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
          testData.instanceTypeId = instanceTypes[0].id;
        });
      }).then(() => {
        InventoryInstances.createFolioInstanceViaApi({
          instance: {
            instanceTypeId: testData.instanceTypeId,
            title: testData.instanceTitle,
          },
        }).then(({ instanceId: createdInstanceId }) => {
          instanceId = createdInstanceId;
        });

        cy.createTempUser([]).then((userProperties) => {
          user = userProperties;
          cy.assignCapabilitiesToExistingUser(user.userId, [], [CapabilitySets.uiInventory]);

          cy.login(user.username, user.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          });
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken(false);
      Users.deleteViaApi(user.userId);
      InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(instanceId);
    });

    it(
      'C1464228 Enter key in textbox on instance edit form triggers "Save & close" (promin)',
      { tags: ['extendedPath', 'promin', 'C1464228'] },
      () => {
        InventoryInstances.searchByTitle(instanceId);
        InventoryInstances.selectInstanceById(instanceId);
        InventoryInstance.waitLoading();
        InventoryInstance.waitInstanceRecordViewOpened();

        // Step 1: Actions > Edit opens the instance edit form
        InstanceRecordView.edit();

        // Step 2: type into a non-resizable textbox (Date 1), press Enter - instance record
        // saves, but (unlike the item edit form) the edit form stays open
        InstanceRecordEdit.fillDates(testData.date1, '', testData.dateType);
        InstanceRecordEdit.pressEnterInDateField(1);
        InstanceRecordEdit.verifySuccessfulMessage();
        InteractorsTools.closeAllVisibleCallouts();
        cy.wait(2000); // make sure the pane remains opened
        InstanceRecordEdit.waitLoading();
        InstanceRecordEdit.verifyDateFieldsValues(testData.date1, '', testData.dateType);

        // Step 3: resizable textbox (Resource title) - doesn't save on Enter, the new line
        // stays in the field and the form stays open
        InstanceRecordEdit.editResourceTitle(testData.updatedTitle);
        InstanceRecordEdit.pressEnterInTitleField();
        InstanceRecordEdit.verifyTitle(`${testData.updatedTitle}\n`);
        cy.wait(2000); // make sure the pane remains opened
        InstanceRecordEdit.waitLoading();
        InstanceRecordEdit.verifyTitle(`${testData.updatedTitle}\n`);
        InteractorsTools.checkNoSuccessCallouts();
        // drop the new line, so the next save stores a clean title
        InstanceRecordEdit.editResourceTitle(testData.updatedTitle);

        // Step 3: non-resizable textbox (Date 2) - saves on Enter, form stays open
        InstanceRecordEdit.fillDates(testData.date1, testData.date2);
        InstanceRecordEdit.pressEnterInDateField(2);
        InstanceRecordEdit.verifySuccessfulMessage();
        InteractorsTools.closeAllVisibleCallouts();
        cy.wait(2000); // make sure the pane remains opened
        InstanceRecordEdit.waitLoading();
        InstanceRecordEdit.verifyDateFieldsValues(
          testData.date1,
          testData.date2,
          testData.dateType,
        );

        // Step 3: resizable textbox (Alternative title) - doesn't save on Enter, the new line
        // stays in the field and the form stays open
        InstanceRecordEdit.clickAddAlternativeTitle();
        InstanceRecordEdit.fillAlternativeTitle(testData.alternativeTitleValue);
        InstanceRecordEdit.verifyAlternativeTitle(testData.alternativeTitleValue);
        InstanceRecordEdit.pressEnterInAlternativeTitleField();
        InstanceRecordEdit.verifyAlternativeTitle(`${testData.alternativeTitleValue}\n`);
        cy.wait(2000); // make sure the pane remains opened
        InstanceRecordEdit.waitLoading();
        InstanceRecordEdit.verifyAlternativeTitle(`${testData.alternativeTitleValue}\n`);
        InteractorsTools.checkNoSuccessCallouts();
      },
    );
  });
});
