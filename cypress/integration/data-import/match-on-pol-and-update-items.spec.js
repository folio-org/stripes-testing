import getRandomPostfix from '../../support/utils/stringTools';
import permissions from '../../support/dictionary/permissions';
import TestTypes from '../../support/dictionary/testTypes';
import TopMenu from '../../support/fragments/topMenu';
import NewOrder from '../../support/fragments/orders/newOrder';
import Orders from '../../support/fragments/orders/orders';
import Helper from '../../support/fragments/finance/financeHelper';
import FieldMappingProfiles from '../../support/fragments/data_import/mapping_profiles/fieldMappingProfiles';
import NewActionProfile from '../../support/fragments/data_import/action_profiles/newActionProfile';
import NewMappingProfile from '../../support/fragments/data_import/mapping_profiles/newMappingProfile';
import ActionProfiles from '../../support/fragments/data_import/action_profiles/actionProfiles';
import NewJobProfile from '../../support/fragments/data_import/job_profiles/newJobProfile';
import SettingsMenu from '../../support/fragments/settingsMenu';
import Users from '../../support/fragments/users/users';
import MatchProfiles from '../../support/fragments/data_import/match_profiles/matchProfiles';
import JobProfiles from '../../support/fragments/data_import/job_profiles/jobProfiles';
import DataImport from '../../support/fragments/data_import/dataImport';
import Logs from '../../support/fragments/data_import/logs/logs';
import ItemRecordView from '../../support/fragments/inventory/itemRecordView';
import CheckInActions from '../../support/fragments/check-in-actions/checkInActions';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import OrderView from '../../support/fragments/orders/orderView';
import BasicOrderLine from '../../support/fragments/orders/basicOrderLine';
import Receiving from '../../support/fragments/receiving/receiving';
import FileDetails from '../../support/fragments/data_import/logs/fileDetails';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import HoldingsRecordView from '../../support/fragments/inventory/holdingsRecordView';
import ItemVeiw from '../../support/fragments/inventory/inventoryItem/itemVeiw';
import InventoryViewSource from '../../support/fragments/inventory/inventoryViewSource';
import NewMatchProfile from '../../support/fragments/data_import/match_profiles/newMatchProfile';
import Organizations from '../../support/fragments/organizations/organizations';
import DevTeams from '../../support/dictionary/devTeams';
import OrderLines from '../../support/fragments/orders/orderLines';
import NewLocation from '../../support/fragments/settings/tenant/locations/newLocation';
import FileManager from '../../support/utils/fileManager';

describe('ui-data-import: Match on POL and update related Instance, Holdings, Item', () => {
  const firstItem = {
    title: 'Sport and sociology. Dominic Malcolm.',
    productId: '9782266111560',
    quantity: '1',
    price: '20',
    barcode: '242451241241'
  };

  const secondItem = {
    title: 'South Asian texts in history : critical engagements with Sheldon Pollock. edited by Yigal Bronner, Whitney Cox, and Lawrence McCrea.',
    productId: '9783161484100',
    quantity: '1',
    price: '20'
  };

  const titles = [firstItem.title, secondItem.title];
  let firstOrderNumber;
  let secondOrderNumber;
  let vendorId;
  let location;
  let acquisitionMethodId;
  let productIdTypeId;
  let materialTypeId;
  let user = {};
  let servicePointId;

  // unique profile names
  const jobProfileName = `C350590 autotestJobProf${getRandomPostfix()}`;
  const matchProfileNameForInstance = `C350590 935 $a POL to Instance POL ${Helper.getRandomBarcode()}`;
  const matchProfileNameForHoldings = `C350590 935 $a POL to Holdings POL ${Helper.getRandomBarcode()}`;
  const matchProfileNameForItem = `C350590 935 $a POL to Item POL ${Helper.getRandomBarcode()}`;
  const actionProfileNameForInstance = `C350590 Update Instance by POL match ${Helper.getRandomBarcode()}`;
  const actionProfileNameForHoldings = `C350590 Update Holdings by POL match ${Helper.getRandomBarcode()}`;
  const actionProfileNameForItem = `C350590 Update Item by POL match ${Helper.getRandomBarcode()}`;
  const mappingProfileNameForInstance = `C350590 Update Instance by POL match ${Helper.getRandomBarcode()}`;
  const mappingProfileNameForHoldings = `C350590 Update Holdings by POL match ${Helper.getRandomBarcode()}`;
  const mappingProfileNameForItem = `C350590 Update Item by POL match ${getRandomPostfix()}`;

  const editedMarcFileName = `C350590 marcFileForMatchOnPol.${getRandomPostfix()}.mrc`;

  const collectionOfProfiles = [
    {
      mappingProfile: { typeValue: NewMappingProfile.folioRecordTypeValue.instance,
        name: mappingProfileNameForInstance,
        update: true },
      actionProfile: { typeValue: NewActionProfile.folioRecordTypeValue.instance,
        name: actionProfileNameForInstance,
        action: 'Update (all record types except Orders, Invoices, or MARC Holdings)' }
    },
    {
      mappingProfile: { typeValue: NewMappingProfile.folioRecordTypeValue.holdings,
        name: mappingProfileNameForHoldings,
        update: true },
      actionProfile: { typeValue: NewActionProfile.folioRecordTypeValue.holdings,
        name: actionProfileNameForHoldings,
        action: 'Update (all record types except Orders, Invoices, or MARC Holdings)' }
    },
    {
      mappingProfile: { typeValue: NewMappingProfile.folioRecordTypeValue.item,
        name: mappingProfileNameForItem,
        update: true },
      actionProfile: { typeValue: NewActionProfile.folioRecordTypeValue.item,
        name: actionProfileNameForItem,
        action: 'Update (all record types except Orders, Invoices, or MARC Holdings)' }
    }
  ];

  const collectionOfMatchProfiles = [
    {
      matchProfile: { profileName: matchProfileNameForInstance,
        incomingRecordFields: {
          field: '935',
          subfield:'a'
        },
        matchCriterion: 'Exactly matches',
        existingRecordType: 'INSTANCE',
        instanceOption: NewMatchProfile.optionsList.pol }
    },
    {
      matchProfile: { profileName: matchProfileNameForHoldings,
        incomingRecordFields: {
          field: '935',
          subfield: 'a'
        },
        matchCriterion: 'Exactly matches',
        existingRecordType: 'HOLDINGS',
        holdingsOption: NewMatchProfile.optionsList.pol }
    },
    {
      matchProfile: {
        profileName: matchProfileNameForItem,
        incomingRecordFields: {
          field: '935',
          subfield: 'a'
        },
        matchCriterion: 'Exactly matches',
        existingRecordType: 'ITEM',
        itemOption: NewMatchProfile.optionsList.pol
      }
    }
  ];

  const specialJobProfile = { ...NewJobProfile.defaultJobProfile,
    profileName: jobProfileName,
    acceptedType: NewJobProfile.acceptedDataType.marc };

  before(() => {
    cy.createTempUser([
      permissions.uiOrdersCreate.gui,
      permissions.uiOrdersView.gui,
      permissions.uiOrdersEdit.gui,
      permissions.uiInventoryViewCreateEditHoldings.gui,
      permissions.uiInventoryViewCreateEditInstances.gui,
      permissions.uiInventoryViewCreateEditItems,
      permissions.settingsDataImportEnabled.gui,
      permissions.moduleDataImportEnabled.gui,
      permissions.uiReceivingViewEditCreate.gui,
      permissions.uiInventoryViewInstances.gui,
      permissions.uiQuickMarcQuickMarcBibliographicEditorView.gui
    ])
      .then(userProperties => {
        user = userProperties;
      })
      .then(() => {
        cy.getAdminToken()
          .then(() => {
            Organizations.getOrganizationViaApi({ query: 'name="GOBI Library Solutions"' })
              .then(organization => {
                vendorId = organization.id;
              });
            cy.getMaterialTypes({ query: 'name="book"' })
              .then(materialType => {
                materialTypeId = materialType.id;
              });
            cy.getAcquisitionMethodsApi({ query: 'value="Purchase at vendor system"' })
              .then(params => {
                acquisitionMethodId = params.body.acquisitionMethods[0].id;
              });
            cy.getProductIdTypes({ query: 'name=="ISBN"' })
              .then(productIdType => {
                productIdTypeId = productIdType.id;
              });
            ServicePoints.getViaApi()
              .then((servicePoint) => {
                servicePointId = servicePoint[0].id;
                NewLocation.createViaApi(NewLocation.getDefaultLocation(servicePointId))
                  .then(res => {
                    location = res;
                  });
              });
          })
          .then(() => {
            cy.login(user.username, user.password, { path: TopMenu.ordersPath, waiter: Orders.waitLoading });
          });
      });
  });

  after(() => {
    let itemId;
    const itemBarcode = Helper.getRandomBarcode();

    titles.forEach(title => {
      cy.getInstance({ limit: 1, expandAll: true, query: `"title"=="${title}"` })
        .then((instance) => {
          itemId = instance.items[0].id;

          cy.getItems({ query: `"id"=="${itemId}"` })
            .then((item) => {
              item.barcode = itemBarcode;
              cy.wrap(ItemRecordView.editItem(item))
                .then(() => {
                  CheckInActions.checkinItemViaApi({
                    itemBarcode: item.barcode,
                    servicePointId,
                    checkInDate: new Date().toISOString(),
                  })
                    .then(() => {
                      cy.deleteItem(itemId);
                      cy.deleteHoldingRecordViaApi(instance.holdings[0].id);
                      InventoryInstance.deleteInstanceViaApi(instance.id);
                    });
                });
            });
        });
    });
    Orders.getOrdersApi({ limit: 1, query: `"poNumber"=="${firstOrderNumber}"` })
      .then(order => {
        Orders.deleteOrderApi(order[0].id);
      });
    Orders.getOrdersApi({ limit: 1, query: `"poNumber"=="${secondOrderNumber}"` })
      .then(order => {
        Orders.deleteOrderApi(order[0].id);
      });
    Users.deleteViaApi(user.userId);
    // delete generated profiles
    JobProfiles.deleteJobProfile(jobProfileName);
    collectionOfMatchProfiles.forEach(profile => {
      MatchProfiles.deleteMatchProfile(profile.matchProfile.profileName);
    });
    collectionOfProfiles.forEach(profile => {
      ActionProfiles.deleteActionProfile(profile.actionProfile.name);
      FieldMappingProfiles.deleteFieldMappingProfile(profile.mappingProfile.name);
    });
    NewLocation.deleteViaApiIncludingInstitutionCampusLibrary(
      location.institutionId,
      location.campusId,
      location.libraryId,
      location.id
    );
    // delete created files
    FileManager.deleteFile(`cypress/fixtures/${editedMarcFileName}`);
  });

  const openOrder = (number) => {
    Orders.searchByParameter('PO number', number);
    Helper.selectFromResultsList();
    Orders.openOrder();
  };

  const checkReceivedPiece = (number, title) => {
    cy.visit(TopMenu.ordersPath);
    Orders.resetFilters();
    Orders.searchByParameter('PO number', number);
    Orders.selectFromResultsList();
    OrderView.openPolDetails(title);
    OrderLines.openReceiving();
    Receiving.checkIsPiecesCreated(title);
  };

  it('C350590 Match on POL and update related Instance, Holdings, Item (folijet)', { tags: [TestTypes.smoke, DevTeams.folijet] }, () => {
    // create the first PO with POL
    Orders.createOrderWithOrderLineViaApi(NewOrder.getDefaultOrder(vendorId),
      BasicOrderLine.getDefaultOrderLine(
        firstItem.quantity,
        firstItem.title,
        location.id,
        acquisitionMethodId,
        firstItem.price,
        firstItem.price,
        [{
          productId: firstItem.productId,
          productIdType: productIdTypeId
        }],
        materialTypeId
      ))
      .then(res => {
        firstOrderNumber = res;

        Orders.checkIsOrderCreated(firstOrderNumber);
        // open the first PO with POL
        openOrder(firstOrderNumber);
        OrderView.checkIsOrderOpened('Open');
        OrderView.checkIsItemsInInventoryCreated(firstItem.title, location.name);
        // check receiving pieces are created
        checkReceivedPiece(firstOrderNumber, firstItem.title);

        // create second PO with POL
        Orders.createOrderWithOrderLineViaApi(NewOrder.getDefaultOrder(vendorId),
          BasicOrderLine.getDefaultOrderLine(
            secondItem.quantity,
            secondItem.title,
            location.id,
            acquisitionMethodId,
            secondItem.price,
            secondItem.price,
            [{
              productId: secondItem.productId,
              productIdType: productIdTypeId
            }],
            materialTypeId
          ))
          .then(respo => {
            secondOrderNumber = respo;

            cy.visit(TopMenu.ordersPath);
            Orders.resetFilters();
            Orders.checkIsOrderCreated(secondOrderNumber);
            // open the second PO
            openOrder(secondOrderNumber);
            OrderView.checkIsOrderOpened('Open');
            OrderView.checkIsItemsInInventoryCreated(secondItem.title, location.name);
            // check receiving pieces are created
            checkReceivedPiece(secondOrderNumber, secondItem.title);
          });

        DataImport.editMarcFile('marcFileForMatchOnPol.mrc', editedMarcFileName, 'test', firstOrderNumber);
      });

    // create mapping and action profiles
    collectionOfProfiles.forEach(profile => {
      cy.visit(SettingsMenu.mappingProfilePath);
      FieldMappingProfiles.createMappingProfileForMatch(profile.mappingProfile);
      FieldMappingProfiles.checkMappingProfilePresented(profile.mappingProfile.name);
      cy.visit(SettingsMenu.actionProfilePath);
      ActionProfiles.createActionProfile(profile.actionProfile, profile.mappingProfile.name);
      ActionProfiles.checkActionProfilePresented(profile.actionProfile.name);
    });

    // create match profiles
    cy.visit(SettingsMenu.matchProfilePath);
    collectionOfMatchProfiles.forEach(profile => {
      MatchProfiles.createMatchProfile(profile.matchProfile);
      MatchProfiles.checkMatchProfilePresented(profile.matchProfile.profileName);
    });

    // create job profile
    cy.visit(SettingsMenu.jobProfilePath);
    JobProfiles.createJobProfileWithLinkingProfilesForUpdate(specialJobProfile);
    NewJobProfile.linkMatchAndActionProfilesForInstance(actionProfileNameForInstance, matchProfileNameForInstance, 0);
    NewJobProfile.linkMatchAndActionProfilesForHoldings(actionProfileNameForHoldings, matchProfileNameForHoldings, 2);
    NewJobProfile.linkMatchAndActionProfilesForItem(actionProfileNameForItem, matchProfileNameForItem, 4);
    NewJobProfile.saveAndClose();

    // upload .mrc file
    cy.visit(TopMenu.dataImportPath);
    DataImport.checkIsLandingPageOpened();
    DataImport.uploadFile(editedMarcFileName);
    JobProfiles.searchJobProfileForImport(jobProfileName);
    JobProfiles.runImportFile(editedMarcFileName);
    Logs.checkStatusOfJobProfile();
    Logs.openFileDetails(editedMarcFileName);
    FileDetails.checkItemsStatusesInResultList(0, [FileDetails.status.created, FileDetails.status.updated, FileDetails.status.updated, FileDetails.status.updated]);
    FileDetails.checkItemsStatusesInResultList(1, [FileDetails.status.dash, FileDetails.status.discarded, FileDetails.status.discarded, FileDetails.status.discarded]);

    // check is items updated
    FileDetails.openItemsInInventory(3);
    InventoryInstance.checkIsInstanceUpdated();
    InventoryInstance.openHoldingView();
    HoldingsRecordView.checkHoldingsType('Monograph');
    HoldingsRecordView.checkCallNumberType('Library of Congress classification');
    HoldingsRecordView.checkPermanentLocation('Main Library');
    HoldingsRecordView.close();
    InventoryInstance.openHoldingsAccordion('Main Library');
    InventoryInstance.openItemView(firstItem.barcode);
    ItemVeiw.verifyItemStatus('In process');
    ItemVeiw.checkEffectiveLocation('Main Library');
    ItemVeiw.closeDetailView();
    InventoryViewSource.verifyBarcodeInMARCBibSource(firstItem.barcode);
  });
});
