import uuid from 'uuid';
import {
  ACCEPTED_DATA_TYPE_NAMES,
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  ACTION_NAMES_IN_ACTION_PROFILE,
  APPLICATION_NAMES,
  EXISTING_RECORD_NAMES,
  FOLIO_RECORD_TYPE,
  HOLDINGS_TYPE_NAMES,
  ITEM_STATUS_NAMES,
  JOB_STATUS_NAMES,
  LOCATION_NAMES,
  ORDER_STATUSES,
  RECORD_STATUSES,
  VENDOR_NAMES,
} from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import CheckInActions from '../../../support/fragments/check-in-actions/checkInActions';
import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import Logs from '../../../support/fragments/data_import/logs/logs';
import Helper from '../../../support/fragments/finance/financeHelper';
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventoryViewSource from '../../../support/fragments/inventory/inventoryViewSource';
import InventoryItems from '../../../support/fragments/inventory/item/inventoryItems';
import ItemRecordView from '../../../support/fragments/inventory/item/itemRecordView';
import BasicOrderLine from '../../../support/fragments/orders/basicOrderLine';
import NewOrder from '../../../support/fragments/orders/newOrder';
import OrderDetails from '../../../support/fragments/orders/orderDetails';
import OrderLines from '../../../support/fragments/orders/orderLines';
import Orders from '../../../support/fragments/orders/orders';
import Organizations from '../../../support/fragments/organizations/organizations';
import Receiving from '../../../support/fragments/receiving/receiving';
import {
  ActionProfiles as SettingsActionProfiles,
  FieldMappingProfiles as SettingsFieldMappingProfiles,
  JobProfiles as SettingsJobProfiles,
  MatchProfiles as SettingsMatchProfiles,
} from '../../../support/fragments/settings/dataImport';
import FieldMappingProfiles from '../../../support/fragments/settings/dataImport/fieldMappingProfile/fieldMappingProfiles';
import MatchProfiles from '../../../support/fragments/settings/dataImport/matchProfiles/matchProfiles';
import NewMatchProfile from '../../../support/fragments/settings/dataImport/matchProfiles/newMatchProfile';
import SettingsDataImport, {
  SETTINGS_TABS,
} from '../../../support/fragments/settings/dataImport/settingsDataImport';
import NewLocation from '../../../support/fragments/settings/tenant/locations/newLocation';
import ServicePoints from '../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import UserEdit from '../../../support/fragments/users/userEdit';
import Users from '../../../support/fragments/users/users';
import { getLongDelay } from '../../../support/utils/cypressTools';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('End to end scenarios', () => {
    let firstOrderNumber;
    let secondOrderNumber;
    let vendorId;
    let location;
    let acquisitionMethodId;
    let productIdTypeId;
    let materialTypeId;
    let user = {};
    let servicePointId;
    const uniqueFirstInstanceTitle = `${getRandomPostfix()}Agrarianism and capitalism in early Georgia, 1732-1743 /`;
    const uniqueSecondInstanceTitle = `${getRandomPostfix()}Evolution of the Earth /`;
    const firstItem = {
      title: `${uniqueFirstInstanceTitle} Jay Jordan Butler.`,
      productId: '9782266111560',
      quantity: '1',
      price: '20',
      barcode: uuid(),
    };
    const secondItem = {
      title: `${uniqueSecondInstanceTitle} Donald R. Prothero, Robert H. Dott, Jr.`,
      productId: '9783161484100',
      quantity: '1',
      price: '20',
    };
    const editedMarcFileName = `C350590 marcFileForMatchOnPol${getRandomPostfix()}.mrc`;
    const collectionOfProfiles = [
      {
        mappingProfile: {
          typeValue: FOLIO_RECORD_TYPE.INSTANCE,
          name: `C350590 Update Instance by POL match ${getRandomPostfix()}`,
          update: true,
        },
        actionProfile: {
          typeValue: FOLIO_RECORD_TYPE.INSTANCE,
          name: `C350590 Update Instance by POL match ${getRandomPostfix()}`,
          action: ACTION_NAMES_IN_ACTION_PROFILE.UPDATE,
        },
      },
      {
        mappingProfile: {
          typeValue: FOLIO_RECORD_TYPE.HOLDINGS,
          name: `C350590 Update Holdings by POL match ${getRandomPostfix()}`,
          update: true,
        },
        actionProfile: {
          typeValue: FOLIO_RECORD_TYPE.HOLDINGS,
          name: `C350590 Update Holdings by POL match ${getRandomPostfix()}`,
          action: ACTION_NAMES_IN_ACTION_PROFILE.UPDATE,
        },
      },
      {
        mappingProfile: {
          typeValue: FOLIO_RECORD_TYPE.ITEM,
          name: `C350590 Update Item by POL match ${getRandomPostfix()}`,
          update: true,
        },
        actionProfile: {
          typeValue: FOLIO_RECORD_TYPE.ITEM,
          name: `C350590 Update Item by POL match ${getRandomPostfix()}`,
          action: ACTION_NAMES_IN_ACTION_PROFILE.UPDATE,
        },
      },
    ];

    const collectionOfMatchProfiles = [
      {
        matchProfile: {
          profileName: `C350590 935 $a POL to Instance POL ${getRandomPostfix()}`,
          incomingRecordFields: {
            field: '935',
            subfield: 'a',
          },
          matchCriterion: 'Exactly matches',
          existingRecordType: EXISTING_RECORD_NAMES.INSTANCE,
          instanceOption: NewMatchProfile.optionsList.pol,
        },
      },
      {
        matchProfile: {
          profileName: `C350590 935 $a POL to Holdings POL ${getRandomPostfix()}`,
          incomingRecordFields: {
            field: '935',
            subfield: 'a',
          },
          matchCriterion: 'Exactly matches',
          existingRecordType: EXISTING_RECORD_NAMES.HOLDINGS,
          holdingsOption: NewMatchProfile.optionsList.pol,
        },
      },
      {
        matchProfile: {
          profileName: `C350590 935 $a POL to Item POL ${getRandomPostfix()}`,
          incomingRecordFields: {
            field: '935',
            subfield: 'a',
          },
          matchCriterion: 'Exactly matches',
          existingRecordType: EXISTING_RECORD_NAMES.ITEM,
          itemOption: NewMatchProfile.optionsList.pol,
        },
      },
    ];

    const specialJobProfile = {
      ...NewJobProfile.defaultJobProfile,
      profileName: `C350590 autotestJobProf${getRandomPostfix()}`,
      acceptedType: ACCEPTED_DATA_TYPE_NAMES.MARC,
    };

    before('create test data', () => {
      cy.createTempUser([
        Permissions.uiOrdersCreate.gui,
        Permissions.uiOrdersView.gui,
        Permissions.uiOrdersEdit.gui,
        Permissions.uiInventoryViewCreateEditHoldings.gui,
        Permissions.uiInventoryViewCreateEditInstances.gui,
        Permissions.uiInventoryViewCreateEditItems.gui,
        Permissions.settingsDataImportEnabled.gui,
        Permissions.moduleDataImportEnabled.gui,
        Permissions.uiReceivingViewEditCreate.gui,
        Permissions.uiInventoryViewInstances.gui,
        Permissions.uiQuickMarcQuickMarcBibliographicEditorView.gui,
        Permissions.remoteStorageView.gui,
      ])
        .then((userProperties) => {
          user = userProperties;
        })
        .then(() => {
          cy.getAdminToken()
            .then(() => {
              Organizations.getOrganizationViaApi({ query: `name="${VENDOR_NAMES.GOBI}"` }).then(
                (organization) => {
                  vendorId = organization.id;
                },
              );
              cy.getBookMaterialType().then((materialType) => {
                materialTypeId = materialType.id;
              });
              cy.getAcquisitionMethodsApi({
                query: `value="${ACQUISITION_METHOD_NAMES_IN_PROFILE.PURCHASE_AT_VENDOR_SYSTEM}"`,
              }).then((params) => {
                acquisitionMethodId = params.body.acquisitionMethods[0].id;
              });
              cy.getProductIdTypes({ query: 'name=="ISBN"' }).then((productIdType) => {
                productIdTypeId = productIdType.id;
              });
              ServicePoints.getViaApi().then((servicePoint) => {
                servicePointId = servicePoint[0].id;

                UserEdit.addServicePointViaApi(servicePointId, user.userId, servicePointId);
                NewLocation.createViaApi(NewLocation.getDefaultLocation(servicePointId)).then(
                  (res) => {
                    location = res;
                  },
                );
              });
            })
            .then(() => {
              cy.login(user.username, user.password, {
                path: TopMenu.ordersPath,
                waiter: Orders.waitLoading,
              });
            });
        });
    });

    after('delete test data', () => {
      cy.getAdminToken().then(() => {
        const itemBarcode = Helper.getRandomBarcode();

        // delete created files
        FileManager.deleteFile(`cypress/fixtures/${editedMarcFileName}`);
        InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(firstItem.barcode);
        cy.getInstance({ limit: 1, expandAll: true, query: `"title"=="${secondItem.title}"` }).then(
          (instance) => {
            const itemId = instance.items[0].id;

            cy.getItems({ query: `"id"=="${itemId}"` }).then((item) => {
              item.barcode = itemBarcode;
              InventoryItems.editItemViaApi(item).then(() => {
                CheckInActions.checkinItemViaApi({
                  itemBarcode: item.barcode,
                  servicePointId,
                  checkInDate: new Date().toISOString(),
                }).then(() => {
                  cy.deleteItemViaApi(itemId);
                  cy.deleteHoldingRecordViaApi(instance.holdings[0].id);
                  InventoryInstance.deleteInstanceViaApi(instance.id);
                });
              });
            });
          },
        );
        Orders.getOrdersApi({ limit: 1, query: `"poNumber"=="${firstOrderNumber}"` }).then(
          (order) => {
            Orders.deleteOrderViaApi(order[0].id);
          },
        );
        Orders.getOrdersApi({ limit: 1, query: `"poNumber"=="${secondOrderNumber}"` }).then(
          (order) => {
            Orders.deleteOrderViaApi(order[0].id);
          },
        );
        Users.deleteViaApi(user.userId);
        // delete generated profiles
        SettingsJobProfiles.deleteJobProfileByNameViaApi(specialJobProfile.profileName);
        collectionOfMatchProfiles.forEach((profile) => {
          SettingsMatchProfiles.deleteMatchProfileByNameViaApi(profile.matchProfile.profileName);
        });
        collectionOfProfiles.forEach((profile) => {
          SettingsActionProfiles.deleteActionProfileByNameViaApi(profile.actionProfile.name);
          SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(
            profile.mappingProfile.name,
          );
        });
        NewLocation.deleteInstitutionCampusLibraryLocationViaApi(
          location.institutionId,
          location.campusId,
          location.libraryId,
          location.id,
        );
      });
    });

    const openOrder = (number) => {
      Orders.clearSearchField();
      cy.intercept('/organizations/organizations*').as('getOrganizations');
      cy.wait(2000);
      Orders.searchByParameter('PO number', number);
      cy.wait('@getOrganizations', getLongDelay()).then(() => {
        cy.wait(2000);
        Orders.selectFromResultsList(number);
      });
      OrderDetails.openOrder();
    };

    const checkReceivedPiece = (number, title) => {
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.ORDERS);
      Orders.waitLoading();
      Orders.resetFiltersIfActive();
      Orders.clearSearchField();
      cy.wait(1500);
      Orders.searchByParameter('PO number', number);
      cy.wait(5000);
      Orders.selectFromResultsList(number);
      OrderDetails.waitLoading();
      OrderDetails.openPolDetails(title);
      OrderLines.openReceiving();
      Receiving.checkIsPiecesCreated(title);
    };

    it(
      'C350590 Match on POL and update related Instance, Holdings, Item (folijet)',
      { tags: ['smoke', 'folijet', 'C350590'] },
      () => {
        // create the first PO with POL
        Orders.createOrderWithOrderLineViaApi(
          NewOrder.getDefaultOrder({ vendorId }),
          BasicOrderLine.getDefaultOrderLine({
            quantity: firstItem.quantity,
            title: firstItem.title,
            specialLocationId: location.id,
            specialMaterialTypeId: materialTypeId,
            acquisitionMethod: acquisitionMethodId,
            listUnitPrice: firstItem.price,
            poLineEstimatedPrice: firstItem.price,
            productIds: [
              {
                productId: firstItem.productId,
                productIdType: productIdTypeId,
              },
            ],
          }),
        ).then((firstOrder) => {
          firstOrderNumber = firstOrder.poNumber;

          // open the first PO with POL
          openOrder(firstOrderNumber);
          Orders.selectStatusInSearch(ORDER_STATUSES.OPEN);
          OrderDetails.checkOrderStatus(ORDER_STATUSES.OPEN);
          OrderDetails.checkIsItemsInInventoryCreated(firstItem.title, location.name);
          // check receiving pieces are created
          checkReceivedPiece(firstOrderNumber, firstItem.title);

          // create second PO with POL
          Orders.createOrderWithOrderLineViaApi(
            NewOrder.getDefaultOrder({ vendorId }),
            BasicOrderLine.getDefaultOrderLine({
              quantity: secondItem.quantity,
              title: secondItem.title,
              specialLocationId: location.id,
              specialMaterialTypeId: materialTypeId,
              acquisitionMethod: acquisitionMethodId,
              listUnitPrice: secondItem.price,
              poLineEstimatedPrice: secondItem.price,
              productIds: [
                {
                  productId: secondItem.productId,
                  productIdType: productIdTypeId,
                },
              ],
            }),
          ).then((secondOrder) => {
            secondOrderNumber = secondOrder.poNumber;

            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.ORDERS);
            Orders.resetFilters();
            Orders.selectStatusInSearch(ORDER_STATUSES.OPEN);
            Orders.checkIsOrderCreated(secondOrderNumber);
            // open the second PO
            openOrder(secondOrderNumber);
            Orders.selectStatusInSearch(ORDER_STATUSES.OPEN);
            OrderDetails.checkOrderStatus(ORDER_STATUSES.OPEN);
            OrderDetails.checkIsItemsInInventoryCreated(secondItem.title, location.name);
            // check receiving pieces are created
            checkReceivedPiece(secondOrderNumber, secondItem.title);
          });

          DataImport.editMarcFile(
            'marcFileForC350590.mrc',
            editedMarcFileName,
            [
              'Agrarianism and capitalism in early Georgia, 1732-1743 /',
              'Evolution of the Earth /',
              'test',
              '242451241247',
            ],
            [
              uniqueFirstInstanceTitle,
              uniqueSecondInstanceTitle,
              firstOrderNumber,
              firstItem.barcode,
            ],
          );
        });

        // create mapping and action profiles
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS, APPLICATION_NAMES.DATA_IMPORT);
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.FIELD_MAPPING_PROFILES);
        collectionOfProfiles.forEach((profile) => {
          FieldMappingProfiles.createMappingProfileForMatch(profile.mappingProfile);
          FieldMappingProfiles.checkMappingProfilePresented(profile.mappingProfile.name);
          cy.wait(3000);
        });
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.ACTION_PROFILES);
        collectionOfProfiles.forEach((profile) => {
          SettingsActionProfiles.create(profile.actionProfile, profile.mappingProfile.name);
          SettingsActionProfiles.checkActionProfilePresented(profile.actionProfile.name);
          cy.wait(3000);
        });

        // create match profiles
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.MATCH_PROFILES);
        collectionOfMatchProfiles.forEach((profile) => {
          MatchProfiles.createMatchProfile(profile.matchProfile);
          MatchProfiles.checkMatchProfilePresented(profile.matchProfile.profileName);
          cy.wait(3000);
        });

        // create job profile
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.JOB_PROFILES);
        JobProfiles.createJobProfileWithLinkingProfilesForUpdate(specialJobProfile);
        NewJobProfile.linkMatchAndActionProfiles(
          collectionOfMatchProfiles[0].matchProfile.profileName,
          collectionOfProfiles[0].actionProfile.name,
        );
        NewJobProfile.linkMatchAndActionProfiles(
          collectionOfMatchProfiles[1].matchProfile.profileName,
          collectionOfProfiles[1].actionProfile.name,
          2,
        );
        NewJobProfile.linkMatchAndActionProfiles(
          collectionOfMatchProfiles[2].matchProfile.profileName,
          collectionOfProfiles[2].actionProfile.name,
          4,
        );
        NewJobProfile.saveAndClose();

        // upload .mrc file
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_IMPORT);
        DataImport.verifyUploadState();
        DataImport.checkIsLandingPageOpened();
        DataImport.uploadFile(editedMarcFileName);
        JobProfiles.waitFileIsUploaded();
        JobProfiles.search(specialJobProfile.profileName);
        JobProfiles.runImportFile();
        Logs.waitFileIsImported(editedMarcFileName);
        Logs.checkJobStatus(editedMarcFileName, JOB_STATUS_NAMES.COMPLETED);
        Logs.openFileDetails(editedMarcFileName);
        FileDetails.checkSrsRecordQuantityInSummaryTable('1');
        FileDetails.checkInstanceQuantityInSummaryTable('1', 1);
        FileDetails.checkHoldingsQuantityInSummaryTable('1', 1);
        FileDetails.checkItemQuantityInSummaryTable('1', 1);
        FileDetails.checkItemsStatusesInResultList(0, [
          RECORD_STATUSES.CREATED,
          RECORD_STATUSES.UPDATED,
          RECORD_STATUSES.UPDATED,
          RECORD_STATUSES.UPDATED,
        ]);
        FileDetails.checkItemsStatusesInResultList(1, [
          RECORD_STATUSES.NO_ACTION,
          RECORD_STATUSES.NO_ACTION,
          RECORD_STATUSES.NO_ACTION,
          RECORD_STATUSES.NO_ACTION,
        ]);

        // check is items updated
        FileDetails.openInstanceInInventory(RECORD_STATUSES.UPDATED);
        InventoryInstance.checkIsInstanceUpdated();
        InventoryInstance.openHoldingView();
        HoldingsRecordView.checkHoldingsType(HOLDINGS_TYPE_NAMES.MONOGRAPH);
        HoldingsRecordView.checkCallNumberType('Library of Congress classification');
        HoldingsRecordView.checkPermanentLocation(LOCATION_NAMES.MAIN_LIBRARY_UI);
        HoldingsRecordView.close();
        InventoryInstance.openHoldingsAccordion(LOCATION_NAMES.MAIN_LIBRARY_UI);
        InventoryInstance.openItemByBarcode(firstItem.barcode);
        ItemRecordView.verifyItemStatus(ITEM_STATUS_NAMES.IN_PROCESS);
        ItemRecordView.verifyEffectiveLocation(LOCATION_NAMES.MAIN_LIBRARY_UI);
        ItemRecordView.closeDetailView();
        InventoryInstance.viewSource();
        InventoryViewSource.verifyBarcodeInMARCBibSource(firstItem.barcode);
      },
    );
  });
});
