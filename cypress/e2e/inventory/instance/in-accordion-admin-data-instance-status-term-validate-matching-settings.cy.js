import { DevTeams, TestTypes, Permissions } from '../../../support/dictionary';
import TopMenu from '../../../support/fragments/topMenu';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import InstanceRecordEdit from '../../../support/fragments/inventory/instanceRecordEdit';
import Users from '../../../support/fragments/users/users';

describe('inventory', () => {
  describe('Instance', () => {
    let user;
    const testData = {
      natureOfContent: 'audiobook',
      natureOfContentForChanging: 'bibliography',
    };

    before('create test data and login', () => {
      cy.createTempUser([Permissions.inventoryAll.gui]).then((userProperties) => {
        user = userProperties;

        InventoryInstance.createInstanceViaApi().then(({ instanceData }) => {
          testData.instance = instanceData;
        });

        cy.login(user.username, user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
      });
    });

    it(
      'C602 In Accordion Administrative Data --> Instance status term --> (Validate matching settings) (folijet) (TaaS)',
      { tags: [TestTypes.extended, DevTeams.folijet] },
      () => {},
    );
  });
});
