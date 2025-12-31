import getRandomPostfix from '../../../support/utils/stringTools';
import InstanceRecordEdit from '../../../support/fragments/inventory/instanceRecordEdit';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import TopMenu from '../../../support/fragments/topMenu';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import Users from '../../../support/fragments/users/users';
import Permissions from '../../../support/dictionary/permissions';

describe('Inventory', () => {
  describe('Instance', () => {
    const testData = {
      instanceTitle: `AT_C959215_FolioInstance_${getRandomPostfix()}`,
    };

    before('Login', () => {
      cy.createTempUser([Permissions.uiInventoryViewCreateEditInstances.gui]).then(
        (userProperties) => {
          testData.user = userProperties;
          cy.login(testData.user.username, testData.user.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          });
        },
      );
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteInstanceByTitleViaApi(testData.instanceTitle);
      Users.deleteViaApi(testData.user.userId);
    });

    it(
      'C959215 Create/Edit Instance with empty fields (instanceFormatIds, physicalDescriptions, administrativeNotes, editions, publicationRange, publicationFrequency, natureOfContentTermIds) (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C959215'] },
      () => {
        // Step 1. Click on the "Actions" button on the second pane >> Select "New" option
        const InventoryNewInstance = InventoryInstances.addNewInventory();

        // Step 2. Fill in the required fields
        InventoryNewInstance.fillRequiredValues(testData.instanceTitle);

        // Step 3. Add specified fields but don't fill added fields / don't select values from dropdown
        InstanceRecordEdit.addAdministrativeNote('');
        InstanceRecordEdit.addEditions('');
        InstanceRecordEdit.addPhysicalDescriptions('');
        InstanceRecordEdit.addNatureOfContent();
        InstanceRecordEdit.addFormats();
        InstanceRecordEdit.addPublicationFrequency('');
        InstanceRecordEdit.addPublicationRange('');

        // Step 5. Click on the "Save & close" button
        cy.intercept('GET', '/inventory/instances/*').as('getInstance');
        InstanceRecordEdit.saveAndClose();
        InstanceRecordView.verifyInstanceIsOpened(testData.instanceTitle);
        cy.wait('@getInstance').then(({ response }) => {
          const instance = response.body;

          expect(instance.administrativeNotes).to.deep.equal([]);
          expect(instance.statisticalCodeIds).to.deep.equal([]);
          expect(instance.editions).to.deep.equal([]);
          expect(instance.physicalDescriptions).to.deep.equal([]);
          expect(instance.natureOfContentTermIds).to.deep.equal([]);
          expect(instance.instanceFormatIds).to.deep.equal([]);
          expect(instance.publicationFrequency).to.deep.equal([]);
          expect(instance.publicationRange).to.deep.equal([]);
        });

        // Step 6. Click on "Actions" - "Edit instance"
        InventoryInstance.editInstance();

        // Step 7. Add specified fields but don't fill added fields / don't select values from dropdown
        InstanceRecordEdit.addAdministrativeNote('');
        InstanceRecordEdit.addEditions('');
        InstanceRecordEdit.addPhysicalDescriptions('');
        InstanceRecordEdit.addNatureOfContent();
        InstanceRecordEdit.addFormats();
        InstanceRecordEdit.addPublicationFrequency('');
        InstanceRecordEdit.addPublicationRange('');

        // Step. Click on the "Save & close" button
        cy.intercept('GET', '/inventory/instances/*').as('getInstance');
        InstanceRecordEdit.saveAndClose();
        InstanceRecordView.verifyInstanceIsOpened(testData.instanceTitle);
        cy.wait('@getInstance').then(({ response }) => {
          const instance = response.body;

          expect(instance.administrativeNotes).to.deep.equal([]);
          expect(instance.statisticalCodeIds).to.deep.equal([]);
          expect(instance.editions).to.deep.equal([]);
          expect(instance.physicalDescriptions).to.deep.equal([]);
          expect(instance.natureOfContentTermIds).to.deep.equal([]);
          expect(instance.instanceFormatIds).to.deep.equal([]);
          expect(instance.publicationFrequency).to.deep.equal([]);
          expect(instance.publicationRange).to.deep.equal([]);
        });
      },
    );
  });
});
