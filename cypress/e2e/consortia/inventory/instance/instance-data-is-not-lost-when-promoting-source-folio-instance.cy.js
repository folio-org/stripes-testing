import moment from 'moment';
import uuid from 'uuid';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import Permissions from '../../../../support/dictionary/permissions';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import TopMenu from '../../../../support/fragments/topMenu';
import DateTools from '../../../../support/utils/dateTools';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import getRandomPostfix from '../../../../support/utils/stringTools';
import inventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';

describe('Inventory', () => {
  describe('Instance', () => {
    let user;
    let instanceHRID;
    const instanceData = {
      today: DateTools.getFormattedDate({ date: new Date() }, 'YYYY-MM-DD'),
      instanceStatusTerm: 'Batch Loaded (consortium: batch)',
      instanceTitle: `C422050 instanceTitle${getRandomPostfix}`,
    };

    before('Create test data', () => {
      cy.getAdminToken();
      cy.createTempUser([Permissions.inventoryAll.gui]).then((userProperties) => {
        user = userProperties;

        cy.assignAffiliationToUser(Affiliations.College, user.userId);
        cy.setTenant(Affiliations.College);
        cy.assignPermissionsToExistingUser(user.userId, [
          Permissions.inventoryAll.gui,
          Permissions.consortiaInventoryShareLocalInstance.gui,
        ]);
        cy.resetTenant();

        cy.login(user.username, user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
        ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
        ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
      });
    });

    // after('Delete test data', () => {
    //   cy.resetTenant();
    //   cy.getAdminToken();
    //   Users.deleteViaApi(user.userId);
    //   cy.setTenant(Affiliations.College);
    //   InventoryHoldings.deleteHoldingRecordViaApi(testData.holding.id);
    //   Locations.deleteViaApi(testData.collegeLocation);
    //   InventoryInstance.deleteInstanceViaApi(testData.instanceIds[0]);
    // });

    it(
      'C422050 (Consortia) Verify the instance data is not lost, when promoting Source = FOLIO instance (consortia) (folijet)',
      { tags: ['criticalPathECS', 'folijet'] },
      () => {
        const InventoryNewInstance = InventoryInstances.addNewInventory();
        InventoryNewInstance.fillInstanceFields({
          catalogedDate: instanceData.today,
          instanceStatus: instanceData.instanceStatusTerm,
          statisticalCode: 'ARL (Collection stats): books - Book, print (books)',
          adminNote: `Instance admin note${getRandomPostfix}`,
          title: instanceData.instanceTitle,
          instnaceIdentifier: [
            { type: 'ISBN', value: uuid() },
            { type: 'ISBN', value: uuid() },
            { type: 'ISBN', value: uuid() },
          ],
          contributor: {
            name: `autotest_contributor${getRandomPostfix}`,
            nameType: 'Personal name',
          },
          publication: { place: 'autotest_publication_place', date: moment.utc().format() },
          edition: '2023',
          description: 'autotest_physical_description',
          resourceType: 'other',
          natureOfContent: ['audiobook', 'audiobook', 'audiobook'],
          format: ['audio -- other', 'audio -- other', 'audio -- other'],
          language: 'English',
          frequency: [
            `Publication frequency${getRandomPostfix}`,
            `Publication frequency${getRandomPostfix}`,
            `Publication frequency${getRandomPostfix}`,
          ],
          instanceNote: [
            { type: 'Bibliography note', value: `Instance note ${getRandomPostfix}` },
            { type: 'Bibliography note', value: `Instance note ${getRandomPostfix}` },
            { type: 'Bibliography note', value: `Instance note ${getRandomPostfix}` },
          ],
          electronicAccess: {
            relationship: 'Resource',
            uri: 'test@mail.com',
            textLink: 'test@mail.com',
          },
          subject: ['test', 'test', 'test'],
          classification: [
            { type: 'Dewey', value: `classification${getRandomPostfix}` },
            { type: 'Dewey', value: `classification${getRandomPostfix}` },
            { type: 'Dewey', value: `classification${getRandomPostfix}` },
          ],
        });
        InventoryNewInstance.clickSaveAndCloseButton();
        InventoryInstance.checkInstanceDetails([
          // { key: 'Source', value: INSTANCE_SOURCE_NAMES.FOLIO },
        ]);
        InventoryInstance.shareInstance();
        InventoryInstance.verifyCalloutMessage(
          `Local instance ${instanceData.instanceTitle} has been successfully shared`,
        );
        InventoryInstance.waitInstanceRecordViewOpened(instanceData.instanceTitle);
        cy.reload();
        InventoryInstance.getAssignedHRID().then((initialInstanceHrId) => {
          instanceHRID = initialInstanceHrId;

          InventoryInstance.checkInstanceDetails([
            // { key: 'Source', value: INSTANCE_SOURCE_NAMES.FOLIO },
          ]);

          ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
          ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.central);
          inventorySearchAndFilter.searchInstanceByHRID(instanceHRID);
          InventoryInstances.selectInstance();
          InventoryInstance.waitLoading();
          InventoryInstance.checkInstanceDetails([
            // { key: 'Source', value: INSTANCE_SOURCE_NAMES.FOLIO },
          ]);
        });
      },
    );
  });
});
