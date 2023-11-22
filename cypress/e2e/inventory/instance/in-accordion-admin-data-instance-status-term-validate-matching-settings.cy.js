import { DevTeams, TestTypes, Permissions } from '../../../support/dictionary';
import TopMenu from '../../../support/fragments/topMenu';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import InstanceRecordEdit from '../../../support/fragments/inventory/instanceRecordEdit';
import Users from '../../../support/fragments/users/users';
import InstanceStatusTypes from '../../../support/fragments/settings/inventory/instances/instanceStatusTypes/instanceStatusTypes';

describe('inventory', () => {
  describe('Instance', () => {
    let user;
    const testData = {
      defaultInsatnceStatusTerms: [
        'Batch Loaded',
        'Cataloged',
        'Electronic Resource',
        'Not yet assigned',
        'Other',
        'Temporary',
        'Uncataloged',
      ],
    };

    before('create test data and login', () => {
      cy.createTempUser([
        Permissions.inventoryAll.gui,
        Permissions.uiSettingsInstanceStatuses.gui,
      ]).then((userProperties) => {
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
      () => {
        InventoryInstance.searchByTitle(testData.instance.instanceTitle);
        InventoryInstances.selectInstance();
        InstanceRecordView.verifyInstancePaneExists();
        InstanceRecordView.edit();
        InstanceRecordEdit.waitLoading();
        InstanceRecordEdit.getStatusTermsFromInstance(testData.defaultInsatnceStatusTerms).then(
          (statusNames) => {
            cy.visit(SettingsMenu.instanceStatusTypesPath);
            InstanceStatusTypes.verifyListOfStatusTypesIsIdenticalToListInInstance(statusNames);
          },
        );
      },
    );
  });
});
