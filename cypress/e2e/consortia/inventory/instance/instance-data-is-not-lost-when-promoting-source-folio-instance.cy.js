import moment from 'moment';
import uuid from 'uuid';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import Permissions from '../../../../support/dictionary/permissions';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import DateTools from '../../../../support/utils/dateTools';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Instance', () => {
    describe('Consortia', () => {
      let user;
      let instanceHRID;
      const instanceData = {
        today: DateTools.getFormattedDate({ date: new Date() }, 'YYYY-MM-DD'),
        instanceStatusTerm: 'Cataloged (folio: cat)',
        instanceStatusTermUI: 'Cataloged',
        instanceTitle: `C422050 instanceTitle${getRandomPostfix()}`,
        statisticalCode: 'ARL (Collection stats):    books - Book, print (books)',
        statisticalCodeUI: 'Book, print (books)',
        adminNote: `Instance admin note${getRandomPostfix()}`,
        instanceIdentifier: [
          { type: 'ISBN', value: uuid() },
          { type: 'ISBN', value: uuid() },
          { type: 'ISBN', value: uuid() },
        ],
        contributor: {
          name: `autotest_contributor${getRandomPostfix()}`,
          nameType: 'Personal name',
        },
        publication: { place: 'autotest_publication_place', date: moment.utc().format() },
        edition: '2023',
        description: 'autotest_physical_description',
        resourceType: 'other',
        natureOfContent: 'audiobook',
        format: 'audio -- other',
        formatUI: [' other', ' other', ' other'],
        language: 'English',
        frequency: `Publication frequency${getRandomPostfix()}`,
        instanceNote: { type: 'Bibliography note', value: `Instance note ${getRandomPostfix()}` },
        electronicAccess: {
          relationship: 'Resource',
          uri: 'test@mail.com',
          linkText: 'test@mail.com',
        },
        subject: [
          `test${getRandomPostfix()}`,
          `test${getRandomPostfix()}`,
          `test${getRandomPostfix()}`,
        ],
        classification: [
          { type: 'Dewey', value: `classification${getRandomPostfix()}` },
          { type: 'Dewey', value: `classification${getRandomPostfix()}` },
          { type: 'Dewey', value: `classification${getRandomPostfix()}` },
        ],
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

      after('Delete test data', () => {
        cy.resetTenant();
        cy.getAdminToken();
        Users.deleteViaApi(user.userId);
        cy.getInstance({ limit: 1, expandAll: true, query: `"hrid"=="${instanceHRID}"` }).then(
          (instance) => {
            InventoryInstance.deleteInstanceViaApi(instance.id);
          },
        );
      });

      it(
        'C422050 (Consortia) Verify the instance data is not lost, when promoting Source = FOLIO instance (consortia) (folijet)',
        { tags: ['criticalPathECS', 'folijet', 'C422050'] },
        () => {
          const InventoryNewInstance = InventoryInstances.addNewInventory();
          InventoryNewInstance.fillInstanceFields({
            catalogedDate: instanceData.today,
            instanceStatus: instanceData.instanceStatusTerm,
            statisticalCode: instanceData.statisticalCode,
            adminNote: instanceData.adminNote,
            title: instanceData.instanceTitle,
            instanceIdentifier: instanceData.instanceIdentifier,
            contributor: instanceData.contributor,
            publication: instanceData.publication,
            edition: instanceData.edition,
            description: instanceData.description,
            resourceType: instanceData.resourceType,
            natureOfContent: [
              instanceData.natureOfContent,
              instanceData.natureOfContent,
              instanceData.natureOfContent,
            ],
            format: [instanceData.format, instanceData.format, instanceData.format],
            language: instanceData.language,
            frequency: [instanceData.frequency, instanceData.frequency, instanceData.frequency],
            instanceNote: [
              { type: instanceData.instanceNote.type, value: instanceData.instanceNote.value },
              { type: instanceData.instanceNote.type, value: instanceData.instanceNote.value },
              { type: instanceData.instanceNote.type, value: instanceData.instanceNote.value },
            ],
            electronicAccess: {
              relationship: instanceData.electronicAccess.relationship,
              uri: instanceData.electronicAccess.uri,
              linkText: instanceData.electronicAccess.linkText,
            },
            subject: instanceData.subject,
            classification: instanceData.classification,
          });
          cy.wait(3000);
          InventoryNewInstance.clickSaveAndCloseButton();
          InventoryInstance.checkAllInstanceDetails(
            [
              { key: 'Cataloged date', value: instanceData.today },
              { key: 'Instance status term', value: instanceData.instanceStatusTermUI },
              { key: 'Resource title', value: instanceData.instanceTitle },
              { key: 'Edition', value: instanceData.edition },
              { key: 'Resource type term', value: instanceData.resourceType },
              { key: 'Nature of content', value: instanceData.natureOfContent },
              { key: 'Language', value: instanceData.language },
              { key: 'Publication frequency', value: instanceData.frequency },
              { key: 'Physical description', value: instanceData.description },
            ],
            instanceData.statisticalCodeUI,
            instanceData.adminNote,
            instanceData.instanceTitle,
            instanceData.instanceIdentifier,
            instanceData.contributor,
            instanceData.publication,
            instanceData.formatUI,
            instanceData.instanceNote,
            instanceData.subject,
            instanceData.electronicAccess,
            instanceData.classification,
          );

          InventoryInstance.clickShareLocalInstanceButton();
          InventoryInstance.clickShareInstance();
          InventoryInstance.verifyCalloutMessage(
            `Local instance ${instanceData.instanceTitle} has been successfully shared`,
          );
          InventoryInstance.waitInstanceRecordViewOpened(instanceData.instanceTitle);
          cy.reload();
          InventoryInstance.getAssignedHRID().then((initialInstanceHrId) => {
            instanceHRID = initialInstanceHrId;

            InventoryInstance.checkAllInstanceDetails(
              [
                { key: 'Cataloged date', value: instanceData.today },
                { key: 'Instance status term', value: instanceData.instanceStatusTermUI },
                { key: 'Resource title', value: instanceData.instanceTitle },
                { key: 'Edition', value: instanceData.edition },
                { key: 'Resource type term', value: instanceData.resourceType },
                { key: 'Nature of content', value: instanceData.natureOfContent },
                { key: 'Language', value: instanceData.language },
                { key: 'Publication frequency', value: instanceData.frequency },
                { key: 'Physical description', value: instanceData.description },
              ],
              instanceData.statisticalCodeUI,
              instanceData.adminNote,
              instanceData.instanceTitle,
              instanceData.instanceIdentifier,
              instanceData.contributor,
              instanceData.publication,
              instanceData.formatUI,
              instanceData.instanceNote,
              instanceData.subject,
              instanceData.electronicAccess,
              instanceData.classification,
            );

            ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
            ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.central);
            InventorySearchAndFilter.searchInstanceByHRID(instanceHRID);
            InventoryInstances.selectInstance();
            InventoryInstance.waitLoading();
            InventoryInstance.checkAllInstanceDetails(
              [
                { key: 'Cataloged date', value: instanceData.today },
                { key: 'Instance status term', value: instanceData.instanceStatusTermUI },
                { key: 'Resource title', value: instanceData.instanceTitle },
                { key: 'Edition', value: instanceData.edition },
                { key: 'Resource type term', value: instanceData.resourceType },
                { key: 'Nature of content', value: instanceData.natureOfContent },
                { key: 'Language', value: instanceData.language },
                { key: 'Publication frequency', value: instanceData.frequency },
                { key: 'Physical description', value: instanceData.description },
              ],
              instanceData.statisticalCodeUI,
              instanceData.adminNote,
              instanceData.instanceTitle,
              instanceData.instanceIdentifier,
              instanceData.contributor,
              instanceData.publication,
              instanceData.formatUI,
              instanceData.instanceNote,
              instanceData.subject,
              instanceData.electronicAccess,
              instanceData.classification,
            );
          });
        },
      );
    });
  });
});
