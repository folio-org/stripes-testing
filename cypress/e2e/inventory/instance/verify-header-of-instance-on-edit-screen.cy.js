import Permissions from '../../../support/dictionary/permissions';
import InstanceRecordEdit from '../../../support/fragments/inventory/instanceRecordEdit';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';
import DateTools from '../../../support/utils/dateTools';

describe('Inventory', () => {
  describe('Instance', () => {
    const randomPostfix = getRandomPostfix();
    const publisherA = `AT_C399082_PubA_${randomPostfix}`;
    const publisherB = `AT_C399082_PubB_${randomPostfix}`;
    const titlePrefix = `AT_C399082_FolioInstance_${randomPostfix}`;

    const testData = {
      user: {},
      instances: [
        {
          title: `${titlePrefix}_A`,
          publication: [{ publisher: publisherA, place: '', dateOfPublication: '2020', role: '' }],
        },
        {
          title: `${titlePrefix}_B`,
          publication: [{ publisher: publisherB, place: '', dateOfPublication: '', role: '' }],
        },
        {
          title: `${titlePrefix}_C`,
          publication: [],
        },
      ],
    };

    let dateCreated;

    before('Create test data and login', () => {
      cy.getAdminToken();

      cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
        const instanceTypeId = instanceTypes[0].id;

        testData.instances.forEach((instance, index) => {
          InventoryInstances.createFolioInstanceViaApi({
            instance: {
              instanceTypeId,
              title: instance.title,
              publication: instance.publication,
            },
          }).then((createdInstance) => {
            dateCreated = DateTools.getFormattedDate({ date: new Date() }, 'M/D/YYYY');
            cy.getInstanceById(createdInstance.instanceId).then((instanceData) => {
              testData.instances[index].id = instanceData.id;
              testData.instances[index].hrid = instanceData.hrid;
            });
          });
        });
      });

      cy.createTempUser([Permissions.inventoryAll.gui]).then((userProperties) => {
        testData.user = userProperties;
        cy.setDefaultLocaleApi();

        cy.login(userProperties.username, userProperties.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(testData.user?.userId);
      testData.instances.forEach((instance) => {
        if (instance.id) InventoryInstance.deleteInstanceViaApi(instance.id);
      });
    });

    it(
      'C399082 Verify the header of the Instance on Edit screen (promin)',
      { tags: ['extendedPath', 'promin', 'C399082'] },
      () => {
        InventoryInstances.searchByTitle(titlePrefix);
        [`${titlePrefix}_A`, `${titlePrefix}_B`, `${titlePrefix}_C`].forEach((title) => {
          InventorySearchAndFilter.verifySearchResultIncludingValue(title);
        });

        testData.instances.forEach((instance) => {
          // Step 1: Open "Edit instance" page via Actions menu
          InventoryInstances.selectInstanceByTitle(instance.title);
          InventoryInstance.waitLoading();
          InventoryInstance.waitInstanceRecordViewOpened();
          InventoryInstance.editInstance();
          InstanceRecordEdit.waitLoading();

          // Step 2: Verify 2-row header: first row with icon + title parts, second row with HRID + last updated
          InstanceRecordEdit.verifyInstancePaneheader({
            title: instance.title,
            publisher: instance.publication[0]?.publisher,
            dateOfPublication: instance.publication[0]?.dateOfPublication,
            hrid: instance.hrid,
            updatedDate: dateCreated,
          });

          InstanceRecordEdit.close();
          InventoryInstance.waitLoading();
          InventoryInstance.waitInstanceRecordViewOpened();
          InventorySearchAndFilter.closeInstanceDetailPane();
        });
      },
    );
  });
});
