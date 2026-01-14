import { including } from '@interactors/html';
import { MultiColumnListHeader } from '../../../../interactors';
import { ITEM_STATUS_NAMES, LOCATION_NAMES } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import generateUniqueItemBarcodeWithShift from '../../../support/utils/generateUniqueItemBarcodeWithShift';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Item', () => {
    let user;
    const itemData = {
      instanceTitle: `autotestInstance ${getRandomPostfix()}`,
    };

    before('Create test data and login', () => {
      cy.getAdminToken()
        .then(() => {
          cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
            itemData.instanceTypeId = instanceTypes[0].id;
          });
          cy.getHoldingTypes({ limit: 1 }).then((res) => {
            itemData.holdingTypeId = res[0].id;
          });
          cy.getLocations({ query: `name="${LOCATION_NAMES.MAIN_LIBRARY_UI}"` }).then(
            (locations) => {
              itemData.locationsId = locations.id;
            },
          );
          cy.getLoanTypes({ limit: 1 }).then((res) => {
            itemData.loanTypeId = res[0].id;
          });
          cy.getDefaultMaterialType().then((res) => {
            itemData.materialTypeId = res.id;
          });
        })
        .then(() => {
          const collectionOfItems = [
            {
              barcode: generateUniqueItemBarcodeWithShift(),
              status: { name: ITEM_STATUS_NAMES.AVAILABLE },
              permanentLoanType: { id: itemData.loanTypeId },
              materialType: { id: itemData.materialTypeId },
              copyNumber: '4',
              enumeration: '456',
              chronology: '789',
              volume: '2',
              yearCaption: ['2019'],
            },
            {
              barcode: generateUniqueItemBarcodeWithShift(),
              status: { name: ITEM_STATUS_NAMES.IN_PROCESS },
              permanentLoanType: { id: itemData.loanTypeId },
              materialType: { id: itemData.materialTypeId },
              copyNumber: '7',
              enumeration: '567',
              chronology: '890',
              volume: '3',
              yearCaption: ['2020'],
            },
            {
              barcode: generateUniqueItemBarcodeWithShift(),
              status: { name: ITEM_STATUS_NAMES.IN_TRANSIT },
              permanentLoanType: { id: itemData.loanTypeId },
              materialType: { id: itemData.materialTypeId },
              copyNumber: '10',
              enumeration: '678',
              chronology: '891',
              volume: '4',
              yearCaption: ['2021'],
            },
            {
              barcode: generateUniqueItemBarcodeWithShift(),
              status: { name: ITEM_STATUS_NAMES.MISSING },
              permanentLoanType: { id: itemData.loanTypeId },
              materialType: { id: itemData.materialTypeId },
              copyNumber: '12',
              enumeration: '789',
              chronology: '892',
              volume: '5',
              yearCaption: ['2022'],
            },
            {
              barcode: generateUniqueItemBarcodeWithShift(),
              status: { name: ITEM_STATUS_NAMES.PAGED },
              permanentLoanType: { id: itemData.loanTypeId },
              materialType: { id: itemData.materialTypeId },
              copyNumber: '2',
              enumeration: '890',
              chronology: '893',
              volume: '6',
              yearCaption: ['2023'],
            },
            {
              barcode: generateUniqueItemBarcodeWithShift(),
              status: { name: ITEM_STATUS_NAMES.AVAILABLE },
              permanentLoanType: { id: itemData.loanTypeId },
              materialType: { id: itemData.materialTypeId },
              copyNumber: '8',
              enumeration: '894',
              chronology: '894',
              volume: '7',
              yearCaption: ['2023'],
            },
            {
              barcode: generateUniqueItemBarcodeWithShift(),
              status: { name: ITEM_STATUS_NAMES.IN_PROCESS },
              permanentLoanType: { id: itemData.loanTypeId },
              materialType: { id: itemData.materialTypeId },
              copyNumber: '18',
              enumeration: '895',
              chronology: '886',
              volume: '8',
              yearCaption: ['2023'],
            },
            {
              barcode: generateUniqueItemBarcodeWithShift(),
              status: { name: ITEM_STATUS_NAMES.IN_PROCESS },
              permanentLoanType: { id: itemData.loanTypeId },
              materialType: { id: itemData.materialTypeId },
              copyNumber: '1',
              enumeration: '895',
              chronology: '886',
              volume: '8',
              yearCaption: ['2023'],
            },
            {
              barcode: generateUniqueItemBarcodeWithShift(),
              status: { name: ITEM_STATUS_NAMES.IN_TRANSIT },
              permanentLoanType: { id: itemData.loanTypeId },
              materialType: { id: itemData.materialTypeId },
              copyNumber: '3',
              enumeration: '896',
              chronology: '887',
              volume: '9',
              yearCaption: ['2012'],
            },
            {
              barcode: generateUniqueItemBarcodeWithShift(),
              status: { name: ITEM_STATUS_NAMES.IN_TRANSIT },
              permanentLoanType: { id: itemData.loanTypeId },
              materialType: { id: itemData.materialTypeId },
              copyNumber: '11',
              enumeration: '897',
              chronology: '867',
              volume: '10',
              yearCaption: ['2014'],
            },
          ];

          InventoryInstances.createFolioInstanceViaApi({
            instance: {
              instanceTypeId: itemData.instanceTypeId,
              title: itemData.instanceTitle,
            },
            holdings: [
              {
                holdingsTypeId: itemData.holdingTypeId,
                permanentLocationId: itemData.locationsId,
              },
            ],
            items: collectionOfItems,
          }).then((specialInstanceIds) => {
            itemData.testInstanceIds = specialInstanceIds;
          });
        });

      cy.createTempUser([Permissions.inventoryAll.gui]).then((userProperties) => {
        user = userProperties;

        cy.login(userProperties.username, userProperties.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
        InventorySearchAndFilter.searchByParameter('Title (all)', itemData.instanceTitle);
        InstanceRecordView.verifyInstanceRecordViewOpened();
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken().then(() => {
        cy.getInstance({
          limit: 1,
          expandAll: true,
          query: `"title"=="${itemData.instanceTitle}"`,
        }).then((instance) => {
          instance.items.forEach((el) => cy.deleteItemViaApi(el.id));
          cy.deleteHoldingRecordViaApi(instance.holdings[0].id);
          InventoryInstance.deleteInstanceViaApi(instance.id);
        });
        Users.deleteViaApi(user.userId);
      });
    });

    it(
      'C409420 Verify the sorting for Items on Instance details page (folijet)',
      { tags: ['criticalPath', 'folijet', 'C409420', 'shiftLeft'] },
      () => {
        InventoryInstance.openHoldingsAccordion(`${LOCATION_NAMES.MAIN_LIBRARY_UI} >`);
        InstanceRecordView.verifyQuantityOfItemsRelatedtoHoldings(
          `${LOCATION_NAMES.MAIN_LIBRARY_UI} >`,
          10,
        );

        [
          {
            title: 'Item: barcode',
            id: including('clickable-list-column-barcode'),
            columnIndex: 2,
          },
          {
            title: 'Status',
            id: 'status',
            columnIndex: 3,
          },
          {
            title: 'Copy number',
            id: 'copynumber',
            columnIndex: 4,
          },
        ].forEach((column) => {
          // Validate sort
          cy.do(MultiColumnListHeader(column.title).click());
          InstanceRecordView.verifySortingOrder({
            title: column.title,
            columnIndex: column.columnIndex,
          });

          // Validate reverse sorting
          cy.do(MultiColumnListHeader(column.title).click());
          InstanceRecordView.verifySortingOrder({
            title: column.title,
            columnIndex: column.columnIndex,
          });
        });

        [
          {
            title: 'Enumeration',
            id: 'enumeration',
            columnIndex: 7,
          },
          {
            title: 'Chronology',
            id: 'chronology',
            columnIndex: 8,
          },
          {
            title: 'Volume',
            id: 'chronology',
            columnIndex: 9,
          },
          {
            title: 'Year, caption',
            id: 'yearcaption',
            columnIndex: 10,
          },
        ].forEach((column) => {
          InstanceRecordView.scroll();

          // Validate sort
          cy.do(MultiColumnListHeader(column.title).click());
          cy.wait(1000);
          InstanceRecordView.scroll();
          InstanceRecordView.verifySortingOrder({
            title: column.title,
            columnIndex: column.columnIndex,
          });
          InstanceRecordView.scroll();

          // Validate reverse sorting
          cy.do(MultiColumnListHeader(column.title).click());
          cy.wait(1000);
          InstanceRecordView.scroll();
          InstanceRecordView.verifySortingOrder({
            title: column.title,
            columnIndex: column.columnIndex,
          });
          InstanceRecordView.scroll();
        });
      },
    );
  });
});
